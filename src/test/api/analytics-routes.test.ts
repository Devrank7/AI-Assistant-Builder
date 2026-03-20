import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
  verifyAdminOrClient: vi.fn(),
}));
vi.mock('@/lib/analytics', () => ({
  getAnalytics: vi.fn(),
  getQuickStats: vi.fn(),
}));
vi.mock('@/lib/advancedAnalytics', () => ({
  getFunnelAnalysis: vi.fn(),
  getCohortRetention: vi.fn(),
  getPredictiveChurnScores: vi.fn(),
  getRevenueAttribution: vi.fn(),
}));
vi.mock('@/lib/analytics/aiQuality', () => ({
  getAIQualityMetrics: vi.fn(),
}));
vi.mock('@/models/Client', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue([]) }),
    findOne: vi.fn().mockReturnValue({ select: vi.fn().mockResolvedValue(null) }),
  };
  return { default: mockModel };
});

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

import { verifyUser, verifyAdminOrClient } from '@/lib/auth';
import { getAnalytics, getQuickStats } from '@/lib/analytics';
import {
  getFunnelAnalysis,
  getCohortRetention,
  getPredictiveChurnScores,
  getRevenueAttribution,
} from '@/lib/advancedAnalytics';
import { getAIQualityMetrics } from '@/lib/analytics/aiQuality';
import Client from '@/models/Client';

const mockVerifyUser = vi.mocked(verifyUser);
const mockVerifyAdminOrClient = vi.mocked(verifyAdminOrClient);

// ─── GET /api/analytics ─────────────────────────────────────────────
describe('GET /api/analytics', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when clientId missing', async () => {
    mockVerifyAdminOrClient.mockResolvedValue({ authenticated: true, role: 'admin' } as never);
    const { GET } = await import('@/app/api/analytics/route');
    const res = await GET(createRequest('GET', '/api/analytics'));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('clientId');
  });

  it('returns 401 when unauthenticated', async () => {
    mockVerifyAdminOrClient.mockResolvedValue({ authenticated: false } as never);
    const { GET } = await import('@/app/api/analytics/route');
    const res = await GET(createRequest('GET', '/api/analytics?clientId=c1'));
    expect(res.status).toBe(401);
  });

  it('returns 403 when client role accesses different clientId', async () => {
    mockVerifyAdminOrClient.mockResolvedValue({ authenticated: true, role: 'client', clientId: 'c2' } as never);
    const { GET } = await import('@/app/api/analytics/route');
    const res = await GET(createRequest('GET', '/api/analytics?clientId=c1'));
    expect(res.status).toBe(403);
  });

  it('returns quick stats when quick=true', async () => {
    mockVerifyAdminOrClient.mockResolvedValue({ authenticated: true, role: 'admin' } as never);
    const stats = { totalChats: 100, totalLeads: 25, avgRating: 4.5 };
    vi.mocked(getQuickStats).mockResolvedValue(stats as never);

    const { GET } = await import('@/app/api/analytics/route');
    const res = await GET(createRequest('GET', '/api/analytics?clientId=c1&quick=true'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.stats).toEqual(stats);
  });

  it('returns full analytics data', async () => {
    mockVerifyAdminOrClient.mockResolvedValue({ authenticated: true, role: 'admin' } as never);
    const analytics = { dailyChats: [10, 20], totalMessages: 500 };
    vi.mocked(getAnalytics).mockResolvedValue(analytics as never);

    const { GET } = await import('@/app/api/analytics/route');
    const res = await GET(createRequest('GET', '/api/analytics?clientId=c1&days=14'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.analytics).toEqual(analytics);
    expect(getAnalytics).toHaveBeenCalledWith('c1', 14, undefined);
  });
});

