import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockTemplateFind = vi.fn();
const mockTemplateCreate = vi.fn();
const mockTemplateFindOne = vi.fn();
const mockTemplateCountDocuments = vi.fn();
const mockReviewFind = vi.fn();
const mockReviewFindOneAndUpdate = vi.fn();
const mockReviewCountDocuments = vi.fn();

vi.mock('@/models/MarketplaceTemplate', () => ({
  default: {
    find: (...args: unknown[]) => {
      const result = mockTemplateFind(...args);
      return {
        sort: () => ({
          skip: () => ({
            limit: () => ({
              select: () => result,
            }),
          }),
        }),
      };
    },
    findOne: (...args: unknown[]) => mockTemplateFindOne(...args),
    create: (...args: unknown[]) => mockTemplateCreate(...args),
    countDocuments: (...args: unknown[]) => mockTemplateCountDocuments(...args),
    findById: vi.fn(),
    updateOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
  },
  MARKETPLACE_NICHES: [
    'dental',
    'beauty',
    'restaurant',
    'real_estate',
    'ecommerce',
    'saas',
    'hotel',
    'fitness',
    'legal',
    'auto',
  ],
  NICHE_LABELS: {},
  NICHE_ICONS: {},
}));

vi.mock('@/models/MarketplaceReview', () => ({
  default: {
    find: (...args: unknown[]) => {
      const result = mockReviewFind(...args);
      return {
        sort: () => ({
          skip: () => ({
            limit: () => result,
          }),
        }),
        select: () => result,
      };
    },
    findOneAndUpdate: (...args: unknown[]) => mockReviewFindOneAndUpdate(...args),
    countDocuments: (...args: unknown[]) => mockReviewCountDocuments(...args),
  },
}));

vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'user123',
    organizationId: 'org1',
  }),
  verifyAdmin: vi.fn().mockResolvedValue({ authenticated: true, role: 'admin' }),
}));

vi.mock('@/models/User', () => ({
  default: {
    findById: vi.fn().mockReturnValue({
      select: () => Promise.resolve({ name: 'Test User', email: 'test@example.com' }),
    }),
  },
}));

describe('Marketplace API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /api/marketplace returns published templates with pagination', async () => {
    const mockTemplates = [
      { _id: 't1', name: 'Dental AI', slug: 'dental-ai', niche: 'dental', status: 'published', installCount: 50 },
      { _id: 't2', name: 'Beauty Chat', slug: 'beauty-chat', niche: 'beauty', status: 'published', installCount: 30 },
    ];
    mockTemplateFind.mockResolvedValue(mockTemplates);
    mockTemplateCountDocuments.mockResolvedValue(2);

    const { GET } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace?sort=popular&limit=20');
    const response = await GET(request as any);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.templates).toHaveLength(2);
    expect(data.data.pagination.total).toBe(2);
  });

  it('POST /api/marketplace creates community template in review status', async () => {
    mockTemplateFindOne.mockResolvedValue(null); // no slug collision
    mockTemplateCreate.mockResolvedValue({
      _id: 'new1',
      name: 'My Widget',
      slug: 'my-widget',
      tier: 'community',
      status: 'review',
    });

    const { POST } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'My Widget',
        description: 'A great widget',
        shortDescription: 'Great widget',
        niche: 'dental',
        themeJson: { cssPrimary: '#14b8a6' },
        configJson: { botName: 'Test' },
      }),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockTemplateCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'community',
        status: 'review',
        authorId: 'user123',
      })
    );
  });

  it('GET /api/marketplace filters by niche', async () => {
    mockTemplateFind.mockResolvedValue([]);
    mockTemplateCountDocuments.mockResolvedValue(0);

    const { GET } = await import('@/app/api/marketplace/route');
    const request = new Request('http://localhost/api/marketplace?niche=dental');
    await GET(request as any);

    expect(mockTemplateFind).toHaveBeenCalledWith(expect.objectContaining({ status: 'published', niche: 'dental' }));
  });
});
