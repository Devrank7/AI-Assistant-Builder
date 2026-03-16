import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import OrgMember from '@/models/OrgMember';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { checkPermission } from '@/lib/orgAuth';
import type { OrgRole } from '@/models/OrgMember';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.notFound('No organization found');

  await connectDB();

  const org = await Organization.findById(auth.organizationId);
  if (!org) return Errors.notFound('Organization not found');

  const members = await OrgMember.find({ organizationId: auth.organizationId }).select('userId role');

  return successResponse({
    ...org.toObject(),
    members,
    currentUserRole: auth.orgRole,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.notFound('No organization found');
  if (!auth.orgRole || !checkPermission(auth.orgRole as OrgRole, 'manage_billing')) {
    return Errors.forbidden('Only the owner can update organization settings');
  }

  await connectDB();

  const body = await request.json();
  const allowedFields = ['name'];
  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return Errors.badRequest('No valid fields to update');
  }

  const org = await Organization.findByIdAndUpdate(auth.organizationId, updates, { new: true });
  if (!org) return Errors.notFound('Organization not found');

  return successResponse(org);
}
