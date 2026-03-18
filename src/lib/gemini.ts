import { GoogleGenerativeAI } from '@google/generative-ai';
import { getDefaultModel } from '@/lib/models';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Generate embedding vector for text using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

  const result = await model.embedContent(text);
  if (!result?.embedding?.values) {
    throw new Error('Invalid embedding response from Gemini API');
  }
  return result.embedding.values;
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
 * Placeholder for cache invalidation
 * With implicit caching, no explicit invalidation is needed.
 * The cache expires automatically based on Gemini's internal TTL.
 */
export async function invalidatePromptCache(clientId: string): Promise<void> {
  // No-op for implicit caching
  // If we upgrade to explicit caching with server SDK, implement here
  console.log(`Cache invalidation requested for ${clientId} (using implicit caching, no action needed)`);
}
