import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/models/AgentRoutingRule', () => {
  const mock: Record<string, unknown> = {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndDelete: vi.fn(),
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
import AgentRoutingRule from '@/models/AgentRoutingRule';
import Client from '@/models/Client';

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

// ========== GET /api/agent-routing ==========
describe('GET /api/agent-routing', () => {
  let GET: typeof import('@/app/api/agent-routing/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/agent-routing/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('GET', '/api/agent-routing?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('GET', '/api/agent-routing');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 404 when client not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue(null) } as never);
    const req = createRequest('GET', '/api/agent-routing?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 200 with rules list', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    const rules = [{ _id: 'r1', name: 'Rule 1', priority: 10 }];
    vi.mocked(AgentRoutingRule.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(rules) }),
    } as never);
    const req = createRequest('GET', '/api/agent-routing?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });
});

// ========== POST /api/agent-routing ==========
describe('POST /api/agent-routing', () => {
  let POST: typeof import('@/app/api/agent-routing/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/agent-routing/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('POST', '/api/agent-routing', { clientId: 'c1', name: 'R', toPersonaId: 'p1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/agent-routing', { name: 'R', toPersonaId: 'p1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/agent-routing', { clientId: 'c1', toPersonaId: 'p1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when toPersonaId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/agent-routing', { clientId: 'c1', name: 'R' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 201 on successful creation', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    const rule = { _id: 'r1', clientId: 'c1', name: 'Rule', toPersonaId: 'p1' };
    vi.mocked(AgentRoutingRule.create).mockResolvedValue(rule as never);
    const req = createRequest('POST', '/api/agent-routing', { clientId: 'c1', name: 'Rule', toPersonaId: 'p1' });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ========== PATCH /api/agent-routing/[id] ==========
describe('PATCH /api/agent-routing/[id]', () => {
  let PATCH: typeof import('@/app/api/agent-routing/[id]/route').PATCH;

  beforeEach(async () => {
    ({ PATCH } = await import('@/app/api/agent-routing/[id]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('PATCH', '/api/agent-routing/r1', { name: 'Updated' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'r1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when rule not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(AgentRoutingRule.findById).mockResolvedValue(null);
    const req = createRequest('PATCH', '/api/agent-routing/r1', { name: 'Updated' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'r1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 on successful update', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const rule = { _id: 'r1', clientId: 'c1', name: 'Rule', save: vi.fn() };
    vi.mocked(AgentRoutingRule.findById).mockResolvedValue(rule as never);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    const req = createRequest('PATCH', '/api/agent-routing/r1', { name: 'Updated' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'r1' }) });
    expect(res.status).toBe(200);
    expect(rule.save).toHaveBeenCalled();
  });
});

// ========== DELETE /api/agent-routing/[id] ==========
describe('DELETE /api/agent-routing/[id]', () => {
  let DELETE: typeof import('@/app/api/agent-routing/[id]/route').DELETE;

  beforeEach(async () => {
    ({ DELETE } = await import('@/app/api/agent-routing/[id]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('DELETE', '/api/agent-routing/r1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'r1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when rule not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(AgentRoutingRule.findById).mockResolvedValue(null);
    const req = createRequest('DELETE', '/api/agent-routing/r1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'r1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 on successful deletion', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const rule = { _id: 'r1', clientId: 'c1' };
    vi.mocked(AgentRoutingRule.findById).mockResolvedValue(rule as never);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    vi.mocked(AgentRoutingRule.findByIdAndDelete).mockResolvedValue(rule as never);
    const req = createRequest('DELETE', '/api/agent-routing/r1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'r1' }) });
    expect(res.status).toBe(200);
    expect(AgentRoutingRule.findByIdAndDelete).toHaveBeenCalledWith('r1');
  });
});
