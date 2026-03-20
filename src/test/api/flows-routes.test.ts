import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('nanoid', () => ({ nanoid: vi.fn().mockReturnValue('flow_abc123') }));
vi.mock('@/models/Flow', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  };
  return { default: mockModel };
});
vi.mock('@/models/FlowExecution', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
        }),
      }),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    deleteMany: vi.fn(),
  };
  return { default: mockModel };
});
vi.mock('@/models/Client', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue([]) }),
    findOne: vi.fn(),
  };
  return { default: mockModel };
});
vi.mock('@/lib/flows/templates', () => ({
  BUILT_IN_TEMPLATES: [
    { id: 'welcome', name: 'Welcome Flow', trigger: { type: 'first_message' } },
    { id: 'lead-capture', name: 'Lead Capture', trigger: { type: 'keyword' } },
  ],
}));

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

const mockAuth = {
  authenticated: true,
  userId: 'u1',
  organizationId: 'org1',
  orgRole: 'owner',
  user: { email: 'test@test.com' },
};
const mockUnauth = {
  authenticated: false,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

import { verifyUser } from '@/lib/auth';
import Flow from '@/models/Flow';
import FlowExecution from '@/models/FlowExecution';
import Client from '@/models/Client';

const mockVerifyUser = vi.mocked(verifyUser);

// ─── GET /api/flows ─────────────────────────────────────────────────
describe('GET /api/flows', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/flows/route');
    const res = await GET(createRequest('GET', '/api/flows'));
    expect(res.status).toBe(401);
  });

  it('returns empty flows when user has no clients', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    } as never);

    const { GET } = await import('@/app/api/flows/route');
    const res = await GET(createRequest('GET', '/api/flows'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.flows).toEqual([]);
    expect(json.data.total).toBe(0);
  });

  it('returns flows for user clients', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ clientId: 'c1' }]),
    } as never);
    const flows = [{ flowId: 'f1', name: 'Welcome', clientId: 'c1' }];
    vi.mocked(Flow.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(flows) }),
    } as never);

    const { GET } = await import('@/app/api/flows/route');
    const res = await GET(createRequest('GET', '/api/flows'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.flows).toEqual(flows);
    expect(json.data.total).toBe(1);
  });

  it('filters by status parameter', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ clientId: 'c1' }]),
    } as never);
    vi.mocked(Flow.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }),
    } as never);

    const { GET } = await import('@/app/api/flows/route');
    await GET(createRequest('GET', '/api/flows?status=active'));

    expect(Flow.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  });
});

