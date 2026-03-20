import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyApiKey, requireScope } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';
import Client from '@/models/Client';

// Fields safe to expose via public API — exclude sensitive data
const SAFE_FIELDS =
  '-clientToken -integrationKeys -cryptomusSubscriptionId -externalCustomerId -wayforpayRecToken';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyApiKey(request);
    if (!auth.authenticated) return auth.response;
    if (!requireScope(auth.scopes, 'read'))
      return Errors.forbidden('Insufficient scope: read required');

    await connectDB();

    const widgets = await Client.find({ organizationId: auth.organizationId })
      .select(SAFE_FIELDS)
      .sort({ createdAt: -1 })
      .lean();

    return successResponse({ widgets, total: widgets.length });
  } catch (error) {
    console.error('v1 GET /widgets error:', error);
    return Errors.internal('Failed to retrieve widgets');
  }
}
