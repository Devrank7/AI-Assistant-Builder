import { describe, it, expect, vi } from 'vitest';

// Mock dependencies
vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/KnowledgeEvolution', () => {
  const mockDoc = {
    save: vi.fn(),
    _id: 'evo-1',
    clientId: 'client-1',
    status: 'pending',
    diffs: [],
    pagesScanned: 0,
    addedChunks: 0,
    removedChunks: 0,
    modifiedChunks: 0,
    autoApplied: false,
    error: null,
  };
  const mockModel: Record<string, unknown> = {
    create: vi.fn().mockResolvedValue(mockDoc),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    findOne: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue(null),
    }),
  };
  return { default: mockModel };
});
vi.mock('@/models/KnowledgeChunk', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockResolvedValue([]),
    create: vi.fn(),
    deleteOne: vi.fn(),
  };
  return { default: mockModel };
});
vi.mock('@/models/Client', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue([{ clientId: 'client-1', website: 'https://example.com' }]),
    }),
  };
  return { default: mockModel };
});
vi.mock('@/lib/crawler', () => ({
  crawlWebsite: vi.fn().mockResolvedValue({
    pages: [
      { url: 'https://example.com', title: 'Home', text: 'Welcome to our website with lots of content' },
      { url: 'https://example.com/about', title: 'About', text: 'About us page with company information' },
    ],
    totalPages: 2,
    totalChars: 1000,
    durationMs: 500,
    strategies: ['html'],
    errors: [],
  }),
}));

describe('Knowledge Evolution', () => {
  it('getEvolutionHistory returns an array for a given clientId', async () => {
    const { getEvolutionHistory } = await import('@/lib/knowledgeEvolution');
    const history = await getEvolutionHistory('client-1');
    expect(Array.isArray(history)).toBe(true);
  });

  it('getClientsNeedingRecrawl finds clients with no recent evolution', async () => {
    const { getClientsNeedingRecrawl } = await import('@/lib/knowledgeEvolution');
    const clients = await getClientsNeedingRecrawl(7);
    expect(Array.isArray(clients)).toBe(true);
    expect(clients.length).toBeGreaterThan(0);
    expect(clients[0].clientId).toBe('client-1');
    expect(clients[0].website).toBe('https://example.com');
  });

  it('evolveKnowledge creates an evolution record and processes crawl results', async () => {
    const { evolveKnowledge } = await import('@/lib/knowledgeEvolution');
    const KnowledgeEvolution = (await import('@/models/KnowledgeEvolution')).default;

    const result = await evolveKnowledge('client-1', 'https://example.com', false);

    // Verify create was called
    expect(KnowledgeEvolution.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        crawlUrl: 'https://example.com',
        status: 'crawling',
      })
    );

    // Result should be the evolution document
    expect(result).toBeDefined();
    expect(result.clientId).toBe('client-1');
  });
});
