import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import ResellerAccount from '@/models/ResellerAccount';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  const { id } = await params;
  await connectDB();

  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId }).lean();
  if (!reseller) return Errors.notFound('Reseller account not found');

  const sub = (reseller.subAccounts ?? []).find(
    (s) => (s as { _id?: { toString(): string } })._id?.toString() === id || s.accountId === id
  );

  if (!sub) return Errors.notFound('Sub-account not found');

  return successResponse(sub);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Errors.badRequest('Invalid JSON body');
  }

  await connectDB();

  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId });
  if (!reseller) return Errors.notFound('Reseller account not found');

  const subIndex = reseller.subAccounts.findIndex(
    (s) => (s as { _id?: { toString(): string } })._id?.toString() === id || s.accountId === id
  );

  if (subIndex === -1) return Errors.notFound('Sub-account not found');

  const sub = reseller.subAccounts[subIndex];

  if (typeof body.companyName === 'string') sub.companyName = body.companyName.trim();
  if (typeof body.plan === 'string') sub.plan = body.plan;
  if (typeof body.status === 'string' && ['active', 'suspended', 'canceled'].includes(body.status)) {
    sub.status = body.status as 'active' | 'suspended' | 'canceled';
  }
  if (typeof body.widgetCount === 'number') sub.widgetCount = body.widgetCount;
  if (typeof body.monthlyRevenue === 'number') sub.monthlyRevenue = body.monthlyRevenue;

  await reseller.save();

  return successResponse(sub, 'Sub-account updated');
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return PUT(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  const { id } = await params;
  await connectDB();

  const reseller = await ResellerAccount.findOne({ organizationId: auth.organizationId });
  if (!reseller) return Errors.notFound('Reseller account not found');

  const subIndex = reseller.subAccounts.findIndex(
    (s) => (s as { _id?: { toString(): string } })._id?.toString() === id || s.accountId === id
  );

  if (subIndex === -1) return Errors.notFound('Sub-account not found');

  // Soft delete: suspend rather than remove
  reseller.subAccounts[subIndex].status = 'suspended';
  await reseller.save();

  return successResponse(null, 'Sub-account suspended');
}
