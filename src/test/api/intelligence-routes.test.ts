import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/models/ConversationInsight', () => {
  const mock: Record<string, unknown> = {
    find: vi.fn(),
    countDocuments: vi.fn(),
  };
  return { default: mock };
});
vi.mock('@/models/CustomerProfile', () => {
  const mock: Record<string, unknown> = {
    aggregate: vi.fn(),
  };
  return { default: mock };
});
vi.mock('@/models/Client', () => {
  const mock: Record<string, unknown> = {
    findOne: vi.fn(),
  };
  return { default: mock };
});

import { verifyUser } from '@/lib/auth';
import ConversationInsight from '@/models/ConversationInsight';
import CustomerProfile from '@/models/CustomerProfile';
import Client from '@/models/Client';

function createRequest(method: string, url: string) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), { method });
}

const mockAuth = {
  authenticated: true as const,
  userId: 'u1',
  user: { email: 'test@test.com', plan: 'pro', subscriptionStatus: 'active' },
  organizationId: 'org1',
  orgRole: 'owner',
};

const mockUnauth = {
  authenticated: false as const,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ========== GET /api/intelligence/dashboard ==========
describe('GET /api/intelligence/dashboard', () => {
  let GET: typeof import('@/app/api/intelligence/dashboard/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/intelligence/dashboard/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('GET', '/api/intelligence/dashboard?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('GET', '/api/intelligence/dashboard');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when client not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue(null) } as never);
    const req = createRequest('GET', '/api/intelligence/dashboard?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 200 with aggregated dashboard data', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    vi.mocked(ConversationInsight.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.mocked(CustomerProfile.aggregate).mockResolvedValue([{ count: 10, avgBuying: 50, avgChurn: 20 }] as never);
    const req = createRequest('GET', '/api/intelligence/dashboard?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('summary');
    expect(json.data).toHaveProperty('topIntents');
    expect(json.data).toHaveProperty('sentimentDistribution');
  });

  it('handles custom days parameter', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    vi.mocked(ConversationInsight.find).mockReturnValue({ lean: vi.fn().mockResolvedValue([]) } as never);
    vi.mocked(CustomerProfile.aggregate).mockResolvedValue([] as never);
    const req = createRequest('GET', '/api/intelligence/dashboard?clientId=c1&days=7');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.summary.satisfaction).toBe(50); // default when no data
  });
});

// ========== GET /api/intelligence/signals ==========
describe('GET /api/intelligence/signals', () => {
  let GET: typeof import('@/app/api/intelligence/signals/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/intelligence/signals/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('GET', '/api/intelligence/signals?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('GET', '/api/intelligence/signals');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when client not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue(null) } as never);
    const req = createRequest('GET', '/api/intelligence/signals?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 200 with paginated signals', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    const signals = [{ _id: 's1', type: 'intent', label: 'pricing' }];
    vi.mocked(ConversationInsight.find).mockReturnValue({
      sort: vi
        .fn()
        .mockReturnValue({
          skip: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(signals) }) }),
        }),
    } as never);
    vi.mocked(ConversationInsight.countDocuments).mockResolvedValue(1 as never);
    const req = createRequest('GET', '/api/intelligence/signals?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.signals).toHaveLength(1);
    expect(json.data.pagination).toHaveProperty('total');
    expect(json.data.pagination).toHaveProperty('totalPages');
  });

  it('respects pagination parameters', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    vi.mocked(ConversationInsight.find).mockReturnValue({
      sort: vi
        .fn()
        .mockReturnValue({
          skip: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
        }),
    } as never);
    vi.mocked(ConversationInsight.countDocuments).mockResolvedValue(50 as never);
    const req = createRequest('GET', '/api/intelligence/signals?clientId=c1&page=3&limit=10&type=intent');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.pagination.page).toBe(3);
    expect(json.data.pagination.limit).toBe(10);
    expect(json.data.pagination.totalPages).toBe(5);
  });
});
