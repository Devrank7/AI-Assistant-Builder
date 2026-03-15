import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  mockVerifyAdmin,
  mockConnectDB,
  mockClientFindOne,
  mockClientFindOneAndUpdate,
  mockUserFindById,
  mockChatLogCountDocuments,
  mockChatLogDeleteMany,
  mockClientDeleteOne,
} = vi.hoisted(() => ({
  mockVerifyAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockClientFindOne: vi.fn(),
  mockClientFindOneAndUpdate: vi.fn(),
  mockUserFindById: vi.fn(),
  mockChatLogCountDocuments: vi.fn(),
  mockChatLogDeleteMany: vi.fn(),
  mockClientDeleteOne: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/Client', () => ({
  default: {
    findOne: mockClientFindOne,
    findOneAndUpdate: mockClientFindOneAndUpdate,
  },
}));
vi.mock('@/models/User', () => ({
  default: { findById: mockUserFindById },
}));
vi.mock('@/models/ChatLog', () => ({
  default: {
    countDocuments: mockChatLogCountDocuments,
    deleteMany: mockChatLogDeleteMany,
  },
}));

import { GET, PATCH, DELETE } from './route';

const PARAMS = { params: Promise.resolve({ id: 'client1' }) };

describe('GET /api/admin/clients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns client profile with owner and stats', async () => {
    const fakeClient = { _id: 'c1', clientId: 'client1', name: 'Shop', userId: 'u1' };
    const fakeOwner = { _id: 'u1', email: 'owner@test.com', name: 'Owner', plan: 'pro', subscriptionStatus: 'active' };

    mockClientFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(fakeClient) });
    mockUserFindById.mockReturnValue({ select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue(fakeOwner) });
    mockChatLogCountDocuments.mockResolvedValue(5);

    const req = new NextRequest('http://localhost/api/admin/clients/client1');
    const res = await GET(req, PARAMS);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.client.clientId).toBe('client1');
    expect(json.data.owner.email).toBe('owner@test.com');
    expect(json.data.stats.totalSessions).toBe(5);
  });

  it('returns 404 when client not found', async () => {
    mockClientFindOne.mockReturnValue({ lean: vi.fn().mockResolvedValue(null) });

    const req = new NextRequest('http://localhost/api/admin/clients/client1');
    const res = await GET(req, PARAMS);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });
});

describe('PATCH /api/admin/clients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('updates allowed fields and returns updated client', async () => {
    const updatedClient = { _id: 'c1', clientId: 'client1', name: 'New Name', subscriptionStatus: 'active' };
    mockClientFindOneAndUpdate.mockReturnValue({ lean: vi.fn().mockResolvedValue(updatedClient) });

    const req = new NextRequest('http://localhost/api/admin/clients/client1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'New Name', subscriptionStatus: 'active' }),
    });
    const res = await PATCH(req, PARAMS);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.client.name).toBe('New Name');
  });

  it('returns 400 when no valid fields provided', async () => {
    const req = new NextRequest('http://localhost/api/admin/clients/client1', {
      method: 'PATCH',
      body: JSON.stringify({ unknownField: 'value' }),
    });
    const res = await PATCH(req, PARAMS);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });
});

describe('DELETE /api/admin/clients/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('cascades delete and returns success', async () => {
    const fakeClient = { clientId: 'client1', deleteOne: mockClientDeleteOne };
    mockClientFindOne.mockResolvedValue(fakeClient);
    mockChatLogDeleteMany.mockResolvedValue({});
    mockClientDeleteOne.mockResolvedValue({});

    const req = new NextRequest('http://localhost/api/admin/clients/client1', { method: 'DELETE' });
    const res = await DELETE(req, PARAMS);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockChatLogDeleteMany).toHaveBeenCalledWith({ clientId: 'client1' });
  });

  it('returns 404 when client not found', async () => {
    mockClientFindOne.mockResolvedValue(null);

    const req = new NextRequest('http://localhost/api/admin/clients/client1', { method: 'DELETE' });
    const res = await DELETE(req, PARAMS);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.success).toBe(false);
  });
});
