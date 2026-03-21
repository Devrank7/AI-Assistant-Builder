/**
 * Dashboard Safety Tests
 *
 * Tests every API route that dashboard pages depend on to ensure they:
 * 1. Never crash when called without required params
 * 2. Return proper JSON structure (always { success: bool })
 * 3. Handle auth failures gracefully (401, not 500)
 * 4. Return safe defaults for empty/missing data
 *
 * These tests simulate what happens when a user navigates to each dashboard page.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Auth mock ────────────────────────────────────────────────────────
const mockAuth = {
  authenticated: true,
  userId: 'user1',
  user: { email: 'test@test.com', plan: 'pro', subscriptionStatus: 'active' },
  organizationId: 'org1',
  orgRole: 'owner',
};
const mockUnauth = {
  authenticated: false,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};
const mockVerifyUser = vi.fn();

vi.mock('@/lib/auth', () => ({ verifyUser: (...args: unknown[]) => mockVerifyUser(...args) }));
vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

// ── Model mocks ──────────────────────────────────────────────────────
vi.mock('@/models/Client', () => ({
  default: {
    find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    findOne: vi
      .fn()
      .mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
        select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
      }),
  },
}));
vi.mock('@/models/User', () => ({
  default: { findById: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) },
}));
vi.mock('@/models/BuilderSession', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }),
    }),
    findOne: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@/models/Contact', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({ skip: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }),
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@/models/EngagementPrediction', () => ({
  default: {
    find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }),
  },
}));
vi.mock('@/models/KnowledgeChunk', () => ({
  default: { find: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue([]) }) },
}));
vi.mock('@/models/AgentStoreItem', () => ({
  default: {
    find: vi
      .fn()
      .mockReturnValue({
        sort: vi.fn().mockReturnValue({ skip: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }),
      }),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

// ── Service mocks ────────────────────────────────────────────────────
vi.mock('@/lib/predictiveEngagement', () => ({
  listPredictions: vi.fn().mockResolvedValue([]),
  getAccuracyStats: vi.fn().mockResolvedValue({ avgEngagement: 0, interventions: 0, accuracy: 0 }),
  calculateExitProbability: vi.fn(),
  generateNudgeMessage: vi.fn(),
  recordPrediction: vi.fn(),
}));
vi.mock('@/lib/complianceService', () => ({
  getComplianceConfig: vi.fn().mockResolvedValue({
    soc2Enabled: false,
    hipaaMode: false,
    gdprConsent: false,
    dataResidency: 'US',
    auditLogging: true,
    encryptionAtRest: true,
    dataRetentionDays: 90,
    complianceLevel: { soc2: 0, hipaa: 0, gdpr: 0 },
  }),
  updateComplianceConfig: vi.fn(),
}));
vi.mock('@/lib/agentStoreService', () => ({
  listAgents: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, totalPages: 0 }),
  getAgentById: vi.fn().mockResolvedValue(null),
  submitAgent: vi.fn(),
  installAgent: vi.fn(),
  reviewAgent: vi.fn(),
}));
vi.mock('@/models/ResellerAccount', () => ({
  default: { findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) },
}));

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('Dashboard Safety: Auth failures return 401, not 500', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUser.mockResolvedValue(mockUnauth);
  });

  const authProtectedRoutes = [
    { name: 'GET /api/predictions', path: '/api/predictions', file: '@/app/api/predictions/route' },
    {
      name: 'GET /api/predictions/accuracy',
      path: '/api/predictions/accuracy',
      file: '@/app/api/predictions/accuracy/route',
    },
    { name: 'GET /api/compliance', path: '/api/compliance', file: '@/app/api/compliance/route' },
    { name: 'GET /api/agent-store', path: '/api/agent-store', file: '@/app/api/agent-store/route' },
  ];

  for (const route of authProtectedRoutes) {
    it(`${route.name} returns 401 when unauthenticated`, async () => {
      const mod = await import(route.file);
      const res = await mod.GET(createRequest('GET', route.path));
      expect(res.status).toBe(401);
    });
  }
});

describe('Dashboard Safety: Predictions page routes handle missing clientId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUser.mockResolvedValue(mockAuth);
  });

  it('GET /api/predictions returns empty array without clientId', async () => {
    const { GET } = await import('@/app/api/predictions/route');
    const res = await GET(createRequest('GET', '/api/predictions'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });

  it('GET /api/predictions/accuracy returns defaults without clientId', async () => {
    const { GET } = await import('@/app/api/predictions/accuracy/route');
    const res = await GET(createRequest('GET', '/api/predictions/accuracy'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('avgEngagement');
  });
});

describe('Dashboard Safety: Compliance page route returns valid config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUser.mockResolvedValue(mockAuth);
  });

  it('GET /api/compliance returns config with complianceLevel', async () => {
    const { GET } = await import('@/app/api/compliance/route');
    const res = await GET(createRequest('GET', '/api/compliance'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('complianceLevel');
    expect(json.data.complianceLevel).toHaveProperty('soc2');
    expect(json.data.complianceLevel).toHaveProperty('hipaa');
    expect(json.data.complianceLevel).toHaveProperty('gdpr');
  });
});

describe('Dashboard Safety: Agent Store route handles empty DB', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUser.mockResolvedValue(mockAuth);
  });

  it('GET /api/agent-store returns empty list', async () => {
    const { GET } = await import('@/app/api/agent-store/route');
    const res = await GET(createRequest('GET', '/api/agent-store'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('GET /api/agent-store/[id] returns 404 for non-existent agent', async () => {
    const { GET } = await import('@/app/api/agent-store/[id]/route');
    const res = await GET(createRequest('GET', '/api/agent-store/nonexistent'), {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    expect(res.status).toBe(404);
  });

  it('POST /api/agent-store/[id]/review validates rating range', async () => {
    const { POST } = await import('@/app/api/agent-store/[id]/review/route');
    const res = await POST(createRequest('POST', '/api/agent-store/abc/review', { rating: 6 }), {
      params: Promise.resolve({ id: 'abc' }),
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('Rating must be between 1 and 5');
  });
});

describe('Dashboard Safety: Builder sessions handles empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUser.mockResolvedValue(mockAuth);
  });

  it('GET /api/builder/sessions returns empty array', async () => {
    const { GET } = await import('@/app/api/builder/sessions/route');
    const res = await GET(createRequest('GET', '/api/builder/sessions'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data)).toBe(true);
  });
});

describe('Dashboard Safety: API responses always have success field', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyUser.mockResolvedValue(mockAuth);
  });

  it('successResponse always includes success: true', async () => {
    const { successResponse } = await import('@/lib/apiResponse');
    const res = successResponse({ test: 1 });
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual({ test: 1 });
  });

  it('successResponse with empty data still has success: true', async () => {
    const { successResponse } = await import('@/lib/apiResponse');
    const res = successResponse([]);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data).toEqual([]);
  });

  it('Errors.badRequest includes success: false', async () => {
    const { Errors } = await import('@/lib/apiResponse');
    const res = Errors.badRequest('test error');
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe('test error');
  });

  it('Errors.unauthorized returns 401', async () => {
    const { Errors } = await import('@/lib/apiResponse');
    const res = Errors.unauthorized();
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it('Errors.notFound returns 404', async () => {
    const { Errors } = await import('@/lib/apiResponse');
    const res = Errors.notFound('Not found');
    expect(res.status).toBe(404);
  });
});
