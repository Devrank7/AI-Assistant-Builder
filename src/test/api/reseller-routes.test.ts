import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/resellerService', () => ({
  createResellerAccount: vi.fn(),
  createSubAccount: vi.fn(),
  getSubAccounts: vi.fn(),
  getResellerDashboard: vi.fn(),
}));
vi.mock('@/models/ResellerAccount', () => ({
  default: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
  },
}));
vi.mock('@/models/Organization', () => ({
  default: {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
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
  user: { email: 'test@test.com', plan: 'enterprise' },
};
const mockUnauth = {
  authenticated: false,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

import { verifyUser } from '@/lib/auth';
import { createResellerAccount, createSubAccount, getSubAccounts, getResellerDashboard } from '@/lib/resellerService';
import ResellerAccount from '@/models/ResellerAccount';
import Organization from '@/models/Organization';

const mockVerifyUser = vi.mocked(verifyUser);
const mockCreateReseller = vi.mocked(createResellerAccount);
const mockCreateSub = vi.mocked(createSubAccount);
const mockGetSubs = vi.mocked(getSubAccounts);
const mockGetDashboard = vi.mocked(getResellerDashboard);

describe('GET /api/reseller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/reseller/route');
    const res = await GET(createRequest('GET', '/api/reseller'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when no organizationId', async () => {
    mockVerifyUser.mockResolvedValue({ ...mockAuth, organizationId: undefined } as never);
    const { GET } = await import('@/app/api/reseller/route');
    const res = await GET(createRequest('GET', '/api/reseller'));
    expect(res.status).toBe(400);
  });

  it('returns 404 when reseller not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(ResellerAccount.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never);

    const { GET } = await import('@/app/api/reseller/route');
    const res = await GET(createRequest('GET', '/api/reseller'));
    expect(res.status).toBe(404);
  });

  it('returns reseller account', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const account = { _id: 'r1', organizationId: 'org1', name: 'Reseller Co' };
    vi.mocked(ResellerAccount.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue(account) } as never);

    const { GET } = await import('@/app/api/reseller/route');
    const res = await GET(createRequest('GET', '/api/reseller'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(account);
  });
});

describe('POST /api/reseller', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/reseller/route');
    const res = await POST(createRequest('POST', '/api/reseller', { name: 'Test', email: 'a@b.com', company: 'Co' }));
    expect(res.status).toBe(401);
  });

  it('returns 403 when plan is not enterprise/business', async () => {
    mockVerifyUser.mockResolvedValue({ ...mockAuth, user: { ...mockAuth.user, plan: 'free' } } as never);
    const { POST } = await import('@/app/api/reseller/route');
    const res = await POST(createRequest('POST', '/api/reseller', { name: 'Test', email: 'a@b.com', company: 'Co' }));
    expect(res.status).toBe(403);
  });

  it('returns 400 when required fields missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/reseller/route');
    const res = await POST(createRequest('POST', '/api/reseller', { name: 'Test' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('Missing required fields');
  });

  it('creates reseller account', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const account = { _id: 'r1', name: 'Test Reseller' };
    mockCreateReseller.mockResolvedValue(account as never);

    const { POST } = await import('@/app/api/reseller/route');
    const res = await POST(createRequest('POST', '/api/reseller', { name: 'Test', email: 'a@b.com', company: 'Co' }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Reseller account created');
  });
});

describe('GET /api/reseller/sub-accounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/reseller/sub-accounts/route');
    const res = await GET(createRequest('GET', '/api/reseller/sub-accounts'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when reseller not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(ResellerAccount.findOne).mockResolvedValue(null as never);

    const { GET } = await import('@/app/api/reseller/sub-accounts/route');
    const res = await GET(createRequest('GET', '/api/reseller/sub-accounts'));
    expect(res.status).toBe(404);
  });

  it('returns sub-accounts', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(ResellerAccount.findOne).mockResolvedValue({ _id: 'r1' } as never);
    mockGetSubs.mockResolvedValue([{ name: 'Sub 1' }] as never);

    const { GET } = await import('@/app/api/reseller/sub-accounts/route');
    const res = await GET(createRequest('GET', '/api/reseller/sub-accounts'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toHaveLength(1);
  });
});

describe('POST /api/reseller/sub-accounts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when name/email missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(ResellerAccount.findOne).mockResolvedValue({ _id: 'r1' } as never);

    const { POST } = await import('@/app/api/reseller/sub-accounts/route');
    const res = await POST(createRequest('POST', '/api/reseller/sub-accounts', { name: 'Test' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('name, email');
  });

  it('creates sub-account', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(ResellerAccount.findOne).mockResolvedValue({ _id: 'r1' } as never);
    mockCreateSub.mockResolvedValue({ name: 'Sub 1', email: 'sub@test.com' } as never);

    const { POST } = await import('@/app/api/reseller/sub-accounts/route');
    const res = await POST(
      createRequest('POST', '/api/reseller/sub-accounts', { name: 'Sub 1', email: 'sub@test.com' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Sub-account created');
  });
});

describe('DELETE /api/reseller/sub-accounts/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { DELETE } = await import('@/app/api/reseller/sub-accounts/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/reseller/sub-accounts/sub1'), {
      params: Promise.resolve({ id: 'sub1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 400 when no organizationId', async () => {
    mockVerifyUser.mockResolvedValue({ ...mockAuth, organizationId: undefined } as never);
    const { DELETE } = await import('@/app/api/reseller/sub-accounts/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/reseller/sub-accounts/sub1'), {
      params: Promise.resolve({ id: 'sub1' }),
    });
    expect(res.status).toBe(400);
  });

  it('removes sub-account', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(ResellerAccount.updateOne).mockResolvedValue({} as never);

    const { DELETE } = await import('@/app/api/reseller/sub-accounts/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/reseller/sub-accounts/sub1'), {
      params: Promise.resolve({ id: 'sub1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Sub-account removed');
  });
});

describe('GET /api/reseller/earnings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/reseller/earnings/route');
    const res = await GET(createRequest('GET', '/api/reseller/earnings'));
    expect(res.status).toBe(401);
  });

  it('returns 404 when reseller not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(ResellerAccount.findOne).mockResolvedValue(null as never);

    const { GET } = await import('@/app/api/reseller/earnings/route');
    const res = await GET(createRequest('GET', '/api/reseller/earnings'));
    expect(res.status).toBe(404);
  });

  it('returns earnings dashboard data', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(ResellerAccount.findOne).mockResolvedValue({ _id: 'r1' } as never);
    const dashboard = { totalEarnings: 5000, monthlyEarnings: 1200, subAccountCount: 5 };
    mockGetDashboard.mockResolvedValue(dashboard as never);

    const { GET } = await import('@/app/api/reseller/earnings/route');
    const res = await GET(createRequest('GET', '/api/reseller/earnings'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(dashboard);
  });

  it('returns 400 when dashboard service throws', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(ResellerAccount.findOne).mockResolvedValue({ _id: 'r1' } as never);
    mockGetDashboard.mockRejectedValue(new Error('Service error'));

    const { GET } = await import('@/app/api/reseller/earnings/route');
    const res = await GET(createRequest('GET', '/api/reseller/earnings'));
    expect(res.status).toBe(400);
  });
});
