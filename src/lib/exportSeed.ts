import fs from 'fs';
import path from 'path';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings from '@/models/AISettings';

const SEEDS_DIR = path.join(process.cwd(), 'knowledge-seeds');

/**
 * Export a client's knowledge chunks (with embeddings) and AI settings
 * to a JSON seed file. Only runs in non-production environments.
 *
 * Called automatically after knowledge upload or AI settings update
 * so that seed files stay in sync with the local DB and get deployed
 * to production alongside the widget code.
 */
export async function exportClientSeed(clientId: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') return;

  try {
    const chunks = await KnowledgeChunk.find({ clientId }).select('text embedding source');

    const settings = await AISettings.findOne({ clientId });

    if (chunks.length === 0 && !settings) return;

    const seed = {
      clientId,
      exportedAt: new Date().toISOString(),
      chunks: chunks.map((c) => ({
        text: c.text,
        embedding: c.embedding,
        source: c.source || 'website',
      })),
      aiSettings: settings
        ? {
            systemPrompt: settings.systemPrompt,
            greeting: settings.greeting,
            temperature: settings.temperature,
            maxTokens: settings.maxTokens,
            topK: settings.topK,
            aiModel: settings.aiModel,
            handoffEnabled: settings.handoffEnabled,
          }
        : null,
    };

    fs.mkdirSync(SEEDS_DIR, { recursive: true });
    fs.writeFileSync(path.join(SEEDS_DIR, `${clientId}.json`), JSON.stringify(seed));

    console.log(
      `[Seed] Exported ${clientId}: ${chunks.length} chunks, prompt ${settings?.systemPrompt?.length || 0} chars`
    );
  } catch (err) {
    console.warn(`[Seed] Export failed for ${clientId}:`, err);
  }
}
