import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { createSubAccount, getSubAccounts } from '@/lib/resellerService';
import connectDB from '@/lib/mongodb';
import ResellerAccount from '@/models/ResellerAccount';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();
  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId });
  if (!reseller) return Errors.notFound('Reseller account not found');

  try {
    const accounts = await getSubAccounts(reseller._id.toString());
    return successResponse(accounts);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch sub-accounts';
    return Errors.badRequest(message);
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();
  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId });
  if (!reseller) return Errors.notFound('Reseller account not found');

  try {
    const body = await request.json();
    if (!body.name || !body.email) {
      return Errors.badRequest('Missing required fields: name, email');
    }

    const result = await createSubAccount(reseller._id.toString(), body);
    return successResponse(result, 'Sub-account created');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create sub-account';
    return Errors.badRequest(message);
  }
}
