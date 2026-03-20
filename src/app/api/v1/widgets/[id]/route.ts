import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';

// Fields safe to expose via public API — exclude sensitive data
const SAFE_FIELDS =
  '-clientToken -integrationKeys -cryptomusSubscriptionId -externalCustomerId -wayforpayRecToken';

// Only these fields may be updated via PATCH to prevent privilege escalation
const ALLOWED_PATCH_FIELDS = ['username', 'website', 'phone', 'isActive'] as const;
type AllowedPatchField = (typeof ALLOWED_PATCH_FIELDS)[number];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read'))
      return Errors.forbidden('Insufficient scope: read required');

    const { id } = await params;
    await connectDB();

    const widget = await Client.findOne({
      clientId: id,
      organizationId: auth.organizationId,
    })
      .select(SAFE_FIELDS)
      .lean();

    if (!widget) return Errors.notFound('Widget not found');

    return successResponse({ widget });
  } catch (error) {
    console.error('v1 GET /widgets/[id] error:', error);
    return Errors.internal('Failed to retrieve widget');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'write'))
      return Errors.forbidden('Insufficient scope: write required');

    const { id } = await params;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return Errors.badRequest('Invalid JSON body');
    }

    // Build a safe update object — only allow whitelisted fields
    const update: Partial<Record<AllowedPatchField, unknown>> = {};
    for (const field of ALLOWED_PATCH_FIELDS) {
      if (field in body) {
        update[field] = body[field];
      }
    }

    if (Object.keys(update).length === 0) {
      return Errors.badRequest(
        `No updatable fields provided. Allowed: ${ALLOWED_PATCH_FIELDS.join(', ')}`
      );
    }

    await connectDB();

    const widget = await Client.findOneAndUpdate(
      { clientId: id, organizationId: auth.organizationId },
      { $set: update },
      { new: true }
    )
      .select(SAFE_FIELDS)
      .lean();

    if (!widget) return Errors.notFound('Widget not found');

    return successResponse({ widget }, 'Widget updated successfully');
  } catch (error) {
    console.error('v1 PATCH /widgets/[id] error:', error);
    return Errors.internal('Failed to update widget');
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'admin'))
      return Errors.forbidden('Insufficient scope: admin required');

    const { id } = await params;
    await connectDB();

    // Soft-delete: set isActive = false rather than removing the document
    const widget = await Client.findOneAndUpdate(
      { clientId: id, organizationId: auth.organizationId },
      { $set: { isActive: false } },
      { new: true }
    )
      .select('clientId username isActive')
      .lean();

    if (!widget) return Errors.notFound('Widget not found');

    return successResponse({ widget }, 'Widget deactivated successfully');
  } catch (error) {
    console.error('v1 DELETE /widgets/[id] error:', error);
    return Errors.internal('Failed to deactivate widget');
  }
}
