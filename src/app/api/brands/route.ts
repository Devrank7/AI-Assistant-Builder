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
    const {
      name,
      logo,
      primaryColor,
      secondaryColor,
      accentColor,
      fontFamily,
      domain,
      tagline,
      description,
      socialLinks,
      widgetIds,
      isDefault,
      isActive,
    } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return Errors.badRequest('name is required');
    }

    const orgId = auth.organizationId || auth.userId;
    const brand = await createBrand(orgId, auth.userId, {
      name: name.trim(),
      logo,
      primaryColor,
      secondaryColor,
      accentColor,
      fontFamily,
      domain,
      tagline,
      description,
      socialLinks,
      widgetIds,
      isDefault,
      isActive,
    });

    return successResponse(brand, 'Brand created', 201);
  } catch (error) {
    console.error('Create brand error:', error);
    return Errors.internal('Failed to create brand');
  }
}
