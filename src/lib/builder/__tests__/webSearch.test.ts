// src/lib/builder/__tests__/webSearch.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webSearch, type SearchResult } from '../webSearch';

describe('webSearch', () => {
  beforeEach(() => {
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'test-key');
  });

  it('returns empty results when no API key', async () => {
    vi.stubEnv('BRAVE_SEARCH_API_KEY', '');
    const results = await webSearch('test query');
    expect(results).toEqual([]);
  });

  it('formats search results correctly', async () => {
    const mockResponse = {
      web: {
        results: [
          { title: 'Test Page', url: 'https://example.com', description: 'A test page' },
          { title: 'Another Page', url: 'https://example2.com', description: 'Another page' },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const results = await webSearch('test query');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: 'Test Page',
      url: 'https://example.com',
      description: 'A test page',
    });
  });

  it('returns empty on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    const results = await webSearch('test');
    expect(results).toEqual([]);
  });
});
