import crypto from 'crypto';
import connectDB from './mongodb';
import KnowledgeEvolutionTracker, { type IKnowledgeEvolutionTracker } from '@/models/KnowledgeEvolutionTracker';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import { generateEmbedding } from '@/lib/gemini';

// ── Helpers ──────────────────────────────────────────────────────────────────

function generateEvolutionId(): string {
  return `evo_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function md5(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Fetch a URL and return its text content. Falls back to empty string on error. */
async function fetchPageText(url: string): Promise<{ text: string; error?: string }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'WinBixBot/1.0 (+https://winbixai.com)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      return { text: '', error: `HTTP ${res.status}` };
    }
    const html = await res.text();
    // Strip HTML tags to get plain text
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    return { text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Fetch failed';
    return { text: '', error: msg };
  }
}

/** Compute sentence-level diffs between old and new content */
function diffContent(
  oldText: string,
  newText: string
): Array<{ type: 'added' | 'removed' | 'modified'; summary: string; oldSnippet?: string; newSnippet?: string }> {
  const oldSentences = oldText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
  const newSentences = newText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);

  const oldSet = new Set(oldSentences);
  const newSet = new Set(newSentences);

  const changes: ReturnType<typeof diffContent> = [];

  // Added sentences (in new, not in old)
  const addedSentences = newSentences.filter((s) => !oldSet.has(s)).slice(0, 10);
  if (addedSentences.length > 0) {
    changes.push({
      type: 'added',
      summary: `${addedSentences.length} new sentence(s) added`,
      newSnippet: addedSentences.slice(0, 3).join(' ').slice(0, 400),
    });
  }

  // Removed sentences (in old, not in new)
  const removedSentences = oldSentences.filter((s) => !newSet.has(s)).slice(0, 10);
  if (removedSentences.length > 0) {
    changes.push({
      type: 'removed',
      summary: `${removedSentences.length} sentence(s) removed`,
      oldSnippet: removedSentences.slice(0, 3).join(' ').slice(0, 400),
    });
  }

  // Modified: if word counts differ significantly
  const oldWords = countWords(oldText);
  const newWords = countWords(newText);
  const delta = Math.abs(newWords - oldWords);
  if (delta > 30 && changes.length === 0) {
    changes.push({
      type: 'modified',
      summary: `Content changed by ~${delta} words (${oldWords} → ${newWords})`,
      oldSnippet: oldText.slice(0, 300),
      newSnippet: newText.slice(0, 300),
    });
  }

  return changes;
}

// ── Service Functions ─────────────────────────────────────────────────────────

/**
 * Setup evolution tracking for a URL under a client.
 */
export async function setupEvolution(
  clientId: string,
  sourceUrl: string,
  opts?: {
    organizationId?: string;
    userId?: string;
    intervalDays?: number;
  }
): Promise<IKnowledgeEvolutionTracker> {
  await connectDB();

  // Normalise URL
  const url = sourceUrl.trim().replace(/\/$/, '');

  // Check for duplicate
  const existing = await KnowledgeEvolutionTracker.findOne({ clientId, sourceUrl: url });
  if (existing) return existing;

  const now = new Date();
  const intervalDays = opts?.intervalDays ?? 7;
  const nextRun = new Date(now.getTime() + intervalDays * 86400000);

  const tracker = await KnowledgeEvolutionTracker.create({
    evolutionId: generateEvolutionId(),
    clientId,
    organizationId: opts?.organizationId,
    userId: opts?.userId,
    sourceUrl: url,
    schedule: {
      enabled: true,
      intervalDays,
      nextRun,
    },
    isActive: true,
  });

  return tracker;
}

/**
 * Crawl the URL and compare with stored content. Records crawl entry and changes.
 */
export async function crawlAndDiff(evolutionId: string): Promise<{
  tracker: IKnowledgeEvolutionTracker;
  newChanges: number;
  crawlStatus: 'success' | 'failed' | 'no_change';
}> {
  await connectDB();

  const tracker = await KnowledgeEvolutionTracker.findOne({ evolutionId });
  if (!tracker) throw new Error('Evolution tracker not found');

  const { text, error } = await fetchPageText(tracker.sourceUrl);

  if (error || !text) {
    const crawlEntry = {
      crawledAt: new Date(),
      contentHash: '',
      wordCount: 0,
      status: 'failed' as const,
      error: error || 'Empty response',
    };
    tracker.crawlHistory.push(crawlEntry);
    tracker.stats.totalCrawls += 1;
    tracker.schedule.lastRun = new Date();
    tracker.schedule.nextRun = new Date(Date.now() + tracker.schedule.intervalDays * 86400000);
    await tracker.save();
    return { tracker, newChanges: 0, crawlStatus: 'failed' };
  }

  const newHash = md5(text);
  const wordCount = countWords(text);
  const now = new Date();

  // No change
  if (newHash === tracker.lastContentHash && tracker.lastContentHash !== '') {
    const crawlEntry = {
      crawledAt: now,
      contentHash: newHash,
      wordCount,
      status: 'no_change' as const,
    };
    tracker.crawlHistory.push(crawlEntry);
    tracker.stats.totalCrawls += 1;
    tracker.schedule.lastRun = now;
    tracker.schedule.nextRun = new Date(now.getTime() + tracker.schedule.intervalDays * 86400000);
    await tracker.save();
    return { tracker, newChanges: 0, crawlStatus: 'no_change' };
  }

  // Compute diffs
  let newChanges = 0;
  if (tracker.lastContent) {
    const diffs = diffContent(tracker.lastContent, text);
    for (const d of diffs) {
      tracker.changes.push({
        detectedAt: now,
        type: d.type,
        summary: d.summary,
        oldSnippet: d.oldSnippet,
        newSnippet: d.newSnippet,
        applied: false,
      });
      newChanges++;
    }
    if (diffs.length > 0) {
      tracker.stats.totalChanges += diffs.length;
      tracker.stats.lastChangeAt = now;
    }
  }

  // Update content
  tracker.lastContent = text.slice(0, 50000); // cap at 50k chars
  tracker.lastContentHash = newHash;

  // Update stats
  tracker.stats.totalCrawls += 1;
  if (tracker.stats.totalCrawls > 0) {
    tracker.stats.avgChangesPerCrawl = Math.round((tracker.stats.totalChanges / tracker.stats.totalCrawls) * 100) / 100;
  }

  tracker.crawlHistory.push({
    crawledAt: now,
    contentHash: newHash,
    wordCount,
    status: 'success',
  });

  // Keep crawl history bounded
  if (tracker.crawlHistory.length > 100) {
    tracker.crawlHistory = tracker.crawlHistory.slice(-100);
  }

  tracker.schedule.lastRun = now;
  tracker.schedule.nextRun = new Date(now.getTime() + tracker.schedule.intervalDays * 86400000);

  await tracker.save();
  return { tracker, newChanges, crawlStatus: 'success' };
}

/**
 * Apply a single detected change to the knowledge base.
 */
export async function applyChange(evolutionId: string, changeIndex: number): Promise<IKnowledgeEvolutionTracker> {
  await connectDB();

  const tracker = await KnowledgeEvolutionTracker.findOne({ evolutionId });
  if (!tracker) throw new Error('Evolution tracker not found');

  const change = tracker.changes[changeIndex];
  if (!change) throw new Error('Change not found');
  if (change.applied) return tracker;

  const now = new Date();
  const snippet = change.newSnippet || change.oldSnippet || '';

  if (change.type === 'added' && change.newSnippet) {
    // Create a new knowledge chunk with a real embedding
    const embedding = await generateEmbedding(change.newSnippet);
    await KnowledgeChunk.create({
      clientId: tracker.clientId,
      text: change.newSnippet,
      embedding,
      source: tracker.sourceUrl,
    });
  } else if (change.type === 'removed' && change.oldSnippet) {
    // Remove matching knowledge chunk (best-effort text match)
    await KnowledgeChunk.deleteOne({
      clientId: tracker.clientId,
      text: { $regex: change.oldSnippet.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
    });
  } else if (change.type === 'modified') {
    // Upsert — find by old snippet, update with new
    if (change.oldSnippet && change.newSnippet) {
      const embedding = await generateEmbedding(change.newSnippet);
      const found = await KnowledgeChunk.findOne({
        clientId: tracker.clientId,
        text: { $regex: change.oldSnippet.slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' },
      });
      if (found) {
        found.text = change.newSnippet;
        found.embedding = embedding;
        found.source = tracker.sourceUrl;
        await found.save();
      } else {
        await KnowledgeChunk.create({
          clientId: tracker.clientId,
          text: change.newSnippet,
          embedding,
          source: tracker.sourceUrl,
        });
      }
    }
  }

  // Mark as applied
  tracker.changes[changeIndex].applied = true;
  tracker.changes[changeIndex].appliedAt = now;
  tracker.markModified('changes');

  await tracker.save();
  return tracker;
}

/**
 * Apply all unapplied changes for an evolution tracker.
 */
export async function applyAllChanges(evolutionId: string): Promise<{ applied: number }> {
  await connectDB();

  const tracker = await KnowledgeEvolutionTracker.findOne({ evolutionId });
  if (!tracker) throw new Error('Evolution tracker not found');

  let applied = 0;
  for (let i = 0; i < tracker.changes.length; i++) {
    if (!tracker.changes[i].applied) {
      try {
        await applyChange(evolutionId, i);
        applied++;
      } catch (err) {
        console.error(`[knowledgeEvolution] Failed to apply change ${i} for ${evolutionId}:`, err);
      }
    }
  }

  return { applied };
}

/**
 * List all evolution trackers for a client.
 */
export async function getEvolutionsByClient(clientId: string): Promise<IKnowledgeEvolutionTracker[]> {
  await connectDB();
  return KnowledgeEvolutionTracker.find({ clientId }).sort({ createdAt: -1 }).lean();
}

/**
 * Overview stats for a client.
 */
export async function getEvolutionStats(clientId: string): Promise<{
  totalTracked: number;
  activeTracked: number;
  totalChanges: number;
  totalCrawls: number;
  lastCrawlAt: Date | null;
  pendingChanges: number;
}> {
  await connectDB();

  const trackers = await KnowledgeEvolutionTracker.find({ clientId }).lean();

  let totalChanges = 0;
  let totalCrawls = 0;
  let lastCrawlAt: Date | null = null;
  let pendingChanges = 0;

  for (const t of trackers) {
    totalChanges += t.stats.totalChanges;
    totalCrawls += t.stats.totalCrawls;
    for (const c of t.changes) {
      if (!c.applied) pendingChanges++;
    }
    if (t.crawlHistory.length > 0) {
      const last = t.crawlHistory[t.crawlHistory.length - 1].crawledAt;
      if (!lastCrawlAt || last > lastCrawlAt) {
        lastCrawlAt = last;
      }
    }
  }

  return {
    totalTracked: trackers.length,
    activeTracked: trackers.filter((t) => t.isActive && t.schedule.enabled).length,
    totalChanges,
    totalCrawls,
    lastCrawlAt,
    pendingChanges,
  };
}

/**
 * Trigger a manual crawl for all tracked URLs of a client.
 */
export async function triggerManualCrawl(
  clientId: string
): Promise<{ total: number; success: number; failed: number; noChange: number }> {
  await connectDB();

  const trackers = await KnowledgeEvolutionTracker.find({ clientId, isActive: true }).lean();

  let success = 0;
  let failed = 0;
  let noChange = 0;

  for (const t of trackers) {
    try {
      const result = await crawlAndDiff(t.evolutionId);
      if (result.crawlStatus === 'success') success++;
      else if (result.crawlStatus === 'failed') failed++;
      else noChange++;
    } catch {
      failed++;
    }
  }

  return { total: trackers.length, success, failed, noChange };
}

/**
 * Get all trackers due for crawl (used by cron).
 */
export async function getTrackersDueForCrawl(): Promise<IKnowledgeEvolutionTracker[]> {
  await connectDB();
  const now = new Date();
  return KnowledgeEvolutionTracker.find({
    isActive: true,
    'schedule.enabled': true,
    $or: [{ 'schedule.nextRun': { $lte: now } }, { 'schedule.nextRun': { $exists: false } }],
  }).lean();
}
