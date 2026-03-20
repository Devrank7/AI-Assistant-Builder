import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
  verifyAdmin: vi.fn(),
  verifyAdminOrClient: vi.fn(),
}));
vi.mock('@/lib/gemini', () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  splitTextIntoChunks: vi.fn((text: string) => [text]),
}));
vi.mock('@/lib/exportSeed', () => ({
  exportClientSeed: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/crawler', () => ({
  crawlWebsite: vi.fn(),
}));
vi.mock('@/lib/retry', () => ({
  withRetry: vi.fn((fn: () => unknown) => fn()),
}));
vi.mock('@/lib/documentParser', () => ({
  parseDocument: vi.fn().mockResolvedValue({ text: 'parsed content', metadata: { pages: 1 } }),
}));
vi.mock('@/models/KnowledgeChunk', () => {
  const mock: Record<string, unknown> = {
    find: vi.fn(),
    create: vi.fn(),
    findOneAndDelete: vi.fn(),
    deleteMany: vi.fn(),
  };
  return { default: mock };
});
vi.mock('@/models/KnowledgeEvolution', () => {
  const mock: Record<string, unknown> = {
    find: vi.fn(),
    countDocuments: vi.fn(),
  };
  return { default: mock };
});
vi.mock('@/models/Client', () => {
  const mock: Record<string, unknown> = {
    findOne: vi.fn(),
  };
  return { default: mock };
});
vi.mock('@/lib/knowledgeEvolution', () => ({
  getEvolutionHistory: vi.fn(),
  evolveKnowledge: vi.fn(),
}));

import { verifyAdminOrClient, verifyAdmin, verifyUser } from '@/lib/auth';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeEvolution from '@/models/KnowledgeEvolution';
import Client from '@/models/Client';
import { crawlWebsite } from '@/lib/crawler';
import { getEvolutionHistory, evolveKnowledge } from '@/lib/knowledgeEvolution';

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

