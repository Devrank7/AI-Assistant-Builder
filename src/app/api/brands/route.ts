import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getBrands, createBrand } from '@/lib/brandService';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const orgId = auth.organizationId || auth.userId;
    const brands = await getBrands(orgId);
    return successResponse(brands);
  } catch (error) {
    console.error('Get brands error:', error);
    return Errors.internal('Failed to fetch brands');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { name, slug, logo, primaryColor, secondaryColor, domain, description, isDefault } = body;

    if (!name || !slug) {
      return Errors.badRequest('name and slug are required');
    }

    const orgId = auth.organizationId || auth.userId;
    const brand = await createBrand(orgId, {
      name,
      slug,
      logo,
      primaryColor,
      secondaryColor,
      domain,
      description,
      isDefault,
    });

    return successResponse(brand, 'Brand created', 201);
  } catch (error) {
    console.error('Create brand error:', error);
    return Errors.internal('Failed to create brand');
  }
}
