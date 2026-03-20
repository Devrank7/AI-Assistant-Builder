import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { createResellerAccount } from '@/lib/resellerService';
import connectDB from '@/lib/mongodb';
import ResellerAccount from '@/models/ResellerAccount';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();
  const account = await ResellerAccount.findOne({ organizationId: auth.organizationId }).lean();
  if (!account) return Errors.notFound('Reseller account not found');

  return successResponse(account);
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  // Check enterprise plan
  if (!['enterprise', 'business'].includes(auth.user.plan)) {
    return Errors.forbidden('Enterprise plan required for reseller portal');
  }

  try {
    const body = await request.json();
    if (!body.name || !body.email || !body.company) {
      return Errors.badRequest('Missing required fields: name, email, company');
    }

    const account = await createResellerAccount(auth.organizationId, body);
    return successResponse(account, 'Reseller account created');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create reseller account';
    return Errors.badRequest(message);
  }
}
