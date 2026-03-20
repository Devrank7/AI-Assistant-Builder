import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
  verifyAdmin: vi.fn(),
}));
vi.mock('@/models/MarketplaceTemplate', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnThis(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    updateOne: vi.fn(),
    create: vi.fn(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  };
  return {
    default: mockModel,
    MARKETPLACE_NICHES: [
      'dental',
      'beauty',
      'restaurant',
      'hotel',
      'ecommerce',
      'real_estate',
      'construction',
      'medical',
      'legal',
      'fitness',
      'education',
      'other',
    ],
  };
});
vi.mock('@/models/MarketplaceReview', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnThis(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    sort: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
  };
  return { default: mockModel };
});
vi.mock('@/models/Client', () => ({
  default: { create: vi.fn() },
}));
vi.mock('@/models/User', () => ({
  default: {
    findById: vi
      .fn()
      .mockReturnValue({ select: vi.fn().mockResolvedValue({ name: 'Test User', email: 'test@test.com' }) }),
  },
}));
vi.mock('crypto', () => ({
  default: { randomBytes: vi.fn().mockReturnValue({ toString: () => 'abc123' }) },
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
  user: { email: 'test@test.com' },
};
const mockUnauth = {
  authenticated: false,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

import { verifyUser, verifyAdmin } from '@/lib/auth';
import MarketplaceTemplate from '@/models/MarketplaceTemplate';
import MarketplaceReview from '@/models/MarketplaceReview';

const mockVerifyUser = vi.mocked(verifyUser);
const mockVerifyAdmin = vi.mocked(verifyAdmin);

// ─── GET /api/marketplace ───────────────────────────────────────────
describe('GET /api/marketplace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated templates without auth (public endpoint)', async () => {
    const templates = [{ _id: 't1', name: 'Template 1' }];
    vi.mocked(MarketplaceTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue(templates),
          }),
        }),
      }),
    } as never);
    vi.mocked(MarketplaceTemplate.countDocuments).mockResolvedValue(1 as never);

    const { GET } = await import('@/app/api/marketplace/route');
    const res = await GET(createRequest('GET', '/api/marketplace'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.templates).toEqual(templates);
    expect(json.data.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
  });

  it('filters by niche parameter', async () => {
    vi.mocked(MarketplaceTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as never);
    vi.mocked(MarketplaceTemplate.countDocuments).mockResolvedValue(0 as never);

    const { GET } = await import('@/app/api/marketplace/route');
    await GET(createRequest('GET', '/api/marketplace?niche=dental'));

    expect(MarketplaceTemplate.find).toHaveBeenCalledWith(
      expect.objectContaining({ niche: 'dental', status: 'published' })
    );
  });

  it('supports search, sort, and pagination params', async () => {
    vi.mocked(MarketplaceTemplate.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as never);
    vi.mocked(MarketplaceTemplate.countDocuments).mockResolvedValue(0 as never);

    const { GET } = await import('@/app/api/marketplace/route');
    const res = await GET(createRequest('GET', '/api/marketplace?search=dental&sort=newest&page=2&limit=10'));
    const json = await res.json();

    expect(json.data.pagination.page).toBe(2);
    expect(json.data.pagination.limit).toBe(10);
  });
});

