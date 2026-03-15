import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyAdmin, mockConnectDB, mockClientFind, mockClientCountDocuments, mockUserFind } = vi.hoisted(() => ({
  mockVerifyAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockClientFind: vi.fn(),
  mockClientCountDocuments: vi.fn(),
  mockUserFind: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/Client', () => ({
  default: {
    find: mockClientFind,
    countDocuments: mockClientCountDocuments,
  },
}));
vi.mock('@/models/User', () => ({
  default: { find: mockUserFind },
}));

import { GET } from './route';

describe('GET /api/admin/clients', () => {
  const makeClientChainable = (result: unknown[]) => ({
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
  });

  const makeOwnerChainable = (result: unknown[]) => ({
    select: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue(result),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
    mockClientCountDocuments.mockResolvedValue(0);
    mockClientFind.mockReturnValue(makeClientChainable([]));
    mockUserFind.mockReturnValue(makeOwnerChainable([]));
  });

  it('returns paginated clients with metadata', async () => {
    const fakeClients = [{ _id: 'c1', clientId: 'client1', name: 'Shop', userId: 'u1' }];
    mockClientFind.mockReturnValue(makeClientChainable(fakeClients));
    mockClientCountDocuments.mockResolvedValue(1);
    mockUserFind.mockReturnValue(makeOwnerChainable([{ _id: 'u1', email: 'owner@test.com' }]));

    const req = new NextRequest('http://localhost/api/admin/clients?page=1&limit=20');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.clients).toHaveLength(1);
    expect(json.data.total).toBe(1);
    expect(json.data.page).toBe(1);
    expect(json.data.clients[0].ownerEmail).toBe('owner@test.com');
  });

  it('returns empty result when no clients exist', async () => {
    mockClientFind.mockReturnValue(makeClientChainable([]));
    mockClientCountDocuments.mockResolvedValue(0);

    const req = new NextRequest('http://localhost/api/admin/clients');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.clients).toEqual([]);
    expect(json.data.total).toBe(0);
  });

  it('applies clientType filter', async () => {
    const fakeClients = [{ _id: 'c2', clientId: 'client2', name: 'Quick', userId: null, clientType: 'quick' }];
    mockClientFind.mockReturnValue(makeClientChainable(fakeClients));
    mockClientCountDocuments.mockResolvedValue(1);

    const req = new NextRequest('http://localhost/api/admin/clients?clientType=quick');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.clients).toHaveLength(1);
  });
});
