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

  let imported = 0;

  for (const file of seedFiles) {
    try {
      const seedPath = path.join(SEEDS_DIR, file);
      const raw = fs.readFileSync(seedPath, 'utf-8');
      const seed = JSON.parse(raw);
      const clientId = seed.clientId;

      if (!clientId) continue;

      // Import AI settings (always check, even if knowledge exists)
      if (seed.aiSettings) {
        const existingSettings = await AISettings.findOne({ clientId });
        if (!existingSettings) {
          await AISettings.create({
            clientId,
            ...seed.aiSettings,
          });
          console.log(`[Seed] ${clientId}: created AI settings`);
        } else if (existingSettings.systemPrompt.length < 200 && seed.aiSettings.systemPrompt?.length > 200) {
          // Update if existing prompt is generic/short and seed has a real one
          existingSettings.systemPrompt = seed.aiSettings.systemPrompt;
          if (seed.aiSettings.greeting) existingSettings.greeting = seed.aiSettings.greeting;
          if (seed.aiSettings.topK) existingSettings.topK = seed.aiSettings.topK;
          if (seed.aiSettings.aiModel) existingSettings.aiModel = seed.aiSettings.aiModel;
          if (seed.aiSettings.maxTokens) existingSettings.maxTokens = seed.aiSettings.maxTokens;
          await existingSettings.save();
          console.log(`[Seed] ${clientId}: updated AI settings (short prompt → seed prompt)`);
        }
      }

      // Import short link if present and not already in DB
      if (seed.shortLink?.code) {
        const existingLink = await ShortLink.findOne({ clientId });
        if (!existingLink) {
          // Read website from info.json in quickwidgets
          let website = '';
          try {
            const infoPath = path.join(process.cwd(), 'quickwidgets', clientId, 'info.json');
            if (fs.existsSync(infoPath)) {
              const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
              website = info.website || '';
            }
          } catch {}

          try {
            await ShortLink.create({
              code: seed.shortLink.code,
              clientId,
              website,
              widgetType: 'quick',
            });
            console.log(`[Seed] ${clientId}: created short link /d/${seed.shortLink.code}`);
          } catch {
            console.warn(`[Seed] ${clientId}: short link code collision, skipping`);
          }
        }
      }

      // Check if this client already has knowledge in the DB
      const existingCount = await KnowledgeChunk.countDocuments({ clientId });
      if (existingCount > 0) continue;

      // Import knowledge chunks
      if (seed.chunks && seed.chunks.length > 0) {
        const docs = [];
        for (const c of seed.chunks as { text: string; embedding?: number[]; source?: string }[]) {
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
      }

      imported++;
      console.log(`[Seed] ${clientId}: imported ${seed.chunks?.length || 0} chunks`);
    } catch (err) {
      console.warn(`[Seed] Error processing ${file}:`, err);
    }
  }

  if (imported > 0) {
    console.log(`[Seed] Done! Imported knowledge for ${imported} clients.`);
  }
}
