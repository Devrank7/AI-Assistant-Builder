import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/agentStoreService', () => ({
  listAgents: vi.fn(),
  submitAgent: vi.fn(),
  getAgentById: vi.fn(),
  installAgent: vi.fn(),
  reviewAgent: vi.fn(),
}));

import { verifyUser } from '@/lib/auth';
import { listAgents, submitAgent, getAgentById, installAgent, reviewAgent } from '@/lib/agentStoreService';

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
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

// ========== GET /api/agent-store ==========
describe('GET /api/agent-store', () => {
  let GET: typeof import('@/app/api/agent-store/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/agent-store/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('GET', '/api/agent-store');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with agents list', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const agents = { agents: [{ _id: 'a1', name: 'Agent' }], total: 1 };
    vi.mocked(listAgents).mockResolvedValue(agents as never);
    const req = createRequest('GET', '/api/agent-store');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('passes filter params to listAgents', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(listAgents).mockResolvedValue({ agents: [], total: 0 } as never);
    const req = createRequest('GET', '/api/agent-store?category=sales&niche=dental&sort=popular&page=2&limit=10');
    await GET(req);
    expect(listAgents).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'sales',
        niche: 'dental',
        sort: 'popular',
        page: 2,
        limit: 10,
      })
    );
  });
});

// ========== POST /api/agent-store ==========
describe('POST /api/agent-store', () => {
  let POST: typeof import('@/app/api/agent-store/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/agent-store/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('POST', '/api/agent-store', {
      name: 'A',
      description: 'D',
      niche: 'N',
      systemPrompt: 'S',
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/agent-store', { name: 'A' });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Missing required fields');
  });

  it('returns 200 on successful submission', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(submitAgent).mockResolvedValue({ _id: 'a1', name: 'Bot' } as never);
    const req = createRequest('POST', '/api/agent-store', {
      name: 'Bot',
      description: 'Desc',
      niche: 'dental',
      systemPrompt: 'Be helpful',
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ========== GET /api/agent-store/[id] ==========
describe('GET /api/agent-store/[id]', () => {
  let GET: typeof import('@/app/api/agent-store/[id]/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/agent-store/[id]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('GET', '/api/agent-store/a1');
    const res = await GET(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when agent not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(getAgentById).mockResolvedValue(null as never);
    const req = createRequest('GET', '/api/agent-store/a1');
    const res = await GET(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 with agent data', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(getAgentById).mockResolvedValue({ _id: 'a1', name: 'Bot' } as never);
    const req = createRequest('GET', '/api/agent-store/a1');
    const res = await GET(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe('Bot');
  });
});

// ========== POST /api/agent-store/[id]/install ==========
describe('POST /api/agent-store/[id]/install', () => {
  let POST: typeof import('@/app/api/agent-store/[id]/install/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/agent-store/[id]/install/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('POST', '/api/agent-store/a1/install');
    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when agent not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(installAgent).mockResolvedValue(null as never);
    const req = createRequest('POST', '/api/agent-store/a1/install');
    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 on successful install', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(installAgent).mockResolvedValue({ _id: 'a1', name: 'Bot', installCount: 1 } as never);
    const req = createRequest('POST', '/api/agent-store/a1/install');
    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ========== POST /api/agent-store/[id]/review ==========
describe('POST /api/agent-store/[id]/review', () => {
  let POST: typeof import('@/app/api/agent-store/[id]/review/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/agent-store/[id]/review/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('POST', '/api/agent-store/a1/review', { rating: 5 });
    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 400 when rating is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/agent-store/a1/review', {});
    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('Rating must be between 1 and 5');
  });

  it('returns 400 when rating is below 1', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/agent-store/a1/review', { rating: 0 });
    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 400 when rating is above 5', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/agent-store/a1/review', { rating: 6 });
    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful review', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(reviewAgent).mockResolvedValue({ _id: 'a1', rating: 4.5 } as never);
    const req = createRequest('POST', '/api/agent-store/a1/review', { rating: 5, review: 'Great!' });
    const res = await POST(req, { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});
