// src/lib/builder/knowledgeCrawler.ts
import type { SiteProfile } from './types';

const MAX_CHUNK_SIZE = 2000;

export function chunkContent(content: string, maxSize: number = MAX_CHUNK_SIZE): string[] {
  if (!content.trim()) return [];

  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      const sentences = paragraph.match(/[^.!?]+[.!?]+\s*/g) || [paragraph];
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if ((sentenceChunk + sentence).length > maxSize) {
          if (sentenceChunk.trim()) chunks.push(sentenceChunk.trim());
          sentenceChunk = sentence;
        } else {
          sentenceChunk += sentence;
        }
      }
      if (sentenceChunk.trim()) chunks.push(sentenceChunk.trim());
    } else if ((currentChunk + '\n\n' + paragraph).length > maxSize) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

export interface CrawlResult {
  uploaded: number;
  failed: number;
  total: number;
}

export async function uploadKnowledge(
  pages: SiteProfile['pages'],
  clientId: string,
  baseUrl: string,
  cookie: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<CrawlResult> {
  const allChunks: { content: string; title: string }[] = [];

  for (const page of pages) {
    if (!page.content) continue;
    const chunks = chunkContent(page.content);
    for (const chunk of chunks) {
      allChunks.push({ content: chunk, title: page.title });
    }
  }

  const result: CrawlResult = { uploaded: 0, failed: 0, total: allChunks.length };

  // Use admin token for internal API calls (builder runs server-side)
  const adminToken = process.env.ADMIN_SECRET_TOKEN || '';
  const authCookie = `${cookie}; admin_token=${adminToken}`;

  // Send chunks in batches of 10 concurrent requests to avoid timeouts
  const BATCH_SIZE = 10;

  for (let i = 0; i < allChunks.length; i += BATCH_SIZE) {
    const batch = allChunks.slice(i, i + BATCH_SIZE);

    const promises = batch.map(async (chunk) => {
      try {
        const res = await fetch(`${baseUrl}/api/knowledge`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: authCookie,
          },
          body: JSON.stringify({
            clientId,
            text: chunk.content,
            source: `builder-crawler: ${chunk.title}`,
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (res.ok) {
          result.uploaded++;
        } else {
          result.failed++;
        }
      } catch {
        result.failed++;
      }
    });

    await Promise.all(promises);
    onProgress?.(result.uploaded + result.failed, result.total);
  }

  return result;
}

export async function setAIPrompt(
  clientId: string,
  businessType: string,
  businessName: string,
  baseUrl: string,
  cookie: string
): Promise<void> {
  const nicheHints: Record<string, string> = {
    dental: 'Focus on appointments, insurance, dental procedures, and patient comfort.',
    restaurant: 'Focus on menu, reservations, hours, dietary restrictions, and delivery.',
    saas: 'Focus on features, pricing, integrations, API, and onboarding.',
    realestate: 'Focus on listings, viewings, buying/selling process, and market conditions.',
    beauty: 'Focus on services, appointments, pricing, products, and gift cards.',
    medical: 'Focus on appointments, services, insurance, and patient care.',
  };
  const hint = nicheHints[businessType] || 'Answer questions helpfully based on the knowledge base.';

  const systemPrompt = `You are a helpful AI assistant for "${businessName}". ${hint}

RULES:
- Answer in the same language the user writes in.
- Base your answers ONLY on the knowledge base provided below. Do not invent facts, numbers, or details.
- If the knowledge base does not contain the answer, say honestly that you don't have that information and suggest contacting the business directly.
- Give complete, informative answers. Do not cut off mid-sentence.
- Be concise but thorough — 2-4 sentences is ideal for most questions.
- Be friendly and professional.`;

  const adminToken = process.env.ADMIN_SECRET_TOKEN || '';
  const authCookie = `${cookie}; admin_token=${adminToken}`;

  await fetch(`${baseUrl}/api/ai-settings/${clientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: authCookie,
    },
    body: JSON.stringify({
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
    }),
  });
}