const mockAdminAuth = { authenticated: true as const, role: 'admin' as const };
const mockAdminUnauth = {
  authenticated: false as const,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

const mockUserAuth = {
  authenticated: true as const,
  userId: 'u1',
  user: { email: 'test@test.com', plan: 'pro', subscriptionStatus: 'active' },
  organizationId: 'org1',
  orgRole: 'owner',
};
const mockUserUnauth = {
  authenticated: false as const,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ========== GET /api/knowledge ==========
describe('GET /api/knowledge', () => {
  let GET: typeof import('@/app/api/knowledge/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/knowledge/route'));
  });

  it('returns 400 when clientId is missing', async () => {
    const req = createRequest('GET', '/api/knowledge');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyAdminOrClient).mockResolvedValue(mockAdminUnauth as never);
    const req = createRequest('GET', '/api/knowledge?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with chunks list', async () => {
    vi.mocked(verifyAdminOrClient).mockResolvedValue(mockAdminAuth as never);
    const chunks = [{ _id: 'k1', text: 'Hello', source: 'manual' }];
    vi.mocked(KnowledgeChunk.find).mockReturnValue({
      select: vi.fn().mockReturnValue({ sort: vi.fn().mockResolvedValue(chunks) }),
    } as never);
    const req = createRequest('GET', '/api/knowledge?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.chunks).toHaveLength(1);
  });

  it('returns 403 when client role mismatches clientId', async () => {
    vi.mocked(verifyAdminOrClient).mockResolvedValue({
      authenticated: true,
      role: 'client',
      clientId: 'other',
    } as never);
    const req = createRequest('GET', '/api/knowledge?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });
});

// ========== POST /api/knowledge ==========
describe('POST /api/knowledge', () => {
  let POST: typeof import('@/app/api/knowledge/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/knowledge/route'));
  });

  it('returns 400 when clientId or text is missing', async () => {
    const req = createRequest('POST', '/api/knowledge', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyAdminOrClient).mockResolvedValue(mockAdminUnauth as never);
    const req = createRequest('POST', '/api/knowledge', { clientId: 'c1', text: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 on successful creation', async () => {
    vi.mocked(verifyAdminOrClient).mockResolvedValue(mockAdminAuth as never);
    vi.mocked(KnowledgeChunk.create).mockResolvedValue({ _id: 'k1', text: 'Hello', source: 'manual' } as never);
    const req = createRequest('POST', '/api/knowledge', { clientId: 'c1', text: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.chunks).toHaveLength(1);
  });
});

// ========== DELETE /api/knowledge ==========
describe('DELETE /api/knowledge', () => {
  let DELETE: typeof import('@/app/api/knowledge/route').DELETE;

  beforeEach(async () => {
    ({ DELETE } = await import('@/app/api/knowledge/route'));
  });

  it('returns 400 when id or clientId is missing', async () => {
    const req = createRequest('DELETE', '/api/knowledge?id=k1');
    const res = await DELETE(req);
    expect(res.status).toBe(400);
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyAdminOrClient).mockResolvedValue(mockAdminUnauth as never);
    const req = createRequest('DELETE', '/api/knowledge?id=k1&clientId=c1');
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it('returns 404 when chunk not found', async () => {
    vi.mocked(verifyAdminOrClient).mockResolvedValue(mockAdminAuth as never);
    vi.mocked(KnowledgeChunk.findOneAndDelete).mockResolvedValue(null);
    const req = createRequest('DELETE', '/api/knowledge?id=k1&clientId=c1');
    const res = await DELETE(req);
    expect(res.status).toBe(404);
  });

  it('returns 200 on successful deletion', async () => {
    vi.mocked(verifyAdminOrClient).mockResolvedValue(mockAdminAuth as never);
    vi.mocked(KnowledgeChunk.findOneAndDelete).mockResolvedValue({ _id: 'k1' } as never);
    const req = createRequest('DELETE', '/api/knowledge?id=k1&clientId=c1');
    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ========== POST /api/knowledge/deep-crawl ==========
describe('POST /api/knowledge/deep-crawl', () => {
  let POST: typeof import('@/app/api/knowledge/deep-crawl/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/knowledge/deep-crawl/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyAdmin).mockResolvedValue(mockAdminUnauth as never);
    const req = createRequest('POST', '/api/knowledge/deep-crawl', {
      clientId: 'c1',
      websiteUrl: 'https://example.com',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId or websiteUrl missing', async () => {
    vi.mocked(verifyAdmin).mockResolvedValue(mockAdminAuth as never);
    const req = createRequest('POST', '/api/knowledge/deep-crawl', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 422 when no pages crawled', async () => {
    vi.mocked(verifyAdmin).mockResolvedValue(mockAdminAuth as never);
    vi.mocked(crawlWebsite).mockResolvedValue({
      pages: [],
      totalPages: 0,
      totalChars: 0,
      durationMs: 100,
      strategies: [],
      errors: [],
    } as never);
    const req = createRequest('POST', '/api/knowledge/deep-crawl', {
      clientId: 'c1',
      websiteUrl: 'https://example.com',
    });
    const res = await POST(req);
    expect(res.status).toBe(422);
  });

  it('returns 200 on successful crawl', async () => {
    vi.mocked(verifyAdmin).mockResolvedValue(mockAdminAuth as never);
    vi.mocked(crawlWebsite).mockResolvedValue({
      pages: [{ url: 'https://example.com', title: 'Home', text: 'Content' }],
      totalPages: 1,
      totalChars: 100,
      durationMs: 500,
      strategies: ['bfs'],
      errors: [],
    } as never);
    vi.mocked(KnowledgeChunk.create).mockResolvedValue({ _id: 'k1' } as never);
    const req = createRequest('POST', '/api/knowledge/deep-crawl', {
      clientId: 'c1',
      websiteUrl: 'https://example.com',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ========== GET /api/knowledge/evolution ==========
describe('GET /api/knowledge/evolution', () => {
  let GET: typeof import('@/app/api/knowledge/evolution/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/knowledge/evolution/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUserUnauth);
    const req = createRequest('GET', '/api/knowledge/evolution');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with evolutions list', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUserAuth);
    const evolutions = [
      {
        _id: 'e1',
        clientId: 'c1',
        crawlUrl: 'https://example.com',
        status: 'completed',
        pagesScanned: 5,
        addedChunks: 3,
        removedChunks: 1,
        modifiedChunks: 2,
        autoApplied: true,
        error: null,
        diffs: [1, 2],
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
      },
    ];
    vi.mocked(KnowledgeEvolution.find).mockReturnValue({
      sort: vi
        .fn()
        .mockReturnValue({
          skip: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(evolutions) }) }),
        }),
    } as never);
    vi.mocked(KnowledgeEvolution.countDocuments).mockResolvedValue(1 as never);
    const req = createRequest('GET', '/api/knowledge/evolution');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.evolutions).toHaveLength(1);
  });
});

// ========== POST /api/knowledge/evolution/[clientId] ==========
describe('POST /api/knowledge/evolution/[clientId]', () => {
  let POST: typeof import('@/app/api/knowledge/evolution/[clientId]/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/knowledge/evolution/[clientId]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUserUnauth);
    const req = createRequest('POST', '/api/knowledge/evolution/c1');
    const res = await POST(req, { params: Promise.resolve({ clientId: 'c1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when client not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUserAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue(null) } as never);
    const req = createRequest('POST', '/api/knowledge/evolution/c1', {});
    const res = await POST(req, { params: Promise.resolve({ clientId: 'c1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 400 when client has no website', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUserAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ website: null }) } as never);
    const req = createRequest('POST', '/api/knowledge/evolution/c1', {});
    const res = await POST(req, { params: Promise.resolve({ clientId: 'c1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful evolution trigger', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUserAuth);
    vi.mocked(Client.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue({ website: 'https://example.com' }),
    } as never);
    vi.mocked(evolveKnowledge).mockResolvedValue({
      _id: 'e1',
      status: 'completed',
      pagesScanned: 3,
      addedChunks: 2,
      removedChunks: 0,
      modifiedChunks: 1,
      autoApplied: true,
      diffs: [1],
      error: null,
    } as never);
    const req = createRequest('POST', '/api/knowledge/evolution/c1', {});
    const res = await POST(req, { params: Promise.resolve({ clientId: 'c1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ========== GET /api/knowledge/evolution/[clientId] ==========
describe('GET /api/knowledge/evolution/[clientId]', () => {
  let GET: typeof import('@/app/api/knowledge/evolution/[clientId]/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/knowledge/evolution/[clientId]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUserUnauth);
    const req = createRequest('GET', '/api/knowledge/evolution/c1');
    const res = await GET(req, { params: Promise.resolve({ clientId: 'c1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 200 with evolution history', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUserAuth);
    vi.mocked(getEvolutionHistory).mockResolvedValue([
      {
        _id: 'e1',
        status: 'completed',
        pagesScanned: 3,
        diffs: [],
        addedChunks: 1,
        removedChunks: 0,
        modifiedChunks: 0,
        autoApplied: true,
        error: null,
        startedAt: new Date(),
        completedAt: new Date(),
        createdAt: new Date(),
      },
    ] as never);
    const req = createRequest('GET', '/api/knowledge/evolution/c1');
    const res = await GET(req, { params: Promise.resolve({ clientId: 'c1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.evolutions).toHaveLength(1);
  });
});
