import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/premiumMarketplace', () => ({
  listPremiumTemplates: vi.fn(),
  submitTemplate: vi.fn(),
  purchaseTemplate: vi.fn(),
  getAuthorEarnings: vi.fn(),
  approveTemplate: vi.fn(),
}));
vi.mock('@/models/PremiumTemplate', () => {
  const mockModel: Record<string, unknown> = {
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    lean: vi.fn(),
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

import { verifyUser } from '@/lib/auth';
import {
  listPremiumTemplates,
  submitTemplate,
  purchaseTemplate,
  getAuthorEarnings,
  approveTemplate,
} from '@/lib/premiumMarketplace';
import PremiumTemplate from '@/models/PremiumTemplate';

const mockVerifyUser = vi.mocked(verifyUser);

// ─── GET /api/premium-marketplace ───────────────────────────────────
describe('GET /api/premium-marketplace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/premium-marketplace/route');
    const res = await GET(createRequest('GET', '/api/premium-marketplace'));
    expect(res.status).toBe(401);
  });

  it('returns premium templates list', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const templates = { templates: [{ _id: 'p1', title: 'Premium Template' }], total: 1 };
    vi.mocked(listPremiumTemplates).mockResolvedValue(templates as never);

    const { GET } = await import('@/app/api/premium-marketplace/route');
    const res = await GET(createRequest('GET', '/api/premium-marketplace'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(templates);
  });

  it('passes filter parameters correctly', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(listPremiumTemplates).mockResolvedValue({ templates: [], total: 0 } as never);

    const { GET } = await import('@/app/api/premium-marketplace/route');
    await GET(createRequest('GET', '/api/premium-marketplace?niche=dental&minPrice=10&sort=newest'));

    expect(listPremiumTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ niche: 'dental', minPrice: 10, sort: 'newest' })
    );
  });
});

// ─── POST /api/premium-marketplace ──────────────────────────────────
describe('POST /api/premium-marketplace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/premium-marketplace/route');
    const res = await POST(createRequest('POST', '/api/premium-marketplace', { title: 'Test' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when missing required fields', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/premium-marketplace/route');
    const res = await POST(createRequest('POST', '/api/premium-marketplace', { title: 'Test' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('submits template successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const template = { _id: 'p1', title: 'Premium', status: 'pending_review' };
    vi.mocked(submitTemplate).mockResolvedValue(template as never);

    const { POST } = await import('@/app/api/premium-marketplace/route');
    const res = await POST(
      createRequest('POST', '/api/premium-marketplace', {
        title: 'Premium',
        description: 'A premium template',
        niche: 'dental',
        themeConfig: { primary: '#000' },
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('submitted for review');
  });

  it('returns 400 when submitTemplate throws', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(submitTemplate).mockRejectedValue(new Error('Duplicate title') as never);

    const { POST } = await import('@/app/api/premium-marketplace/route');
    const res = await POST(
      createRequest('POST', '/api/premium-marketplace', {
        title: 'Premium',
        description: 'Desc',
        niche: 'dental',
        themeConfig: {},
      })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('Duplicate title');
  });
});

// ─── GET /api/premium-marketplace/[id] ──────────────────────────────
describe('GET /api/premium-marketplace/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/premium-marketplace/[id]/route');
    const res = await GET(createRequest('GET', '/api/premium-marketplace/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(PremiumTemplate.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(null) } as never);

    const { GET } = await import('@/app/api/premium-marketplace/[id]/route');
    const res = await GET(createRequest('GET', '/api/premium-marketplace/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns template details', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const template = { _id: 'p1', title: 'Premium', price: 29 };
    vi.mocked(PremiumTemplate.findById).mockReturnValue({ lean: vi.fn().mockResolvedValue(template) } as never);

    const { GET } = await import('@/app/api/premium-marketplace/[id]/route');
    const res = await GET(createRequest('GET', '/api/premium-marketplace/p1'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual(template);
  });
});

// ─── PATCH /api/premium-marketplace/[id] ────────────────────────────
describe('PATCH /api/premium-marketplace/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { PATCH } = await import('@/app/api/premium-marketplace/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/premium-marketplace/p1', { title: 'Updated' }), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 when user is not the author and not admin', async () => {
    mockVerifyUser.mockResolvedValue({ ...mockAuth, orgRole: 'member' } as never);
    vi.mocked(PremiumTemplate.findById).mockResolvedValue({ _id: 'p1', authorId: 'other_user' } as never);

    const { PATCH } = await import('@/app/api/premium-marketplace/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/premium-marketplace/p1', { title: 'Updated' }), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(403);
  });

  it('allows admin to approve template', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(PremiumTemplate.findById).mockResolvedValue({ _id: 'p1', authorId: 'other_user' } as never);
    vi.mocked(approveTemplate).mockResolvedValue({ _id: 'p1', status: 'published' } as never);

    const { PATCH } = await import('@/app/api/premium-marketplace/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/premium-marketplace/p1', { action: 'approve' }), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toContain('approved');
  });

  it('allows author to update template fields', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(PremiumTemplate.findById).mockResolvedValue({ _id: 'p1', authorId: 'u1' } as never);
    vi.mocked(PremiumTemplate.findByIdAndUpdate).mockResolvedValue({ _id: 'p1', title: 'Updated' } as never);

    const { PATCH } = await import('@/app/api/premium-marketplace/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/premium-marketplace/p1', { title: 'Updated', price: 39 }), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

// ─── POST /api/premium-marketplace/[id]/purchase ────────────────────
describe('POST /api/premium-marketplace/[id]/purchase', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/premium-marketplace/[id]/purchase/route');
    const res = await POST(createRequest('POST', '/api/premium-marketplace/p1/purchase'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    expect(res.status).toBe(401);
  });

  it('completes purchase successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const result = { purchaseId: 'pur1', templateId: 'p1' };
    vi.mocked(purchaseTemplate).mockResolvedValue(result as never);

    const { POST } = await import('@/app/api/premium-marketplace/[id]/purchase/route');
    const res = await POST(createRequest('POST', '/api/premium-marketplace/p1/purchase'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toContain('Purchase completed');
  });

  it('returns 400 when purchase fails', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(purchaseTemplate).mockRejectedValue(new Error('Insufficient credits') as never);

    const { POST } = await import('@/app/api/premium-marketplace/[id]/purchase/route');
    const res = await POST(createRequest('POST', '/api/premium-marketplace/p1/purchase'), {
      params: Promise.resolve({ id: 'p1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('Insufficient credits');
  });
});

// ─── GET /api/premium-marketplace/earnings ──────────────────────────
describe('GET /api/premium-marketplace/earnings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/premium-marketplace/earnings/route');
    const res = await GET(createRequest('GET', '/api/premium-marketplace/earnings'));
    expect(res.status).toBe(401);
  });

  it('returns earnings for authenticated author', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const earnings = { totalEarnings: 150, totalSales: 5, templates: [] };
    vi.mocked(getAuthorEarnings).mockResolvedValue(earnings as never);

    const { GET } = await import('@/app/api/premium-marketplace/earnings/route');
    const res = await GET(createRequest('GET', '/api/premium-marketplace/earnings'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(earnings);
    expect(getAuthorEarnings).toHaveBeenCalledWith('u1');
  });
});
