// src/lib/builder/webSearch.ts

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

export async function webSearch(query: string, count: number = 10): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    return [
      {
        title: 'No search API configured',
        url: '',
        description: `Web search unavailable. Use web_fetch to fetch documentation directly by URL. Query: "${query}"`,
      },
    ];
  }

  try {
    const params = new URLSearchParams({ q: query, count: String(count) });
    const res = await fetch(`${BRAVE_API_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data?.web?.results || [];

    return results.map((r: { title: string; url: string; description: string }) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));
  } catch {
    return [];
  }
}
