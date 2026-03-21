import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import ResellerAccount from '@/models/ResellerAccount';
import { Types } from 'mongoose';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();

  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId }).lean();
  if (!reseller) return Errors.notFound('Reseller account not found');

  const subAccounts = (reseller.subAccounts ?? []).map((sub) => ({
    _id: (sub as { _id?: unknown })._id?.toString() ?? sub.accountId,
    accountId: sub.accountId,
    companyName: sub.companyName,
    email: sub.email,
    plan: sub.plan,
    status: sub.status,
    widgetCount: sub.widgetCount ?? 0,
    monthlyRevenue: sub.monthlyRevenue ?? 0,
    createdAt: sub.createdAt,
  }));

  const totalMRR = subAccounts.reduce((sum, s) => sum + (s.monthlyRevenue ?? 0), 0);
  const activeCount = subAccounts.filter((s) => s.status === 'active').length;

  return successResponse({
    subAccounts,
    stats: {
      total: subAccounts.length,
      active: activeCount,
      suspended: subAccounts.filter((s) => s.status === 'suspended').length,
      totalMRR,
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  await connectDB();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Invalid JSON body');
  }

  const companyName = (body.companyName as string) || (body.name as string) || '';
  const email = (body.email as string) || '';
  const plan = (body.plan as string) || 'starter';

  if (!companyName || !email) {
    return Errors.badRequest('Missing required fields: companyName, email');
  }

  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId });
  if (!reseller) return Errors.notFound('Reseller account not found');

  if (reseller.status === 'suspended') {
    return Errors.forbidden('Reseller account is suspended');
  }

  // Check for duplicate email in sub-accounts
  const existing = reseller.subAccounts.find((s) => s.email.toLowerCase() === email.toLowerCase());
  if (existing) return Errors.badRequest('A sub-account with this email already exists');

  const newSubAccount = {
    accountId: new Types.ObjectId().toString(),
    companyName,
    email,
    plan,
    status: 'active' as const,
    widgetCount: 0,
    monthlyRevenue: 0,
    createdAt: new Date(),
  };

  reseller.subAccounts.push(newSubAccount);
  await reseller.save();

  const saved = reseller.subAccounts[reseller.subAccounts.length - 1];

  return successResponse(
    {
      _id: (saved as { _id?: unknown })._id?.toString() ?? saved.accountId,
      ...newSubAccount,
    },
    'Sub-account invited successfully'
  );
}
