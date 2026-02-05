import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Generate embedding vector for text using Gemini
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

    const result = await model.embedContent(text);
    return result.embedding.values;
}

/**
 * Generate chat response using Gemini 3 Fast
 */
export async function generateResponse(
    systemPrompt: string,
    context: string,
    userMessage: string,
    temperature: number = 0.7,
    maxTokens: number = 1024
): Promise<string> {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
        },
    });

    const prompt = `${systemPrompt}

---
БАЗА ЗНАНИЙ:
${context || 'Нет дополнительной информации.'}
---

Вопрос пользователя: ${userMessage}

Ответ:`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text();
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
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
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
 */
export async function findSimilarChunks(
    queryEmbedding: number[],
    chunks: Array<{ text: string; embedding: number[] }>,
    topK: number = 3
): Promise<Array<{ text: string; similarity: number }>> {
    const scored = chunks.map(chunk => ({
        text: chunk.text,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    scored.sort((a, b) => b.similarity - a.similarity);

    return scored.slice(0, topK);
}
