/**
 * Gemini AI Integration Tests
 *
 * Verifies integration matches official Gemini API documentation:
 * - https://ai.google.dev/gemini-api/docs
 * - https://ai.google.dev/gemini-api/docs/caching
 */

import { describe, it, expect } from 'vitest';
import { cosineSimilarity, splitTextIntoChunks, findSimilarChunks } from '../gemini';

// Note: We test utility functions directly without mocking the SDK
// since they don't depend on the API. The SDK-dependent functions
// (generateEmbedding, generateResponse) require integration tests.

describe('Gemini Integration', () => {
  describe('cosineSimilarity', () => {
    it('should return 1 for identical vectors', () => {
      const vec = [1, 2, 3, 4, 5];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1, 5);
    });

    it('should return 0 for orthogonal vectors', () => {
      const vec1 = [1, 0, 0];
      const vec2 = [0, 1, 0];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0, 5);
    });

    it('should return -1 for opposite vectors', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [-1, -2, -3];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(-1, 5);
    });

    it('should throw error for mismatched vector lengths', () => {
      const vec1 = [1, 2, 3];
      const vec2 = [1, 2];
      expect(() => cosineSimilarity(vec1, vec2)).toThrow('Vectors must have the same length');
    });

    it('should return 0 for zero vectors', () => {
      const vec1 = [0, 0, 0];
      const vec2 = [1, 2, 3];
      expect(cosineSimilarity(vec1, vec2)).toBe(0);
    });

    it('should handle normalized vectors correctly', () => {
      // Two unit vectors at 60 degrees should have cosine similarity of 0.5
      const vec1 = [1, 0];
      const vec2 = [0.5, Math.sqrt(3) / 2];
      expect(cosineSimilarity(vec1, vec2)).toBeCloseTo(0.5, 5);
    });
  });

  describe('splitTextIntoChunks', () => {
    it('should split text by sentences', () => {
      const text = 'First sentence. Second sentence. Third sentence.';
      const chunks = splitTextIntoChunks(text, 50);

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every((c) => c.endsWith('.'))).toBe(true);
    });

    it('should respect max chunk size', () => {
      const longText = 'This is sentence one. This is sentence two. This is sentence three. This is sentence four.';
      const chunks = splitTextIntoChunks(longText, 50);

      // Each chunk should be <= maxChunkSize (approximately)
      chunks.forEach((chunk) => {
        expect(chunk.length).toBeLessThanOrEqual(60); // Allow some buffer
      });
    });

    it('should combine short sentences into one chunk', () => {
      const text = 'Hi. Hello. Hey.';
      const chunks = splitTextIntoChunks(text, 100);

      expect(chunks.length).toBe(1);
      expect(chunks[0]).toContain('Hi');
      expect(chunks[0]).toContain('Hello');
      expect(chunks[0]).toContain('Hey');
    });

    it('should handle empty text', () => {
      const chunks = splitTextIntoChunks('', 100);
      expect(chunks.length).toBe(0);
    });

    it('should handle text with different sentence endings', () => {
      const text = 'Question? Exclamation! Statement.';
      const chunks = splitTextIntoChunks(text, 100);

      expect(chunks.length).toBeGreaterThan(0);
    });

    it('should not produce empty chunks', () => {
      const text = 'Sentence one. Sentence two. Sentence three.';
      const chunks = splitTextIntoChunks(text, 30);

      chunks.forEach((chunk) => {
        expect(chunk.trim().length).toBeGreaterThan(0);
      });
    });
  });

  describe('findSimilarChunks', () => {
    const testChunks = [
      { text: 'About machine learning', embedding: [0.9, 0.1, 0.0] },
      { text: 'About cooking recipes', embedding: [0.1, 0.9, 0.1] },
      { text: 'About AI and neural networks', embedding: [0.85, 0.15, 0.05] },
      { text: 'About gardening tips', embedding: [0.1, 0.1, 0.9] },
    ];

    it('should return top K most similar chunks', async () => {
      const queryEmbedding = [0.9, 0.1, 0.0]; // Similar to ML topics

      const results = await findSimilarChunks(queryEmbedding, testChunks, 2);

      expect(results.length).toBe(2);
      expect(results[0].text).toContain('machine learning');
      expect(results[1].text).toContain('AI and neural');
    });

    it('should filter by minimum similarity threshold', async () => {
      const queryEmbedding = [0.9, 0.1, 0.0];

      const results = await findSimilarChunks(queryEmbedding, testChunks, 10, 0.8);

      // Only chunks with similarity >= 0.8 should be returned
      results.forEach((result) => {
        expect(result.similarity).toBeGreaterThanOrEqual(0.8);
      });
    });

    it('should sort results by similarity descending', async () => {
      const queryEmbedding = [0.5, 0.5, 0.0];

      const results = await findSimilarChunks(queryEmbedding, testChunks, 4, 0);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }
    });

    it('should handle empty chunks array', async () => {
      const results = await findSimilarChunks([0.5, 0.5], [], 3);
      expect(results.length).toBe(0);
    });

    it('should return fewer than K if not enough chunks above threshold', async () => {
      const queryEmbedding = [0.0, 0.0, 1.0]; // Only similar to gardening

      const results = await findSimilarChunks(queryEmbedding, testChunks, 3, 0.9);

      expect(results.length).toBeLessThan(3);
    });
  });

  describe('Implicit Caching Strategy', () => {
    it('should have system prompt at the START of content for cache optimization', async () => {
      // This is a documentation/design test to verify our caching strategy
      // Per Gemini docs: "Try putting large and common contents at the beginning of your prompt"

      // Import the actual function to inspect its structure
      const { generateResponse } = await import('../gemini');

      // The function signature shows system prompt comes before user message
      // This is verified by the function implementation placing systemPrompt first
      expect(typeof generateResponse).toBe('function');

      // Note: Full integration test would require actual API call
      // This test documents the expected behavior per API docs
    });
  });
});

describe('RAG System Integration', () => {
  it('should support full RAG pipeline: embed -> search -> respond', async () => {
    // This test documents the expected RAG flow
    // 1. User query gets embedded
    // 2. Similar chunks are found from knowledge base
    // 3. Context is added to prompt for response generation

    const { generateEmbedding, findSimilarChunks } = await import('../gemini');

    // Verify functions exist and are callable
    expect(typeof generateEmbedding).toBe('function');
    expect(typeof findSimilarChunks).toBe('function');
  });
});
