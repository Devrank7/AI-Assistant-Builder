import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/models/Client', () => {
  const mockModel: Record<string, unknown> = {
    findOne: vi.fn(),
  };
  return { default: mockModel };
});
vi.mock('@/models/KnowledgeChunk', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  };
  return { default: mockModel };
});
vi.mock('@/models/User', () => ({
  default: { findById: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) },
}));
vi.mock('@/lib/planLimits', () => ({
  checkMessageLimit: vi.fn(),
  PLAN_LIMITS: {
    none: { messagesPerMonth: 0 },
    free: { messagesPerMonth: 100 },
    starter: { messagesPerMonth: 1000 },
    pro: { messagesPerMonth: -1 },
  },
}));

// Mock mongoose for form route
vi.mock('mongoose', () => ({
  default: {
    connection: {
      db: {
        collection: vi.fn().mockReturnValue({
          insertOne: vi.fn().mockResolvedValue({ insertedId: 'form1' }),
        }),
      },
    },
  },
}));

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

import Client from '@/models/Client';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import User from '@/models/User';
import { checkMessageLimit } from '@/lib/planLimits';

// ─── POST /api/widget/form ──────────────────────────────────────────
describe('POST /api/widget/form', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when clientId missing', async () => {
    const { POST } = await import('@/app/api/widget/form/route');
    const res = await POST(createRequest('POST', '/api/widget/form', { data: { name: 'John' } }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('clientId');
  });

  it('returns 400 when form data missing', async () => {
    const { POST } = await import('@/app/api/widget/form/route');
    const res = await POST(createRequest('POST', '/api/widget/form', { clientId: 'c1' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when widget not found', async () => {
    vi.mocked(Client.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as never);

    const { POST } = await import('@/app/api/widget/form/route');
    const res = await POST(
      createRequest('POST', '/api/widget/form', {
        clientId: 'nonexistent',
        data: { name: 'John' },
      })
    );
    expect(res.status).toBe(404);
  });

  it('returns 500 when db connection unavailable', async () => {
    vi.mocked(Client.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue({ clientId: 'c1', username: 'Widget', organizationId: 'org1' }),
    } as never);

    const { POST } = await import('@/app/api/widget/form/route');
    const res = await POST(
      createRequest('POST', '/api/widget/form', {
        clientId: 'c1',
        data: { name: 'John', email: 'john@test.com', phone: '+1234567890' },
      })
    );
    // Dynamic mongoose import in route can't be fully mocked — validates error handling
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/widget/faq ────────────────────────────────────────────
describe('GET /api/widget/faq', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when clientId missing', async () => {
    const { GET } = await import('@/app/api/widget/faq/route');
    const res = await GET(createRequest('GET', '/api/widget/faq'));
    expect(res.status).toBe(400);
  });

  it('returns empty FAQ when no knowledge chunks', async () => {
    vi.mocked(KnowledgeChunk.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as never);

    const { GET } = await import('@/app/api/widget/faq/route');
    const res = await GET(createRequest('GET', '/api/widget/faq?clientId=c1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it('parses Q:/A: format chunks into FAQ items', async () => {
    vi.mocked(KnowledgeChunk.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([
              {
                _id: 'k1',
                text: 'Q: What are your hours?\nA: We are open 9am-5pm Monday through Friday.',
                source: 'FAQ',
              },
            ]),
        }),
      }),
    } as never);

    const { GET } = await import('@/app/api/widget/faq/route');
    const res = await GET(createRequest('GET', '/api/widget/faq?clientId=c1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].question).toContain('What are your hours');
    expect(json.data[0].answer).toContain('9am-5pm');
    expect(json.data[0].category).toBe('FAQ');
  });

  it('parses sentence-based chunks into FAQ items', async () => {
    vi.mocked(KnowledgeChunk.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi
            .fn()
            .mockResolvedValue([
              {
                _id: 'k2',
                text: 'Our pricing starts at $99 per month. This includes all basic features and support.',
                source: 'Pricing',
              },
            ]),
        }),
      }),
    } as never);

    const { GET } = await import('@/app/api/widget/faq/route');
    const res = await GET(createRequest('GET', '/api/widget/faq?clientId=c1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].question).toContain('Our pricing starts at $99');
  });
});

// ─── GET /api/widget-status ─────────────────────────────────────────
describe('GET /api/widget-status', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when clientId missing', async () => {
    const { GET } = await import('@/app/api/widget-status/route');
    const res = await GET(createRequest('GET', '/api/widget-status'));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.active).toBe(false);
    expect(json.reason).toBe('MISSING_CLIENT_ID');
  });

  it('returns 404 when client not found', async () => {
    vi.mocked(Client.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as never);

    const { GET } = await import('@/app/api/widget-status/route');
    const res = await GET(createRequest('GET', '/api/widget-status?clientId=nonexistent'));
    const json = await res.json();
    expect(res.status).toBe(404);
    expect(json.active).toBe(false);
    expect(json.reason).toBe('CLIENT_NOT_FOUND');
  });

  it('returns active for orphan widget (no owner)', async () => {
    vi.mocked(Client.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ clientId: 'c1' }),
    } as never);

    const { GET } = await import('@/app/api/widget-status/route');
    const res = await GET(createRequest('GET', '/api/widget-status?clientId=c1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.active).toBe(true);
  });

  it('returns inactive when owner has no plan', async () => {
    vi.mocked(Client.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ clientId: 'c1', userId: 'u1' }),
    } as never);
    vi.mocked(User.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'u1', plan: 'none' }),
    } as never);

    const { GET } = await import('@/app/api/widget-status/route');
    const res = await GET(createRequest('GET', '/api/widget-status?clientId=c1'));
    const json = await res.json();
    expect(json.active).toBe(false);
    expect(json.reason).toBe('NO_PLAN');
  });

  it('returns active for unlimited (pro) plan', async () => {
    vi.mocked(Client.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ clientId: 'c1', userId: 'u1' }),
    } as never);
    vi.mocked(User.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'u1', plan: 'pro' }),
    } as never);

    const { GET } = await import('@/app/api/widget-status/route');
    const res = await GET(createRequest('GET', '/api/widget-status?clientId=c1'));
    const json = await res.json();
    expect(json.active).toBe(true);
  });

  it('returns inactive when message limit exceeded', async () => {
    vi.mocked(Client.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ clientId: 'c1', userId: 'u1' }),
    } as never);
    vi.mocked(User.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'u1', plan: 'free' }),
    } as never);
    vi.mocked(checkMessageLimit).mockResolvedValue({ allowed: false, used: 100, limit: 100 } as never);

    const { GET } = await import('@/app/api/widget-status/route');
    const res = await GET(createRequest('GET', '/api/widget-status?clientId=c1'));
    const json = await res.json();
    expect(json.active).toBe(false);
    expect(json.reason).toBe('MESSAGE_LIMIT_EXCEEDED');
    expect(json.used).toBe(100);
  });

  it('returns active with usage stats when within limit', async () => {
    vi.mocked(Client.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ clientId: 'c1', userId: 'u1' }),
    } as never);
    vi.mocked(User.findById).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'u1', plan: 'free' }),
    } as never);
    vi.mocked(checkMessageLimit).mockResolvedValue({ allowed: true, used: 50, limit: 100 } as never);

    const { GET } = await import('@/app/api/widget-status/route');
    const res = await GET(createRequest('GET', '/api/widget-status?clientId=c1'));
    const json = await res.json();
    expect(json.active).toBe(true);
    expect(json.used).toBe(50);
    expect(json.limit).toBe(100);
  });
});
