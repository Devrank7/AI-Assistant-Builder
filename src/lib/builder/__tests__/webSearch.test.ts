// src/lib/builder/__tests__/webSearch.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webSearch, geminiSearch, type SearchResult } from '../webSearch';

// Mock geminiHelpers
vi.mock('../geminiHelpers', () => ({
  getAI: vi.fn(() => ({
    models: {
      generateContent: vi.fn(),
    },
  })),
}));

import { getAI } from '../geminiHelpers';

describe('webSearch (Gemini Search grounding)', () => {
  const mockGenerateContent = vi.fn();

  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    mockGenerateContent.mockReset();
    (getAI as ReturnType<typeof vi.fn>).mockReturnValue({
      models: { generateContent: mockGenerateContent },
    });
  });

  it('returns placeholder when no GEMINI_API_KEY', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    const results = await webSearch('test query');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('No Gemini API key configured');
  });

  it('extracts sources from grounding metadata', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Found info about the API',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: 'https://docs.example.com', title: 'API Docs' } },
              { web: { uri: 'https://guide.example.com', title: 'Guide' } },
            ],
            groundingSupports: [
              {
                segment: { text: 'Detailed API documentation' },
                groundingChunkIndices: [0],
              },
            ],
            webSearchQueries: ['test API docs'],
          },
        },
      ],
    });

    const results = await webSearch('test API docs');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: 'API Docs',
      url: 'https://docs.example.com',
      description: 'Detailed API documentation',
    });
    expect(results[1]).toEqual({
      title: 'Guide',
      url: 'https://guide.example.com',
      description: '',
    });
  });

  it('returns text summary when no sources in grounding', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Here is what I found about the topic',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [],
            webSearchQueries: ['test'],
          },
        },
      ],
    });

    const results = await webSearch('test');
    expect(results).toHaveLength(1);
    expect(results[0].description).toContain('Here is what I found');
  });

  it('returns empty on API error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('API error'));
    const results = await webSearch('test');
    expect(results).toEqual([]);
  });

  it('geminiSearch returns full response structure', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Search summary text',
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [{ web: { uri: 'https://example.com', title: 'Example' } }],
            groundingSupports: [],
            webSearchQueries: ['query 1', 'query 2'],
          },
        },
      ],
    });

    const result = await geminiSearch('test');
    expect(result.text).toBe('Search summary text');
    expect(result.sources).toHaveLength(1);
    expect(result.searchQueries).toEqual(['query 1', 'query 2']);
  });
});
