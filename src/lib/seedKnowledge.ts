import fs from 'fs';
import path from 'path';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings from '@/models/AISettings';
import ShortLink from '@/models/ShortLink';
import { generateEmbedding } from '@/lib/gemini';

const SEEDS_DIR = path.join(process.cwd(), 'knowledge-seeds');

let seeded = false;

/**
 * Seed knowledge chunks and AI settings from JSON seed files.
 * Only runs once per process. Only imports data for clients that have
 * no existing knowledge chunks in the database.
 */
export async function seedKnowledgeIfNeeded(): Promise<void> {
  if (seeded) return;
  seeded = true;

  if (!fs.existsSync(SEEDS_DIR)) return;

  let seedFiles: string[];
  try {
    seedFiles = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    return;
  }

  if (seedFiles.length === 0) return;

  console.log(`[Seed] Found ${seedFiles.length} knowledge seed files, checking DB...`);

  // Parse all seed files upfront
  const seeds: { file: string; data: Record<string, unknown> }[] = [];
  for (const file of seedFiles) {
    try {
      const raw = fs.readFileSync(path.join(SEEDS_DIR, file), 'utf-8');
      seeds.push({ file, data: JSON.parse(raw) });
    } catch {
      // skip unparseable files
    }
  }

  // ── Pass 1: Fast operations (AI settings + short links) ──
  // These are DB-only ops and must complete for all clients before
  // attempting slow embedding generation.
  for (const { data: seed } of seeds) {
    const clientId = seed.clientId as string;
    if (!clientId) continue;

    try {
      // Import AI settings
      const aiSettings = seed.aiSettings as Record<string, unknown> | undefined;
      if (aiSettings) {
        const existingSettings = await AISettings.findOne({ clientId });
        if (!existingSettings) {
          await AISettings.create({ clientId, ...aiSettings });
          console.log(`[Seed] ${clientId}: created AI settings`);
        } else if (existingSettings.systemPrompt.length < 200 && (aiSettings.systemPrompt as string)?.length > 200) {
          existingSettings.systemPrompt = aiSettings.systemPrompt as string;
          if (aiSettings.greeting) existingSettings.greeting = aiSettings.greeting as string;
          if (aiSettings.topK) existingSettings.topK = aiSettings.topK as number;
          if (aiSettings.aiModel) existingSettings.aiModel = aiSettings.aiModel as string;
          if (aiSettings.maxTokens) existingSettings.maxTokens = aiSettings.maxTokens as number;
          await existingSettings.save();
          console.log(`[Seed] ${clientId}: updated AI settings (short prompt → seed prompt)`);
        }
      }

      // Import short link
      const shortLink = seed.shortLink as { code?: string } | undefined;
      if (shortLink?.code) {
        const existingLink = await ShortLink.findOne({ clientId });
        if (!existingLink) {
          let website = '';
          try {
            const infoPath = path.join(process.cwd(), 'quickwidgets', clientId, 'info.json');
            if (fs.existsSync(infoPath)) {
              const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
              website = info.website || '';
            }
          } catch {}

          try {
            await ShortLink.create({ code: shortLink.code, clientId, website, widgetType: 'quick' });
            console.log(`[Seed] ${clientId}: created short link /d/${shortLink.code}`);
          } catch {
            console.warn(`[Seed] ${clientId}: short link code collision, skipping`);
          }
        }
      }
    } catch (err) {
      console.warn(`[Seed] ${clientId}: error in pass 1:`, err);
    }
  }

  // ── Pass 2: Slow operations (knowledge chunks with embedding generation) ──
  let imported = 0;

  for (const { data: seed } of seeds) {
    const clientId = seed.clientId as string;
    if (!clientId) continue;

    try {
      const existingCount = await KnowledgeChunk.countDocuments({ clientId });
      if (existingCount > 0) continue;

      const chunks = seed.chunks as { text: string; embedding?: number[]; source?: string }[] | undefined;
      if (!chunks || chunks.length === 0) continue;

      const docs = [];
      for (const c of chunks) {
        let embedding = c.embedding;
        if (!embedding || embedding.length === 0) {
          try {
            embedding = await generateEmbedding(c.text);
          } catch {
            console.warn(`[Seed] ${clientId}: failed to generate embedding, skipping chunk`);
            continue;
          }
        }
        docs.push({
          clientId,
          text: c.text,
          embedding,
          source: c.source || 'website',
        });
      }
      if (docs.length > 0) {
        await KnowledgeChunk.insertMany(docs);
      }

      imported++;
      console.log(`[Seed] ${clientId}: imported ${chunks.length} chunks`);
    } catch (err) {
      console.warn(`[Seed] ${clientId}: error importing chunks:`, err);
    }
  }

  if (imported > 0) {
    console.log(`[Seed] Done! Imported knowledge for ${imported} clients.`);
  }
}
