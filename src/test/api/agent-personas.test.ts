import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---
vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/models/AgentPersona', () => {
  const mock: Record<string, unknown> = {
    find: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndDelete: vi.fn(),
    updateMany: vi.fn(),
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
import AgentPersona from '@/models/AgentPersona';
import Client from '@/models/Client';

// --- Helpers ---
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

// ========== GET /api/agent-personas ==========
describe('GET /api/agent-personas', () => {
  let GET: typeof import('@/app/api/agent-personas/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/agent-personas/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('GET', '/api/agent-personas?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('GET', '/api/agent-personas');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('returns 404 when client not owned by user', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue(null) } as never);
    const req = createRequest('GET', '/api/agent-personas?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it('returns 200 with persona list', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    const personas = [{ _id: 'p1', name: 'Bot A' }];
    vi.mocked(AgentPersona.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(personas) }),
    } as never);
    const req = createRequest('GET', '/api/agent-personas?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });
});

// ========== POST /api/agent-personas ==========
describe('POST /api/agent-personas', () => {
  let POST: typeof import('@/app/api/agent-personas/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/agent-personas/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('POST', '/api/agent-personas', { clientId: 'c1', name: 'Bot' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/agent-personas', { name: 'Bot' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/agent-personas', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 201 on successful creation', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    const created = { _id: 'p1', clientId: 'c1', name: 'Bot', role: 'general' };
    vi.mocked(AgentPersona.create).mockResolvedValue(created as never);
    const req = createRequest('POST', '/api/agent-personas', { clientId: 'c1', name: 'Bot' });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('unsets other defaults when isDefault is true', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    vi.mocked(AgentPersona.create).mockResolvedValue({ _id: 'p1' } as never);
    const req = createRequest('POST', '/api/agent-personas', { clientId: 'c1', name: 'Bot', isDefault: true });
    await POST(req);
    expect(AgentPersona.updateMany).toHaveBeenCalledWith({ clientId: 'c1' }, { isDefault: false });
  });
});

// ========== GET /api/agent-personas/[id] ==========
describe('GET /api/agent-personas/[id]', () => {
  let GET: typeof import('@/app/api/agent-personas/[id]/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/agent-personas/[id]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('GET', '/api/agent-personas/p1');
    const res = await GET(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when persona not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(AgentPersona.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never);
    const req = createRequest('GET', '/api/agent-personas/p1');
    const res = await GET(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 with persona data', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const persona = { _id: 'p1', clientId: 'c1', name: 'Bot' };
    vi.mocked(AgentPersona.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(persona) } as never);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    const req = createRequest('GET', '/api/agent-personas/p1');
    const res = await GET(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.name).toBe('Bot');
  });
});

// ========== PATCH /api/agent-personas/[id] ==========
describe('PATCH /api/agent-personas/[id]', () => {
  let PATCH: typeof import('@/app/api/agent-personas/[id]/route').PATCH;

  beforeEach(async () => {
    ({ PATCH } = await import('@/app/api/agent-personas/[id]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('PATCH', '/api/agent-personas/p1', { name: 'Updated' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when persona not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(AgentPersona.findById).mockResolvedValue(null);
    const req = createRequest('PATCH', '/api/agent-personas/p1', { name: 'Updated' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 on successful update', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const persona = { _id: 'p1', clientId: 'c1', name: 'Bot', save: vi.fn() };
    vi.mocked(AgentPersona.findById).mockResolvedValue(persona as never);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    const req = createRequest('PATCH', '/api/agent-personas/p1', { name: 'Updated' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(200);
    expect(persona.save).toHaveBeenCalled();
  });
});

// ========== DELETE /api/agent-personas/[id] ==========
describe('DELETE /api/agent-personas/[id]', () => {
  let DELETE: typeof import('@/app/api/agent-personas/[id]/route').DELETE;

  beforeEach(async () => {
    ({ DELETE } = await import('@/app/api/agent-personas/[id]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('DELETE', '/api/agent-personas/p1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when persona not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(AgentPersona.findById).mockResolvedValue(null);
    const req = createRequest('DELETE', '/api/agent-personas/p1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 on successful deletion', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const persona = { _id: 'p1', clientId: 'c1' };
    vi.mocked(AgentPersona.findById).mockResolvedValue(persona as never);
    vi.mocked(Client.findOne).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'x' }) } as never);
    vi.mocked(AgentPersona.findByIdAndDelete).mockResolvedValue(persona as never);
    const req = createRequest('DELETE', '/api/agent-personas/p1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 'p1' }) });
    expect(res.status).toBe(200);
    expect(AgentPersona.findByIdAndDelete).toHaveBeenCalledWith('p1');
  });
});

// ========== GET /api/agent-personas/templates ==========
describe('GET /api/agent-personas/templates', () => {
  let GET: typeof import('@/app/api/agent-personas/templates/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/agent-personas/templates/route'));
  });

  it('returns 200 with template list (no auth required)', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  it('includes dental-receptionist template', async () => {
    const res = await GET();
    const json = await res.json();
    const dental = json.data.find((t: { id: string }) => t.id === 'dental-receptionist');
    expect(dental).toBeDefined();
    expect(dental.niche).toBe('dental');
  });

  it('each template has required fields', async () => {
    const res = await GET();
    const json = await res.json();
    for (const tpl of json.data) {
      expect(tpl).toHaveProperty('id');
      expect(tpl).toHaveProperty('name');
      expect(tpl).toHaveProperty('role');
      expect(tpl).toHaveProperty('systemPromptOverlay');
    }
  });
});
