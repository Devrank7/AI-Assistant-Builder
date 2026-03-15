import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyAdmin, mockConnectDB, mockUserFind, mockUserCountDocuments } = vi.hoisted(() => ({
  mockVerifyAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserFind: vi.fn(),
  mockUserCountDocuments: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: {
    find: mockUserFind,
    countDocuments: mockUserCountDocuments,
  },
}));

import { GET } from './route';

describe('GET /api/admin/users', () => {
  const makeChainable = (result: unknown[]) => ({
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
    mockUserCountDocuments.mockResolvedValue(0);
    mockUserFind.mockReturnValue(makeChainable([]));
  });

  it('returns paginated users with metadata', async () => {
    const fakeUsers = [{ _id: 'u1', email: 'a@test.com', name: 'A', plan: 'pro', subscriptionStatus: 'active' }];
    mockUserFind.mockReturnValue(makeChainable(fakeUsers));
    mockUserCountDocuments.mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/admin/users?page=1&limit=20');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.users).toHaveLength(1);
    expect(json.data.total).toBe(1);
    expect(json.data.page).toBe(1);
    expect(json.data.totalPages).toBe(1);
  });

  it('returns empty result when no users match filters', async () => {
    mockUserFind.mockReturnValue(makeChainable([]));
    mockUserCountDocuments.mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/admin/users?plan=pro&status=active');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.users).toEqual([]);
    expect(json.data.total).toBe(0);
  });

  it('applies search filter and returns matching users', async () => {
    const matchedUser = { _id: 'u2', email: 'bob@test.com', name: 'Bob', plan: 'basic', subscriptionStatus: 'trial' };
    mockUserFind.mockReturnValue(makeChainable([matchedUser]));
    mockUserCountDocuments.mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/admin/users?search=bob');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.users[0].email).toBe('bob@test.com');
  });
});
