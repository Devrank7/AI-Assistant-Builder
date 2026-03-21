import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getBrandById, updateBrand, deleteBrand } from '@/lib/brandService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const orgId = auth.organizationId || auth.userId;
    const brand = await getBrandById(id, orgId);
    if (!brand) return Errors.notFound('Brand not found');

    return successResponse(brand);
  } catch (error) {
    console.error('Get brand error:', error);
    return Errors.internal('Failed to fetch brand');
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const body = await request.json();
    const orgId = auth.organizationId || auth.userId;

    const allowedFields = [
      'name',
      'logo',
      'primaryColor',
      'secondaryColor',
      'accentColor',
      'fontFamily',
      'domain',
      'tagline',
      'description',
      'socialLinks',
      'widgetIds',
      'isDefault',
      'isActive',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (updateData.name !== undefined) {
      const name = String(updateData.name).trim();
      if (!name) return Errors.badRequest('name cannot be empty');
      updateData.name = name;
    }

    const brand = await updateBrand(id, orgId, updateData);
    if (!brand) return Errors.notFound('Brand not found');

    return successResponse(brand, 'Brand updated');
  } catch (error) {
    console.error('Update brand error:', error);
    return Errors.internal('Failed to update brand');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const orgId = auth.organizationId || auth.userId;

    const brand = await deleteBrand(id, orgId);
    if (!brand) return Errors.notFound('Brand not found');

    return successResponse(null, 'Brand deleted');
  } catch (error) {
    console.error('Delete brand error:', error);
    return Errors.internal('Failed to delete brand');
  }
}
