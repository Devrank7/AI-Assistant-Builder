import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDefaultModel } from '@/lib/models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Generate embedding vector for text using Gemini (with retry + backoff)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-2-preview' });
  const MAX_RETRIES = 3;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.embedContent(text);
      if (!result?.embedding?.values) {
        throw new Error('Invalid embedding response from Gemini API');
      }
      return result.embedding.values;
    } catch (err) {
      const msg = (err as Error).message || '';
      const isRetryable = /429|503|quota|resource exhausted|too many|overloaded|unavailable/i.test(msg);
      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
  throw new Error('generateEmbedding: max retries exceeded');
}

/**
 * Generate embeddings for multiple texts in parallel batches.
 * Processes BATCH_SIZE texts concurrently to stay within rate limits.
 */
export async function generateEmbeddingsBatch(texts: string[], batchSize: number = 15): Promise<number[][]> {
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await Promise.all(batch.map((t) => generateEmbedding(t)));
    results.push(...embeddings);
  }

  return results;
}

export interface GenerateResponseResult {
  text: string;
  tokensUsed: {
    input: number;
    output: number;
    total: number;
  };
}

/**
 * Generate chat response using specified Gemini model
 *
 * NOTE: We use Implicit Caching (automatic) by:
 * 1. Placing the large, stable content (system prompt) at the START of the prompt
 * 2. Sending similar prompts close together in time
 *
 * Gemini automatically caches repeated prefixes, reducing cost for
 * subsequent calls with the same system prompt.
 */
export async function generateResponse(
  clientId: string,
  systemPrompt: string,
  context: string,
  userMessage: string,
  temperature: number = 0.7,
  maxTokens: number = 4096,
  modelId: string = getDefaultModel().id
): Promise<GenerateResponseResult> {
  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  });

  // IMPORTANT: Place system prompt FIRST for implicit caching to work
  // Gemini automatically caches repeated prompt prefixes
  const prompt = `${systemPrompt}

---
БАЗА ЗНАНИЙ:
${context || 'Нет дополнительной информации.'}
---

Вопрос пользователя: ${userMessage}

Ответ:`;

  const result = await model.generateContent(prompt);
  const response = result.response;

  // Extract token usage from response metadata
  const usage = response.usageMetadata;
  const inputTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;

  return {
    text: response.text(),
    tokensUsed: {
      input: inputTokens,
      output: outputTokens,
      total: inputTokens + outputTokens,
    },
  };
}

/**
 * Calculate cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Split text into chunks for embedding
 */
export function splitTextIntoChunks(text: string, maxChunkSize: number = 500): string[] {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    if ((currentChunk + ' ' + trimmedSentence).length <= maxChunkSize) {
      currentChunk = currentChunk ? currentChunk + '. ' + trimmedSentence : trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
      }
      currentChunk = trimmedSentence;
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }

  return chunks;
}

/**
 * Find most similar chunks from knowledge base
 * Optimized version with built-in threshold filtering
 */
export async function findSimilarChunks(
  queryEmbedding: number[],
  chunks: Array<{ text: string; embedding: number[] }>,
  topK: number = 3,
  minSimilarity: number = 0.3
): Promise<Array<{ text: string; similarity: number }>> {
  const scored = chunks.map((chunk) => ({
    text: chunk.text,
    similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
  }));

  // Filter by minimum similarity first to reduce sorting overhead
  const relevant = scored.filter((c) => c.similarity >= minSimilarity);

  relevant.sort((a, b) => b.similarity - a.similarity);

  return relevant.slice(0, topK);
}

/**
 * Placeholder for cache invalidation.
 *
 * Currently a no-op because we rely on Gemini's implicit (automatic) caching,
 * which caches repeated prompt prefixes server-side with its own TTL — there is
 * no client-side handle to invalidate.
 *
 * TODO: If upgrading to explicit caching via the Gemini server SDK
 * (google-cloud/vertexai or the REST `cachedContents` API), replace this body
 * with a DELETE call to the named cache resource:
 *   DELETE https://generativelanguage.googleapis.com/v1beta/cachedContents/{name}
 * The cache name would need to be stored per-client (e.g. in AISettings) when
 * the cache is first created.
 */
export async function invalidatePromptCache(_clientId: string): Promise<void> {
  // No-op: implicit caching has no client-controlled invalidation mechanism.
}
