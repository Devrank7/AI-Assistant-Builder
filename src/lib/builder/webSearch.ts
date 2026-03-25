// src/lib/builder/webSearch.ts
// Web search via Gemini Search grounding (Google Search)

import { getAI } from './geminiHelpers';

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

export interface GeminiSearchResponse {
  text: string;
  sources: SearchResult[];
  searchQueries: string[];
}

/**
 * Perform a web search using Gemini's built-in Google Search grounding.
 * Returns structured results with source URLs extracted from grounding metadata.
 */
export async function webSearch(query: string, count: number = 10): Promise<SearchResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return [
      {
        title: 'No Gemini API key configured',
        url: '',
        description: `Web search unavailable. Use web_fetch to fetch documentation directly by URL. Query: "${query}"`,
      },
    ];
  }

  try {
    const result = await geminiSearch(query);

    // Return sources as SearchResult[], limited to requested count
    const results = result.sources.slice(0, count);

    // If we got sources, return them
    if (results.length > 0) return results;

    // Fallback: if grounding returned text but no source metadata,
    // return the text summary as a single result
    if (result.text) {
      return [
        {
          title: `Search results for: ${query}`,
          url: '',
          description: result.text.slice(0, 500),
        },
      ];
    }

    return [];
  } catch (err) {
    console.error('[webSearch] Gemini search error:', (err as Error).message);
    return [];
  }
}

/**
 * Full Gemini search with grounding — returns text + sources + queries.
 * Used by research_api for richer results.
 */
export async function geminiSearch(query: string): Promise<GeminiSearchResponse> {
  const ai = getAI();

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const text = response.text || '';
  const metadata = response.candidates?.[0]?.groundingMetadata;

  // Extract sources from grounding chunks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sources: SearchResult[] = (metadata?.groundingChunks || ([] as any[]))
    .filter((chunk) => chunk.web)
    .map((chunk) => ({
      title: chunk.web?.title || '',
      url: chunk.web?.uri || '',
      description: '',
    }));

  // Enrich descriptions from grounding supports
  const supports = metadata?.groundingSupports || [];
  for (const support of supports as Array<{
    segment?: { text?: string };
    groundingChunkIndices?: number[];
  }>) {
    const text = support.segment?.text || '';
    for (const idx of support.groundingChunkIndices || []) {
      if (idx < sources.length && !sources[idx].description) {
        sources[idx].description = text.slice(0, 300);
      }
    }
  }

  const searchQueries = (metadata?.webSearchQueries as string[]) || [];

  return { text, sources, searchQueries };
}
