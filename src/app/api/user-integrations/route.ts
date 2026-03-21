import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { encrypt } from '@/lib/encryption';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';

const VALID_PROVIDERS = [
  'hubspot',
  'salesforce',
  'pipedrive',
  'google_calendar',
  'calendly',
  'stripe',
  'telegram',
  'whatsapp',
  'email_smtp',
  'google_sheets',
];

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  await connectDB();
  const integrations = await Integration.find({ userId: auth.userId })
    .select('provider isActive createdAt metadata')
    .lean();

  return successResponse(integrations);
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  if (auth.user.plan !== 'pro') {
    return Errors.forbidden('CRM integrations require a Pro plan');
  }

  const body = await request.json();
  const { provider, accessToken, refreshToken, metadata } = body;

  if (!provider || !VALID_PROVIDERS.includes(provider)) {
    return Errors.badRequest(`Invalid provider. Supported: ${VALID_PROVIDERS.join(', ')}`);
  }

  if (!accessToken) {
    return Errors.badRequest('accessToken is required');
  }

  await connectDB();

  const existing = await Integration.findOne({ userId: auth.userId, provider });
  if (existing) {
    return Errors.badRequest(`Integration with ${provider} already exists. Disconnect first.`);
  }

  const integration = await Integration.create({
    userId: auth.userId,
    provider,
    accessToken: encrypt(accessToken),
    refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
    metadata: metadata || {},
    isActive: true,
  });

  return successResponse({ id: integration._id, provider, isActive: true }, 'Integration connected', 201);
}