// ─── POST /api/marketplace ──────────────────────────────────────────
describe('POST /api/marketplace', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/marketplace/route');
    const res = await POST(createRequest('POST', '/api/marketplace', { name: 'test' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when missing required fields', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/marketplace/route');
    const res = await POST(createRequest('POST', '/api/marketplace', { name: 'test' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
  });

  it('returns 400 for invalid niche', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(MarketplaceTemplate.findOne).mockResolvedValue(null as never);

    const { POST } = await import('@/app/api/marketplace/route');
    const res = await POST(
      createRequest('POST', '/api/marketplace', {
        name: 'Test',
        description: 'Desc',
        shortDescription: 'Short',
        niche: 'invalid_niche',
        themeJson: {},
        configJson: {},
      })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('Invalid niche');
  });

  it('creates template successfully with valid data', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(MarketplaceTemplate.findOne).mockResolvedValue(null as never);
    const created = { _id: 't1', name: 'Test', slug: 'test', status: 'review' };
    vi.mocked(MarketplaceTemplate.create).mockResolvedValue(created as never);

    const { POST } = await import('@/app/api/marketplace/route');
    const res = await POST(
      createRequest('POST', '/api/marketplace', {
        name: 'Test',
        description: 'Desc',
        shortDescription: 'Short',
        niche: 'dental',
        themeJson: { cssPrimary: '#5bbad5' },
        configJson: { key: 'val' },
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('submitted for review');
  });
});

// ─── GET /api/marketplace/[id] ─────────────────────────────────────
describe('GET /api/marketplace/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 404 when template not found', async () => {
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue(null as never);
    const { GET } = await import('@/app/api/marketplace/[id]/route');
    const res = await GET(createRequest('GET', '/api/marketplace/abc123'), {
      params: Promise.resolve({ id: 'abc123' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns published template without auth', async () => {
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue({
      _id: 't1',
      name: 'Template',
      status: 'published',
    } as never);
    const { GET } = await import('@/app/api/marketplace/[id]/route');
    const res = await GET(createRequest('GET', '/api/marketplace/t1'), { params: Promise.resolve({ id: 't1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('returns 404 for non-published template when unauthenticated', async () => {
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue({
      _id: 't1',
      name: 'Template',
      status: 'review',
      authorId: 'other',
    } as never);
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/marketplace/[id]/route');
    const res = await GET(createRequest('GET', '/api/marketplace/t1'), { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/marketplace/[id] ───────────────────────────────────
describe('PATCH /api/marketplace/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { PATCH } = await import('@/app/api/marketplace/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/marketplace/t1', { name: 'Updated' }), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue(null as never);
    const { PATCH } = await import('@/app/api/marketplace/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/marketplace/t1', { name: 'Updated' }), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(404);
  });

  it('updates template when user is the author', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockVerifyAdmin.mockResolvedValue({ authenticated: false } as never);
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue({ _id: 't1', authorId: 'u1' } as never);
    vi.mocked(MarketplaceTemplate.findByIdAndUpdate).mockResolvedValue({ _id: 't1', name: 'Updated' } as never);

    const { PATCH } = await import('@/app/api/marketplace/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/marketplace/t1', { name: 'Updated' }), {
      params: Promise.resolve({ id: 't1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('returns 403 when user is neither author nor admin', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockVerifyAdmin.mockResolvedValue({ authenticated: false } as never);
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue({ _id: 't1', authorId: 'other_user' } as never);

    const { PATCH } = await import('@/app/api/marketplace/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/marketplace/t1', { name: 'Updated' }), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(403);
  });
});

// ─── DELETE /api/marketplace/[id] ──────────────────────────────────
describe('DELETE /api/marketplace/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { DELETE } = await import('@/app/api/marketplace/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/marketplace/t1'), { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(401);
  });

  it('soft-deletes template by setting status to rejected', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockVerifyAdmin.mockResolvedValue({ authenticated: true } as never);
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue({ _id: 't1', authorId: 'u1' } as never);
    vi.mocked(MarketplaceTemplate.findByIdAndUpdate).mockResolvedValue(null as never);

    const { DELETE } = await import('@/app/api/marketplace/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/marketplace/t1'), { params: Promise.resolve({ id: 't1' }) });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(MarketplaceTemplate.findByIdAndUpdate).toHaveBeenCalledWith('t1', { status: 'rejected' });
  });
});

// ─── POST /api/marketplace/[id]/install ─────────────────────────────
describe('POST /api/marketplace/[id]/install', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/marketplace/[id]/install/route');
    const res = await POST(createRequest('POST', '/api/marketplace/t1/install'), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found or not published', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue(null as never);

    const { POST } = await import('@/app/api/marketplace/[id]/install/route');
    const res = await POST(createRequest('POST', '/api/marketplace/t1/install'), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(404);
  });

  it('installs template and increments install count', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue({
      _id: 't1',
      status: 'published',
      widgetType: 'ai_chat',
      name: 'Template',
      themeJson: {},
      configJson: {},
      knowledgeSample: 'sample',
    } as never);
    vi.mocked(MarketplaceTemplate.updateOne).mockResolvedValue({} as never);
    const Client = (await import('@/models/Client')).default;
    vi.mocked(Client.create).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/marketplace/[id]/install/route');
    const res = await POST(createRequest('POST', '/api/marketplace/t1/install'), {
      params: Promise.resolve({ id: 't1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('installed');
    expect(MarketplaceTemplate.updateOne).toHaveBeenCalledWith({ _id: 't1' }, { $inc: { installCount: 1 } });
  });
});

// ─── POST /api/marketplace/[id]/review ──────────────────────────────
describe('POST /api/marketplace/[id]/review', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/marketplace/[id]/review/route');
    const res = await POST(createRequest('POST', '/api/marketplace/t1/review', { rating: 5 }), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when template not found or not published', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue(null as never);

    const { POST } = await import('@/app/api/marketplace/[id]/review/route');
    const res = await POST(createRequest('POST', '/api/marketplace/t1/review', { rating: 5 }), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid rating', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue({ _id: 't1', status: 'published' } as never);

    const { POST } = await import('@/app/api/marketplace/[id]/review/route');
    const res = await POST(createRequest('POST', '/api/marketplace/t1/review', { rating: 0 }), {
      params: Promise.resolve({ id: 't1' }),
    });
    expect(res.status).toBe(400);
  });

  it('submits review and recalculates average rating', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(MarketplaceTemplate.findById).mockResolvedValue({ _id: 't1', status: 'published' } as never);
    vi.mocked(MarketplaceReview.findOneAndUpdate).mockResolvedValue({} as never);
    vi.mocked(MarketplaceReview.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ rating: 5 }, { rating: 3 }]),
    } as never);
    vi.mocked(MarketplaceTemplate.updateOne).mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/marketplace/[id]/review/route');
    const res = await POST(createRequest('POST', '/api/marketplace/t1/review', { rating: 5, comment: 'Great!' }), {
      params: Promise.resolve({ id: 't1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.message).toContain('Review submitted');
  });
});

// ─── GET /api/marketplace/[id]/review ───────────────────────────────
describe('GET /api/marketplace/[id]/review', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns paginated reviews', async () => {
    const reviews = [{ _id: 'r1', rating: 5, comment: 'Great' }];
    vi.mocked(MarketplaceReview.find).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(reviews),
        }),
      }),
    } as never);
    vi.mocked(MarketplaceReview.countDocuments).mockResolvedValue(1 as never);

    const { GET } = await import('@/app/api/marketplace/[id]/review/route');
    const res = await GET(createRequest('GET', '/api/marketplace/t1/review'), {
      params: Promise.resolve({ id: 't1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.reviews).toEqual(reviews);
    expect(json.data.pagination.total).toBe(1);
  });
});
