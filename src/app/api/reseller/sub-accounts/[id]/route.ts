import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import ResellerAccount from '@/models/ResellerAccount';
import Organization from '@/models/Organization';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  await connectDB();

  const org = await Organization.findById(id).lean();
  if (!org) return Errors.notFound('Sub-account not found');

  return successResponse(org);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  const body = await request.json();

  await connectDB();

  const allowedFields = ['name', 'plan'];
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) update[field] = body[field];
  }

  const org = await Organization.findByIdAndUpdate(id, update, { new: true });
  if (!org) return Errors.notFound('Sub-account not found');

  return successResponse(org);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.badRequest('Organization required');

  const { id } = await params;
  await connectDB();

  // Remove from reseller's sub-accounts
  await ResellerAccount.updateOne(
    { organizationId: auth.organizationId },
    { $pull: { subAccounts: { organizationId: id } } }
  );

  return successResponse(null, 'Sub-account removed');
}
