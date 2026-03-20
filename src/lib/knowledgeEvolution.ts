import connectDB from './mongodb';
import KnowledgeEvolution, { type IKnowledgeEvolution, type KnowledgeDiff } from '@/models/KnowledgeEvolution';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import Client from '@/models/Client';
import { crawlWebsite } from './crawler';

// ── Cosine similarity between two embeddings ──
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

// ── Simple text-based similarity (Jaccard on word tokens) ──
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }
  return intersection / (wordsA.size + wordsB.size - intersection);
}

// ── Generate simple embedding from text (for comparison, not production-quality) ──
function simpleEmbed(text: string): number[] {
  // Hash-based dimensionality reduction to 128-dim vector
  const dim = 128;
  const vec = new Float64Array(dim);
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = (hash * 31 + word.charCodeAt(i)) & 0x7fffffff;
    }
    const idx = hash % dim;
    vec[idx] += 1;
  }
  // Normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) vec[i] /= norm;
  }
  return Array.from(vec);
}

// ── Main evolution function ──
export async function evolveKnowledge(
  clientId: string,
  crawlUrl: string,
  autoApply: boolean = true
): Promise<IKnowledgeEvolution> {
  await connectDB();

  // Create evolution record
  const evolution = await KnowledgeEvolution.create({
    clientId,
    crawlUrl,
    status: 'crawling',
    startedAt: new Date(),
  });

  try {
    // Step 1: Re-crawl the website
    evolution.status = 'crawling';
    await evolution.save();

    const crawlResult = await crawlWebsite(crawlUrl, {
      maxPages: 50,
      maxTotalChars: 500000,
      totalTimeoutMs: 120000,
    });

    evolution.pagesScanned = crawlResult.totalPages;

    // Step 2: Get existing knowledge chunks
    evolution.status = 'diffing';
    await evolution.save();

    const existingChunks = await KnowledgeChunk.find({ clientId });

    // Build new chunks from crawl results
    const newChunkTexts = crawlResult.pages
      .filter((p) => p.text && p.text.length > 50)
      .map((p) => ({
        text: p.text.slice(0, 2000),
        source: p.url,
        title: p.title || p.url,
      }));

    // Step 3: Diff — compare old chunks with new content
    const diffs: KnowledgeDiff[] = [];
    const matchedOldIds = new Set<string>();
    const matchedNewIdxs = new Set<number>();

    // Find modified or matching chunks
    for (const oldChunk of existingChunks) {
      let bestMatch = -1;
      let bestSim = 0;

      for (let i = 0; i < newChunkTexts.length; i++) {
        if (matchedNewIdxs.has(i)) continue;
        const sim = textSimilarity(oldChunk.text, newChunkTexts[i].text);
        if (sim > bestSim) {
          bestSim = sim;
          bestMatch = i;
        }
      }

      if (bestMatch >= 0 && bestSim > 0.3) {
        matchedOldIds.add(oldChunk._id.toString());
        matchedNewIdxs.add(bestMatch);

        if (bestSim < 0.95) {
          // Content has been modified
          diffs.push({
            type: 'modified',
            chunkTitle: newChunkTexts[bestMatch].title,
            oldContent: oldChunk.text.slice(0, 500),
            newContent: newChunkTexts[bestMatch].text.slice(0, 500),
            similarity: Math.round(bestSim * 100) / 100,
          });
        }
        // else: nearly identical, no diff needed
      }
    }

    // Find removed chunks (old chunks with no match)
    for (const oldChunk of existingChunks) {
      if (!matchedOldIds.has(oldChunk._id.toString())) {
        diffs.push({
          type: 'removed',
          chunkTitle: oldChunk.source || 'Unknown',
          oldContent: oldChunk.text.slice(0, 500),
        });
      }
    }

    // Find added chunks (new content with no match)
    for (let i = 0; i < newChunkTexts.length; i++) {
      if (!matchedNewIdxs.has(i)) {
        diffs.push({
          type: 'added',
          chunkTitle: newChunkTexts[i].title,
          newContent: newChunkTexts[i].text.slice(0, 500),
        });
      }
    }

    evolution.diffs = diffs;
    evolution.addedChunks = diffs.filter((d) => d.type === 'added').length;
    evolution.removedChunks = diffs.filter((d) => d.type === 'removed').length;
    evolution.modifiedChunks = diffs.filter((d) => d.type === 'modified').length;

    // Step 4: Auto-apply if configured
    if (autoApply && diffs.length > 0) {
      evolution.status = 'applying';
      await evolution.save();

      // Remove old chunks that are gone
      for (const oldChunk of existingChunks) {
        if (!matchedOldIds.has(oldChunk._id.toString())) {
          await KnowledgeChunk.deleteOne({ _id: oldChunk._id });
        }
      }

      // Update modified chunks
      for (const oldChunk of existingChunks) {
        if (matchedOldIds.has(oldChunk._id.toString())) {
          // Find the matching new chunk
          const diff = diffs.find((d) => d.type === 'modified' && d.oldContent === oldChunk.text.slice(0, 500));
          if (diff && diff.newContent) {
            const fullNewText = newChunkTexts.find((n) => n.text.slice(0, 500) === diff.newContent);
            if (fullNewText) {
              oldChunk.text = fullNewText.text;
              oldChunk.embedding = simpleEmbed(fullNewText.text);
              oldChunk.source = fullNewText.source;
              await oldChunk.save();
            }
          }
        }
      }

      // Add new chunks
      for (let i = 0; i < newChunkTexts.length; i++) {
        if (!matchedNewIdxs.has(i)) {
          await KnowledgeChunk.create({
            clientId,
            text: newChunkTexts[i].text,
            embedding: simpleEmbed(newChunkTexts[i].text),
            source: newChunkTexts[i].source,
          });
        }
      }

      evolution.autoApplied = true;
    }

    evolution.status = 'completed';
    evolution.completedAt = new Date();
    await evolution.save();

    return evolution;
  } catch (err) {
    evolution.status = 'failed';
    evolution.error = err instanceof Error ? err.message : 'Unknown error';
    evolution.completedAt = new Date();
    await evolution.save();
    return evolution;
  }
}

// ── Get evolution history for a client ──
export async function getEvolutionHistory(clientId: string, limit: number = 20): Promise<IKnowledgeEvolution[]> {
  await connectDB();
  return KnowledgeEvolution.find({ clientId }).sort({ createdAt: -1 }).limit(limit).lean();
}

// ── Get clients that need re-crawl (have a website set and last evolution > N days ago) ──
export async function getClientsNeedingRecrawl(
  daysSinceLastCrawl: number = 7
): Promise<Array<{ clientId: string; website: string }>> {
  await connectDB();

  const cutoff = new Date(Date.now() - daysSinceLastCrawl * 86400000);

  // Get all clients with websites
  const clients = await Client.find({
    website: { $exists: true, $ne: '' },
  }).select('clientId website');

  const result: Array<{ clientId: string; website: string }> = [];

  for (const client of clients) {
    // Check when last evolution was run
    const lastEvolution = await KnowledgeEvolution.findOne({
      clientId: client.clientId,
      status: 'completed',
    }).sort({ createdAt: -1 });

    if (!lastEvolution || lastEvolution.createdAt < cutoff) {
      result.push({
        clientId: client.clientId,
        website: client.website,
      });
    }
  }

  return result;
}