// ─── GET /api/analytics/funnels ─────────────────────────────────────
describe('GET /api/analytics/funnels', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/analytics/funnels/route');
    const res = await GET(createRequest('GET', '/api/analytics/funnels?clientId=c1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { GET } = await import('@/app/api/analytics/funnels/route');
    const res = await GET(createRequest('GET', '/api/analytics/funnels'));
    expect(res.status).toBe(400);
  });

  it('returns funnel analysis data', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const funnel = {
      stages: [
        { name: 'Visit', count: 1000 },
        { name: 'Chat', count: 200 },
      ],
    };
    vi.mocked(getFunnelAnalysis).mockResolvedValue(funnel as never);

    const { GET } = await import('@/app/api/analytics/funnels/route');
    const res = await GET(createRequest('GET', '/api/analytics/funnels?clientId=c1&days=14'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(funnel);
    expect(getFunnelAnalysis).toHaveBeenCalledWith('c1', 14);
  });

  it('returns 500 when funnel analysis throws', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(getFunnelAnalysis).mockRejectedValue(new Error('DB error') as never);

    const { GET } = await import('@/app/api/analytics/funnels/route');
    const res = await GET(createRequest('GET', '/api/analytics/funnels?clientId=c1'));
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/analytics/cohorts ─────────────────────────────────────
describe('GET /api/analytics/cohorts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/analytics/cohorts/route');
    const res = await GET(createRequest('GET', '/api/analytics/cohorts?clientId=c1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { GET } = await import('@/app/api/analytics/cohorts/route');
    const res = await GET(createRequest('GET', '/api/analytics/cohorts'));
    expect(res.status).toBe(400);
  });

  it('returns cohort retention data', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const cohorts = { weeks: [{ week: '2024-W01', retention: [100, 60, 40] }] };
    vi.mocked(getCohortRetention).mockResolvedValue(cohorts as never);

    const { GET } = await import('@/app/api/analytics/cohorts/route');
    const res = await GET(createRequest('GET', '/api/analytics/cohorts?clientId=c1&weeks=4'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(cohorts);
    expect(getCohortRetention).toHaveBeenCalledWith('c1', 4);
  });

  it('uses default 8 weeks when param not provided', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(getCohortRetention).mockResolvedValue({} as never);

    const { GET } = await import('@/app/api/analytics/cohorts/route');
    await GET(createRequest('GET', '/api/analytics/cohorts?clientId=c1'));
    expect(getCohortRetention).toHaveBeenCalledWith('c1', 8);
  });
});

// ─── GET /api/analytics/predictions ─────────────────────────────────
describe('GET /api/analytics/predictions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/analytics/predictions/route');
    const res = await GET(createRequest('GET', '/api/analytics/predictions?clientId=c1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { GET } = await import('@/app/api/analytics/predictions/route');
    const res = await GET(createRequest('GET', '/api/analytics/predictions'));
    expect(res.status).toBe(400);
  });

  it('returns predictive churn scores', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const predictions = { churnRisk: 0.15, factors: ['low engagement'] };
    vi.mocked(getPredictiveChurnScores).mockResolvedValue(predictions as never);

    const { GET } = await import('@/app/api/analytics/predictions/route');
    const res = await GET(createRequest('GET', '/api/analytics/predictions?clientId=c1'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(predictions);
  });

  it('returns 500 when prediction service throws', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(getPredictiveChurnScores).mockRejectedValue(new Error('ML error') as never);

    const { GET } = await import('@/app/api/analytics/predictions/route');
    const res = await GET(createRequest('GET', '/api/analytics/predictions?clientId=c1'));
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/analytics/revenue ─────────────────────────────────────
describe('GET /api/analytics/revenue', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/analytics/revenue/route');
    const res = await GET(createRequest('GET', '/api/analytics/revenue?clientId=c1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { GET } = await import('@/app/api/analytics/revenue/route');
    const res = await GET(createRequest('GET', '/api/analytics/revenue'));
    expect(res.status).toBe(400);
  });

  it('returns revenue attribution data', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const revenue = { totalRevenue: 5000, sources: [{ name: 'chat', amount: 3000 }] };
    vi.mocked(getRevenueAttribution).mockResolvedValue(revenue as never);

    const { GET } = await import('@/app/api/analytics/revenue/route');
    const res = await GET(createRequest('GET', '/api/analytics/revenue?clientId=c1&days=7'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(revenue);
    expect(getRevenueAttribution).toHaveBeenCalledWith('c1', 7);
  });
});

// ─── GET /api/analytics/ai-quality ──────────────────────────────────
describe('GET /api/analytics/ai-quality', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/analytics/ai-quality/route');
    const res = await GET(createRequest('GET', '/api/analytics/ai-quality'));
    expect(res.status).toBe(401);
  });

  it('returns metrics for a single widget when clientId provided', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue({ clientId: 'c1' }),
    } as never);
    const metrics = { resolutionRate: 85, knowledgeGaps: ['pricing'] };
    vi.mocked(getAIQualityMetrics).mockResolvedValue(metrics as never);

    const { GET } = await import('@/app/api/analytics/ai-quality/route');
    const res = await GET(createRequest('GET', '/api/analytics/ai-quality?clientId=c1&days=14'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(metrics);
  });

  it('returns 404 when widget not found for clientId', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.findOne).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as never);

    const { GET } = await import('@/app/api/analytics/ai-quality/route');
    const res = await GET(createRequest('GET', '/api/analytics/ai-quality?clientId=nonexistent'));
    expect(res.status).toBe(404);
  });

  it('returns aggregated metrics across all widgets when no clientId', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { clientId: 'c1', username: 'Widget 1' },
        { clientId: 'c2', username: 'Widget 2' },
      ]),
    } as never);
    vi.mocked(getAIQualityMetrics)
      .mockResolvedValueOnce({ resolutionRate: 80, knowledgeGaps: ['pricing'] } as never)
      .mockResolvedValueOnce({ resolutionRate: 90, knowledgeGaps: ['hours'] } as never);

    const { GET } = await import('@/app/api/analytics/ai-quality/route');
    const res = await GET(createRequest('GET', '/api/analytics/ai-quality'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.avgResolutionRate).toBe(85);
    expect(json.data.widgets).toHaveLength(2);
  });
});
