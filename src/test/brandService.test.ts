import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn().mockResolvedValue(undefined) }));

const mockCreate = vi.fn();
const mockFind = vi.fn().mockReturnValue({ sort: vi.fn().mockResolvedValue([]) });
const mockFindOneAndDelete = vi.fn();
const mockFindByIdAndUpdate = vi.fn();

vi.mock('@/models/Brand', () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    find: (...args: unknown[]) => mockFind(...args),
    findById: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: (...args: unknown[]) => mockFindOneAndDelete(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
  },
}));

import { createBrand, getBrands, assignWidgetToBrand } from '@/lib/brandService';

describe('brandService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createBrand creates brand with organization', async () => {
    const mockBrand = { _id: 'b1', organizationId: 'org1', name: 'Test Brand', slug: 'test-brand' };
    mockCreate.mockResolvedValue(mockBrand);

    const result = await createBrand('org1', { name: 'Test Brand', slug: 'test-brand' });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: 'org1',
        name: 'Test Brand',
        slug: 'test-brand',
      })
    );
    expect(result.name).toBe('Test Brand');
  });

  it('getBrands returns brands for org sorted by default', async () => {
    const brands = [
      { _id: 'b1', name: 'Default', isDefault: true },
      { _id: 'b2', name: 'Other', isDefault: false },
    ];
    mockFind.mockReturnValue({ sort: vi.fn().mockResolvedValue(brands) });

    const result = await getBrands('org1');
    expect(mockFind).toHaveBeenCalledWith({ organizationId: 'org1' });
    expect(result).toHaveLength(2);
  });

  it('assignWidgetToBrand uses $addToSet', async () => {
    const updated = { _id: 'b1', widgetIds: ['w1'] };
    mockFindByIdAndUpdate.mockResolvedValue(updated);

    const result = await assignWidgetToBrand('b1', 'w1');
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('b1', { $addToSet: { widgetIds: 'w1' } }, { new: true });
    expect(result.widgetIds).toContain('w1');
  });
});
