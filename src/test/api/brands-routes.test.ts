import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/brandService', () => ({
  getBrands: vi.fn(),
  createBrand: vi.fn(),
  getBrandById: vi.fn(),
  updateBrand: vi.fn(),
  deleteBrand: vi.fn(),
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

import { verifyUser } from '@/lib/auth';
import { getBrands, createBrand, getBrandById, updateBrand, deleteBrand } from '@/lib/brandService';

const mockVerifyUser = vi.mocked(verifyUser);
const mockGetBrands = vi.mocked(getBrands);
const mockCreateBrand = vi.mocked(createBrand);
const mockGetBrandById = vi.mocked(getBrandById);
const mockUpdateBrand = vi.mocked(updateBrand);
const mockDeleteBrand = vi.mocked(deleteBrand);

describe('GET /api/brands', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/brands/route');
    const res = await GET(createRequest('GET', '/api/brands'));
    expect(res.status).toBe(401);
  });

  it('returns list of brands', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const brands = [{ _id: 'b1', name: 'Brand A', slug: 'brand-a' }];
    mockGetBrands.mockResolvedValue(brands as never);

    const { GET } = await import('@/app/api/brands/route');
    const res = await GET(createRequest('GET', '/api/brands'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(brands);
    expect(mockGetBrands).toHaveBeenCalledWith('org1');
  });

  it('returns 500 when service throws', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockGetBrands.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('@/app/api/brands/route');
    const res = await GET(createRequest('GET', '/api/brands'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/brands', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/brands/route');
    const res = await POST(createRequest('POST', '/api/brands', { name: 'Test', slug: 'test' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when name or slug missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/brands/route');

    const res = await POST(createRequest('POST', '/api/brands', { name: 'Test' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('name and slug are required');
  });

  it('creates a brand with status 201', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const brand = { _id: 'b1', name: 'Acme', slug: 'acme', primaryColor: '#FF0000' };
    mockCreateBrand.mockResolvedValue(brand as never);

    const { POST } = await import('@/app/api/brands/route');
    const res = await POST(
      createRequest('POST', '/api/brands', {
        name: 'Acme',
        slug: 'acme',
        primaryColor: '#FF0000',
        domain: 'acme.com',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.message).toBe('Brand created');
    expect(json.data).toEqual(brand);
  });

  it('passes all optional fields to createBrand', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockCreateBrand.mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/brands/route');
    const body = {
      name: 'Test',
      slug: 'test',
      logo: 'logo.png',
      primaryColor: '#000',
      secondaryColor: '#FFF',
      domain: 'test.com',
      description: 'desc',
      isDefault: true,
    };
    await POST(createRequest('POST', '/api/brands', body));

    expect(mockCreateBrand).toHaveBeenCalledWith('org1', {
      name: 'Test',
      slug: 'test',
      logo: 'logo.png',
      primaryColor: '#000',
      secondaryColor: '#FFF',
      domain: 'test.com',
      description: 'desc',
      isDefault: true,
    });
  });
});

describe('GET /api/brands/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/brands/[id]/route');
    const res = await GET(createRequest('GET', '/api/brands/b1'), { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when brand not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockGetBrandById.mockResolvedValue(null as never);

    const { GET } = await import('@/app/api/brands/[id]/route');
    const res = await GET(createRequest('GET', '/api/brands/b1'), { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(404);
  });

  it('returns brand by id', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const brand = { _id: 'b1', name: 'Acme', slug: 'acme' };
    mockGetBrandById.mockResolvedValue(brand as never);

    const { GET } = await import('@/app/api/brands/[id]/route');
    const res = await GET(createRequest('GET', '/api/brands/b1'), { params: Promise.resolve({ id: 'b1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(brand);
  });
});

describe('PATCH /api/brands/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { PATCH } = await import('@/app/api/brands/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/brands/b1', { name: 'Updated' }), {
      params: Promise.resolve({ id: 'b1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when brand not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockUpdateBrand.mockResolvedValue(null as never);

    const { PATCH } = await import('@/app/api/brands/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/brands/b1', { name: 'Updated' }), {
      params: Promise.resolve({ id: 'b1' }),
    });
    expect(res.status).toBe(404);
  });

  it('updates brand successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const updated = { _id: 'b1', name: 'Updated Brand' };
    mockUpdateBrand.mockResolvedValue(updated as never);

    const { PATCH } = await import('@/app/api/brands/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/brands/b1', { name: 'Updated Brand' }), {
      params: Promise.resolve({ id: 'b1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Brand updated');
    expect(mockUpdateBrand).toHaveBeenCalledWith('b1', 'org1', { name: 'Updated Brand' });
  });
});

describe('DELETE /api/brands/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { DELETE } = await import('@/app/api/brands/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/brands/b1'), { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when brand not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockDeleteBrand.mockResolvedValue(null as never);

    const { DELETE } = await import('@/app/api/brands/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/brands/b1'), { params: Promise.resolve({ id: 'b1' }) });
    expect(res.status).toBe(404);
  });

  it('deletes brand successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockDeleteBrand.mockResolvedValue({ _id: 'b1' } as never);

    const { DELETE } = await import('@/app/api/brands/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/brands/b1'), { params: Promise.resolve({ id: 'b1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Brand deleted');
    expect(mockDeleteBrand).toHaveBeenCalledWith('b1', 'org1');
  });
});
