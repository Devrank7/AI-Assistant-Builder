import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyAdmin, mockConnectDB, mockUserFind, mockClientFind } = vi.hoisted(() => ({
  mockVerifyAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserFind: vi.fn(),
  mockClientFind: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: { find: mockUserFind },
}));
vi.mock('@/models/Client', () => ({
  default: { find: mockClientFind },
}));

import { GET } from './route';

describe('GET /api/admin/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns empty arrays when query is too short (< 2 chars)', async () => {
    const req = new NextRequest('http://localhost/api/admin/search?q=a');
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.users).toEqual([]);
    expect(json.data.clients).toEqual([]);
  });

  it('returns empty arrays when query is missing', async () => {
    const req = new NextRequest('http://localhost/api/admin/search');
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.users).toEqual([]);
    expect(json.data.clients).toEqual([]);
  });

  it('returns matched users and clients for a valid query', async () => {
    const fakeUser = { _id: 'u1', email: 'alice@test.com', name: 'Alice', plan: 'pro', subscriptionStatus: 'active' };
    const fakeClient = {
      _id: 'c1',
      clientId: 'client1',
      username: 'alice-shop',
      website: 'alice.com',
      subscriptionStatus: 'active',
      userId: 'u1',
    };

    const userChainable = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([fakeUser]),
    };
    const clientChainable = {
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([fakeClient]),
    };
    const ownerChainable = {
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([{ _id: 'u1', email: 'alice@test.com' }]),
    };

    mockUserFind.mockReturnValueOnce(userChainable).mockReturnValueOnce(ownerChainable);
    mockClientFind.mockReturnValue(clientChainable);

    const req = new NextRequest('http://localhost/api/admin/search?q=alice');
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.users).toHaveLength(1);
    expect(json.data.users[0].email).toBe('alice@test.com');
    expect(json.data.clients).toHaveLength(1);
    expect(json.data.clients[0].ownerEmail).toBe('alice@test.com');
  });
});
