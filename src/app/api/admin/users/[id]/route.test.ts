import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockVerifyAdmin,
  mockConnectDB,
  mockUserFindById,
  mockUserFindByIdAndUpdate,
  mockClientFind,
  mockChatLogAggregate,
  mockChatLogDeleteMany,
  mockUserDeleteOne,
  mockClientDeleteOne,
} = vi.hoisted(() => ({
  mockVerifyAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockUserFindById: vi.fn(),
  mockUserFindByIdAndUpdate: vi.fn(),
  mockClientFind: vi.fn(),
  mockChatLogAggregate: vi.fn(),
  mockChatLogDeleteMany: vi.fn(),
  mockUserDeleteOne: vi.fn(),
  mockClientDeleteOne: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/User', () => ({
  default: {
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
  },
}));
vi.mock('@/models/Client', () => ({
  default: { find: mockClientFind },
}));
vi.mock('@/models/ChatLog', () => ({
  default: {
    aggregate: mockChatLogAggregate,
    deleteMany: mockChatLogDeleteMany,
  },
}));

import { GET, PATCH, DELETE } from './route';

const PARAMS = { params: Promise.resolve({ id: 'user123' }) };

describe('GET /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns user profile with clients and stats', async () => {
    const fakeUser = { _id: 'user123', email: 'a@test.com', name: 'Alice' };
    const fakeClients = [{ _id: 'c1', clientId: 'client1', name: 'Shop' }];

    mockUserFindById.mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(fakeUser) });
    mockClientFind.mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(fakeClients) });
    mockChatLogAggregate.mockResolvedValue([{ total: 42 }]);

    const req = new NextRequest('http://localhost/api/admin/users/user123');
    const res = await GET(req, PARAMS);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.user.email).toBe('a@test.com');
    expect(json.data.stats.totalMessages).toBe(42);
    expect(json.data.stats.clientsCount).toBe(1);
  });

  it('returns 404 when user not found', async () => {
    mockUserFindById.mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(null) });

    const req = new NextRequest('http://localhost/api/admin/users/user123');
    const res = await GET(req, PARAMS);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });
});

describe('PATCH /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('updates allowed fields and returns updated user', async () => {
    const updatedUser = { _id: 'user123', email: 'a@test.com', plan: 'pro', subscriptionStatus: 'active' };
    mockUserFindByIdAndUpdate.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue(updatedUser),
    });

    const req = new NextRequest('http://localhost/api/admin/users/user123', {
      method: 'PATCH',
      body: JSON.stringify({ plan: 'pro', subscriptionStatus: 'active' }),
    });
    const res = await PATCH(req, PARAMS);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.user.plan).toBe('pro');
  });

  it('returns 400 when no valid fields provided', async () => {
    const req = new NextRequest('http://localhost/api/admin/users/user123', {
      method: 'PATCH',
      body: JSON.stringify({ unknownField: 'value' }),
    });
    const res = await PATCH(req, PARAMS);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('cascades delete and returns success', async () => {
    const fakeClient = { clientId: 'client1', deleteOne: mockClientDeleteOne };
    const fakeUser = { deleteOne: mockUserDeleteOne };

    mockUserFindById.mockResolvedValue(fakeUser);
    mockClientFind.mockResolvedValue([fakeClient]);
    mockChatLogDeleteMany.mockResolvedValue({});
    mockClientDeleteOne.mockResolvedValue({});
    mockUserDeleteOne.mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/admin/users/user123', { method: 'DELETE' });
    const res = await DELETE(req, PARAMS);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockChatLogDeleteMany).toHaveBeenCalledWith({ clientId: 'client1' });
    expect(mockClientDeleteOne).toHaveBeenCalled();
    expect(mockUserDeleteOne).toHaveBeenCalled();
  });

  it('returns 404 when user not found', async () => {
    mockUserFindById.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/admin/users/user123', { method: 'DELETE' });
    const res = await DELETE(req, PARAMS);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });
});
