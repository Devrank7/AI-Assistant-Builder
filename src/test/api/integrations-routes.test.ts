import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
  applyRateLimit: vi.fn().mockReturnValue(null),
}));
vi.mock('@/lib/encryption', () => ({
  encrypt: vi.fn().mockReturnValue('encrypted_value'),
}));

const mockPlugin = {
  connect: vi.fn().mockResolvedValue({ success: true, metadata: { account: 'test' } }),
  testConnection: vi.fn().mockResolvedValue({ success: true, latency: 42 }),
};
const mockPluginRegistry = {
  getAllManifests: vi
    .fn()
    .mockReturnValue([{ slug: 'google-sheets', name: 'Google Sheets', actions: ['read', 'write'] }]),
  get: vi.fn().mockReturnValue(mockPlugin),
  executeAction: vi.fn().mockResolvedValue({ success: true, data: { rows: [] } }),
};
vi.mock('@/lib/integrations/core/PluginRegistry', () => ({
  pluginRegistry: mockPluginRegistry,
}));
vi.mock('@/models/Integration', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    findOne: vi.fn(),
    create: vi.fn(),
  };
  return { default: mockModel };
});
vi.mock('@/models/WidgetIntegration', () => ({
  default: { deleteMany: vi.fn() },
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
  user: { email: 'test@test.com', plan: 'pro' },
};
const mockUnauth = {
  authenticated: false,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

import { verifyUser } from '@/lib/auth';
import Integration from '@/models/Integration';
import WidgetIntegration from '@/models/WidgetIntegration';

const mockVerifyUser = vi.mocked(verifyUser);

// ─── GET /api/integrations ──────────────────────────────────────────
describe('GET /api/integrations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/integrations/route');
    const res = await GET(createRequest('GET', '/api/integrations'));
    expect(res.status).toBe(401);
  });

  it('returns all integration manifests', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { GET } = await import('@/app/api/integrations/route');
    const res = await GET(createRequest('GET', '/api/integrations'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].slug).toBe('google-sheets');
  });
});

