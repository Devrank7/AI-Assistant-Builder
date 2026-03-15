import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyAdmin, mockConnectDB, mockUserFind, mockUserCountDocuments, mockClientAggregate } = vi.hoisted(
  () => ({
    mockVerifyAdmin: vi.fn(),
    mockConnectDB: vi.fn(),
    mockUserFind: vi.fn(),
    mockUserCountDocuments: vi.fn(),
    mockClientAggregate: vi.fn(),
  })
);

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: {
    find: mockUserFind,
    countDocuments: mockUserCountDocuments,
  },
}));
vi.mock('@/models/Client', () => ({
  default: { aggregate: mockClientAggregate },
}));

import { GET } from './route';

describe('GET /api/admin/subscriptions', () => {
  const makeUserChainable = (result: unknown[]) => ({
    select: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
    mockUserFind.mockReturnValue(makeUserChainable([]));
    mockUserCountDocuments.mockResolvedValue(0);
    mockClientAggregate.mockResolvedValue([]);
  });

  it('returns summary and users list', async () => {
    const fakeUsers = [{ _id: 'u1', email: 'a@test.com', plan: 'pro', subscriptionStatus: 'active' }];
    mockUserFind.mockReturnValue(makeUserChainable(fakeUsers));
    // Call order: countDocuments(filter/total), countDocuments(active), countDocuments(trial), countDocuments(past_due)
    mockUserCountDocuments
      .mockResolvedValueOnce(1) // total (from Promise.all)
      .mockResolvedValueOnce(5) // activeCount
      .mockResolvedValueOnce(2) // trialsExpiringThisWeek
      .mockResolvedValueOnce(1); // pastDueCount
    mockClientAggregate.mockResolvedValue([{ _id: 'u1', count: 3 }]);

    const req = new NextRequest('http://localhost/api/admin/subscriptions');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.summary).toBeDefined();
    expect(json.data.summary.activeSubscriptions).toBe(5);
    expect(json.data.summary.trialsExpiringThisWeek).toBe(2);
    expect(json.data.summary.pastDue).toBe(1);
    expect(json.data.users).toHaveLength(1);
  });

  it('returns zero summary when no users exist', async () => {
    mockUserFind.mockReturnValue(makeUserChainable([]));
    mockUserCountDocuments.mockResolvedValue(0);
    mockClientAggregate.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/admin/subscriptions');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.users).toEqual([]);
    expect(json.data.summary.mrr).toBe(0);
  });

  it('calculates MRR from user plans', async () => {
    const fakeUsers = [
      { _id: 'u1', email: 'a@test.com', plan: 'pro', subscriptionStatus: 'active' },
      { _id: 'u2', email: 'b@test.com', plan: 'basic', subscriptionStatus: 'active' },
    ];
    mockUserFind.mockReturnValue(makeUserChainable(fakeUsers));
    mockUserCountDocuments.mockResolvedValue(2);
    mockClientAggregate.mockResolvedValue([]);

    const req = new NextRequest('http://localhost/api/admin/subscriptions');
    const res = await GET(req);
    const json = await res.json();

    // pro = 79, basic = 29 → total = 108
    expect(json.data.summary.mrr).toBe(108);
  });
});
