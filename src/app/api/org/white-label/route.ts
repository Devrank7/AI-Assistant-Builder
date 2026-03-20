import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;
    if (!auth.organizationId) return Errors.badRequest('No organization');

    await connectDB();
    const org = await Organization.findById(auth.organizationId).select('whiteLabel plan');
    if (!org) return Errors.notFound('Organization not found');

    const isEnterprise = org.plan === 'enterprise';
    return successResponse({ whiteLabel: org.whiteLabel || {}, isEnterprise });
  } catch (error) {
    console.error('Get white-label error:', error);
    return Errors.internal('Failed to fetch white-label settings');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;
    if (!auth.organizationId) return Errors.badRequest('No organization');

    await connectDB();
    const org = await Organization.findById(auth.organizationId);
    if (!org) return Errors.notFound('Organization not found');
    if (org.plan !== 'enterprise') return Errors.forbidden('White-label requires Enterprise plan');

    const body = await request.json();
    const { customDomain, hideBranding, brandName, brandColor, logoUrl } = body;

    org.whiteLabel = {
      enabled: true,
      customDomain: customDomain || null,
      hideBranding: hideBranding ?? false,
      brandName: brandName || null,
      brandColor: brandColor || null,
      logoUrl: logoUrl || null,
    };

    await org.save();
    return successResponse(org.whiteLabel);
  } catch (error) {
    console.error('Update white-label error:', error);
    return Errors.internal('Failed to update white-label settings');
  }
}
