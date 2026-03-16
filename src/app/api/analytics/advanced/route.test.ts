// src/app/api/analytics/advanced/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyUser, mockConnectDB, mockGetAnalytics, mockGetQuickStats, mockClientFind } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockGetAnalytics: vi.fn(),
  mockGetQuickStats: vi.fn(),
  mockClientFind: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/lib/analytics', () => ({
  getAnalytics: mockGetAnalytics,
  getQuickStats: mockGetQuickStats,
}));
vi.mock('@/models/Client', () => ({
  default: { find: mockClientFind },
}));

import { GET } from './route';

describe('GET /api/analytics/advanced', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns 401 when not authenticated', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: false,
      response: Response.json({ success: false, error: 'Unauthorized' }, { status: 401 }),
    });
    const req = new NextRequest('http://localhost/api/analytics/advanced');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns aggregated analytics for all user widgets', async () => {
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'user1',
      organizationId: 'org1',
      orgRole: 'owner',
      user: { email: 'a@b.com', plan: 'pro', subscriptionStatus: 'active' },
    });

    mockClientFind.mockReturnValue({
      select: vi.fn().mockResolvedValue([{ clientId: 'w1' }, { clientId: 'w2' }]),
    });

    mockGetQuickStats.mockResolvedValue({ today: 5, week: 30, month: 100 });
    mockGetAnalytics.mockResolvedValue({
      totalChats: 50,
      totalMessages: 200,
      avgMessagesPerChat: 4,
      avgResponseTimeMs: 1200,
      satisfactionPercent: 85,
      feedbackCount: 20,
      dailyStats: [],
      hourlyDistribution: [],
      topQuestions: [],
      channelStats: [],
    });

    const req = new NextRequest('http://localhost/api/analytics/advanced?days=30');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.widgets).toHaveLength(2);
  });
});