// ─── POST /api/flows ────────────────────────────────────────────────
describe('POST /api/flows', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/flows/route');
    const res = await POST(createRequest('POST', '/api/flows', { name: 'Test' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when missing required fields', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/flows/route');
    const res = await POST(createRequest('POST', '/api/flows', { name: 'Test' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('required');
  });

  it('returns 404 when client not found or not owned', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.findOne).mockResolvedValue(null as never);

    const { POST } = await import('@/app/api/flows/route');
    const res = await POST(
      createRequest('POST', '/api/flows', {
        name: 'Test Flow',
        clientId: 'c1',
        trigger: { type: 'keyword' },
      })
    );
    expect(res.status).toBe(404);
  });

  it('creates flow successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.findOne).mockResolvedValue({ clientId: 'c1' } as never);
    const flow = { flowId: 'flow_abc123', name: 'Test Flow', clientId: 'c1' };
    vi.mocked(Flow.create).mockResolvedValue(flow as never);

    const { POST } = await import('@/app/api/flows/route');
    const res = await POST(
      createRequest('POST', '/api/flows', {
        name: 'Test Flow',
        clientId: 'c1',
        trigger: { type: 'keyword' },
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('created');
  });
});

// ─── PATCH /api/flows/[id] ─────────────────────────────────────────
describe('PATCH /api/flows/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { PATCH } = await import('@/app/api/flows/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/flows/f1', { name: 'Updated' }), {
      params: Promise.resolve({ id: 'f1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when flow not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Flow.findOne).mockResolvedValue(null as never);

    const { PATCH } = await import('@/app/api/flows/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/flows/f1', { name: 'Updated' }), {
      params: Promise.resolve({ id: 'f1' }),
    });
    expect(res.status).toBe(404);
  });

  it('updates flow fields successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const flow = { flowId: 'f1', clientId: 'c1', name: 'Old', save: vi.fn().mockResolvedValue(true) };
    vi.mocked(Flow.findOne).mockResolvedValue(flow as never);
    vi.mocked(Client.findOne).mockResolvedValue({ clientId: 'c1' } as never);

    const { PATCH } = await import('@/app/api/flows/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/flows/f1', { name: 'Updated', status: 'active' }), {
      params: Promise.resolve({ id: 'f1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(flow.save).toHaveBeenCalled();
  });
});

// ─── DELETE /api/flows/[id] ─────────────────────────────────────────
describe('DELETE /api/flows/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { DELETE } = await import('@/app/api/flows/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/flows/f1'), { params: Promise.resolve({ id: 'f1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when flow not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Flow.findOne).mockResolvedValue(null as never);

    const { DELETE } = await import('@/app/api/flows/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/flows/f1'), { params: Promise.resolve({ id: 'f1' }) });
    expect(res.status).toBe(404);
  });

  it('deletes flow and its executions', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Flow.findOne).mockResolvedValue({ flowId: 'f1', clientId: 'c1' } as never);
    vi.mocked(Client.findOne).mockResolvedValue({ clientId: 'c1' } as never);
    vi.mocked(Flow.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);
    vi.mocked(FlowExecution.deleteMany).mockResolvedValue({} as never);

    const { DELETE } = await import('@/app/api/flows/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/flows/f1'), { params: Promise.resolve({ id: 'f1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toContain('deleted');
    expect(Flow.deleteOne).toHaveBeenCalledWith({ flowId: 'f1' });
    expect(FlowExecution.deleteMany).toHaveBeenCalledWith({ flowId: 'f1' });
  });
});

// ─── GET /api/flows/templates ───────────────────────────────────────
describe('GET /api/flows/templates', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns built-in flow templates (no auth required)', async () => {
    const { GET } = await import('@/app/api/flows/templates/route');
    const res = await GET();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.templates).toHaveLength(2);
    expect(json.data.templates[0].id).toBe('welcome');
  });
});

// ─── GET /api/flows/[id]/executions ─────────────────────────────────
describe('GET /api/flows/[id]/executions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/flows/[id]/executions/route');
    const res = await GET(createRequest('GET', '/api/flows/f1/executions'), { params: Promise.resolve({ id: 'f1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when flow not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Flow.findOne).mockResolvedValue(null as never);

    const { GET } = await import('@/app/api/flows/[id]/executions/route');
    const res = await GET(createRequest('GET', '/api/flows/f1/executions'), { params: Promise.resolve({ id: 'f1' }) });
    expect(res.status).toBe(404);
  });

  it('returns paginated executions', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Flow.findOne).mockResolvedValue({ flowId: 'f1', clientId: 'c1' } as never);
    vi.mocked(Client.findOne).mockResolvedValue({ clientId: 'c1' } as never);
    vi.mocked(FlowExecution.countDocuments).mockResolvedValue(5 as never);
    const execs = [{ _id: 'e1', flowId: 'f1', status: 'completed' }];
    vi.mocked(FlowExecution.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(execs) }),
        }),
      }),
    } as never);

    const { GET } = await import('@/app/api/flows/[id]/executions/route');
    const res = await GET(createRequest('GET', '/api/flows/f1/executions?page=1&limit=10'), {
      params: Promise.resolve({ id: 'f1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.executions).toEqual(execs);
    expect(json.data.total).toBe(5);
  });
});
