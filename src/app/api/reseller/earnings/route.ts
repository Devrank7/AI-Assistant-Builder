import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getResellerDashboard } from '@/lib/resellerService';
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
    const dashboard = await getResellerDashboard(reseller._id.toString());
    return successResponse(dashboard);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch dashboard';
    return Errors.badRequest(message);
  }
}