// ─── POST /api/integrations/connect ─────────────────────────────────
describe('POST /api/integrations/connect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/integrations/connect/route');
    const res = await POST(createRequest('POST', '/api/integrations/connect', { slug: 'test', credentials: {} }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not on pro plan', async () => {
    mockVerifyUser.mockResolvedValue({ ...mockAuth, user: { ...mockAuth.user, plan: 'free' } } as never);
    const { POST } = await import('@/app/api/integrations/connect/route');
    const res = await POST(createRequest('POST', '/api/integrations/connect', { slug: 'test', credentials: {} }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when slug or credentials missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/integrations/connect/route');
    const res = await POST(createRequest('POST', '/api/integrations/connect', { slug: 'test' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('required');
  });

  it('returns 400 for unknown integration slug', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockPluginRegistry.get.mockReturnValueOnce(null);

    const { POST } = await import('@/app/api/integrations/connect/route');
    const res = await POST(
      createRequest('POST', '/api/integrations/connect', {
        slug: 'unknown',
        credentials: { apiKey: 'key123' },
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 when already connected', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockPluginRegistry.get.mockReturnValue(mockPlugin);
    vi.mocked(Integration.findOne).mockResolvedValue({ _id: 'existing' } as never);

    const { POST } = await import('@/app/api/integrations/connect/route');
    const res = await POST(
      createRequest('POST', '/api/integrations/connect', {
        slug: 'google-sheets',
        credentials: { apiKey: 'key123' },
      })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('already connected');
  });

  it('connects integration and returns connectionId', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockPluginRegistry.get.mockReturnValue(mockPlugin);
    vi.mocked(Integration.findOne).mockResolvedValue(null as never);
    vi.mocked(Integration.create).mockResolvedValue({ _id: 'conn1' } as never);

    const { POST } = await import('@/app/api/integrations/connect/route');
    const res = await POST(
      createRequest('POST', '/api/integrations/connect', {
        slug: 'google-sheets',
        credentials: { apiKey: 'key123' },
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.connectionId).toBe('conn1');
    expect(json.message).toContain('Connected');
  });
});

// ─── POST /api/integrations/disconnect ──────────────────────────────
describe('POST /api/integrations/disconnect', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/integrations/disconnect/route');
    const res = await POST(createRequest('POST', '/api/integrations/disconnect', { connectionId: 'c1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when connectionId missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/integrations/disconnect/route');
    const res = await POST(createRequest('POST', '/api/integrations/disconnect', {}));
    expect(res.status).toBe(400);
  });

  it('returns 404 when connection not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Integration.findOne).mockResolvedValue(null as never);

    const { POST } = await import('@/app/api/integrations/disconnect/route');
    const res = await POST(createRequest('POST', '/api/integrations/disconnect', { connectionId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });

  it('disconnects integration and cleans up widget bindings', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const connection = {
      _id: 'conn1',
      userId: 'u1',
      status: 'connected',
      accessToken: 'token',
      refreshToken: 'refresh',
      save: vi.fn().mockResolvedValue(true),
    };
    vi.mocked(Integration.findOne).mockResolvedValue(connection as never);
    vi.mocked(WidgetIntegration.deleteMany).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/integrations/disconnect/route');
    const res = await POST(createRequest('POST', '/api/integrations/disconnect', { connectionId: 'conn1' }));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toContain('Disconnected');
    expect(connection.save).toHaveBeenCalled();
  });
});

// ─── POST /api/integrations/execute ─────────────────────────────────
describe('POST /api/integrations/execute', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/integrations/execute/route');
    const res = await POST(
      createRequest('POST', '/api/integrations/execute', { widgetId: 'w1', slug: 's', action: 'a' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/integrations/execute/route');
    const res = await POST(createRequest('POST', '/api/integrations/execute', { widgetId: 'w1' }));
    expect(res.status).toBe(400);
  });

  it('executes action successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockPluginRegistry.executeAction.mockResolvedValue({ success: true, data: { rows: [1, 2, 3] } });

    const { POST } = await import('@/app/api/integrations/execute/route');
    const res = await POST(
      createRequest('POST', '/api/integrations/execute', {
        widgetId: 'w1',
        slug: 'google-sheets',
        action: 'read',
        params: { range: 'A1:B10' },
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.rows).toEqual([1, 2, 3]);
  });

  it('returns 400 when action execution fails', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockPluginRegistry.executeAction.mockResolvedValue({ success: false, error: 'Rate limited' });

    const { POST } = await import('@/app/api/integrations/execute/route');
    const res = await POST(
      createRequest('POST', '/api/integrations/execute', {
        widgetId: 'w1',
        slug: 'google-sheets',
        action: 'read',
      })
    );
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/integrations/test ────────────────────────────────────
describe('POST /api/integrations/test', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/integrations/test/route');
    const res = await POST(createRequest('POST', '/api/integrations/test', { slug: 's', credentials: {} }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when slug or credentials missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/integrations/test/route');
    const res = await POST(createRequest('POST', '/api/integrations/test', { slug: 'test' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for unknown plugin', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockPluginRegistry.get.mockReturnValueOnce(null);

    const { POST } = await import('@/app/api/integrations/test/route');
    const res = await POST(
      createRequest('POST', '/api/integrations/test', {
        slug: 'nonexistent',
        credentials: { apiKey: 'key' },
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns test connection result', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockPluginRegistry.get.mockReturnValue(mockPlugin);

    const { POST } = await import('@/app/api/integrations/test/route');
    const res = await POST(
      createRequest('POST', '/api/integrations/test', {
        slug: 'google-sheets',
        credentials: { apiKey: 'key' },
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.success).toBe(true);
  });
});

// ─── GET /api/integrations/health ───────────────────────────────────
describe('GET /api/integrations/health', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/integrations/health/route');
    const res = await GET(createRequest('GET', '/api/integrations/health'));
    expect(res.status).toBe(401);
  });

  it('returns health status for user integrations', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const connections = [{ provider: 'google-sheets', status: 'connected', isActive: true }];
    vi.mocked(Integration.find).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(connections) }),
    } as never);

    const { GET } = await import('@/app/api/integrations/health/route');
    const res = await GET(createRequest('GET', '/api/integrations/health'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(connections);
  });
});

// ─── GET /api/integrations/connections ──────────────────────────────
describe('GET /api/integrations/connections', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/integrations/connections/route');
    const res = await GET(createRequest('GET', '/api/integrations/connections'));
    expect(res.status).toBe(401);
  });

  it('returns active connections (excludes disconnected)', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const connections = [{ provider: 'google-sheets', status: 'connected' }];
    vi.mocked(Integration.find).mockReturnValue({
      select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(connections) }),
    } as never);

    const { GET } = await import('@/app/api/integrations/connections/route');
    const res = await GET(createRequest('GET', '/api/integrations/connections'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(connections);
  });
});
