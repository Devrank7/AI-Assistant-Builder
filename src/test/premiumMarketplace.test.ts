import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockPTFind = vi.fn();
const mockPTCreate = vi.fn();
const mockPTFindById = vi.fn();
const mockPTCountDocuments = vi.fn();
const mockPTFindByIdAndUpdate = vi.fn();
const mockTPCreate = vi.fn();
const mockTPFindOne = vi.fn();
const mockTPFind = vi.fn();

vi.mock('@/models/PremiumTemplate', () => ({
  default: {
    find: (...args: unknown[]) => {
      const result = mockPTFind(...args);
      return {
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue(result),
            }),
          }),
        }),
        lean: vi.fn().mockResolvedValue(result),
      };
    },
    create: (...args: unknown[]) => mockPTCreate(...args),
    findById: (...args: unknown[]) => mockPTFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockPTFindByIdAndUpdate(...args),
    countDocuments: (...args: unknown[]) => mockPTCountDocuments(...args),
  },
}));

vi.mock('@/models/TemplatePurchase', () => ({
  default: {
    create: (...args: unknown[]) => mockTPCreate(...args),
    findOne: (...args: unknown[]) => mockTPFindOne(...args),
    find: (...args: unknown[]) => {
      const result = mockTPFind(...args);
      return { lean: vi.fn().mockResolvedValue(result) };
    },
  },
}));

describe('premiumMarketplace', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listPremiumTemplates returns paginated results', async () => {
    const mockTemplates = [
      { _id: 't1', title: 'Dental Pro', price: 2999, status: 'approved' },
      { _id: 't2', title: 'Beauty Suite', price: 1999, status: 'approved' },
    ];
    mockPTFind.mockReturnValue(mockTemplates);
    mockPTCountDocuments.mockResolvedValue(2);

    const { listPremiumTemplates } = await import('@/lib/premiumMarketplace');
    const result = await listPremiumTemplates({ page: 1, limit: 10 });

    expect(result).toHaveProperty('templates');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('totalPages');
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
  });

  it('submitTemplate creates a template in pending_review status', async () => {
    const mockTemplate = {
      _id: 'tpl-1',
      authorId: 'author-1',
      title: 'Premium Widget',
      price: 4999,
      status: 'pending_review',
      downloads: 0,
      rating: 0,
    };
    mockPTCreate.mockResolvedValue(mockTemplate);

    const { submitTemplate } = await import('@/lib/premiumMarketplace');
    const result = await submitTemplate('author-1', {
      title: 'Premium Widget',
      description: 'A premium template',
      niche: 'dental',
      price: 4999,
      currency: 'usd',
    });

    expect(result.status).toBe('pending_review');
    expect(result.authorId).toBe('author-1');
    expect(mockPTCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'author-1',
        status: 'pending_review',
        downloads: 0,
      })
    );
  });

  it('purchaseTemplate creates a purchase and increments downloads', async () => {
    const mockTemplate = {
      _id: 'tpl-1',
      authorId: 'author-1',
      price: 2999,
      status: 'approved',
      revenueShare: 0.7,
    };
    mockPTFindById.mockResolvedValue(mockTemplate);
    mockTPFindOne.mockResolvedValue(null); // not already purchased
    mockTPCreate.mockResolvedValue({
      _id: 'purchase-1',
      buyerId: 'buyer-1',
      templateId: 'tpl-1',
      price: 2999,
      authorEarnings: 2099,
      platformFee: 900,
      status: 'completed',
    });
    mockPTFindByIdAndUpdate.mockResolvedValue({});

    const { purchaseTemplate } = await import('@/lib/premiumMarketplace');
    const result = await purchaseTemplate('buyer-1', 'tpl-1');

    expect(result).toHaveProperty('purchase');
    expect(result).toHaveProperty('downloadUrl');
    expect(result.purchase.status).toBe('completed');
    expect(mockTPCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerId: 'buyer-1',
        templateId: 'tpl-1',
        status: 'completed',
      })
    );
    expect(mockPTFindByIdAndUpdate).toHaveBeenCalledWith('tpl-1', {
      $inc: { downloads: 1, revenue: 2999 },
    });
  });
});
