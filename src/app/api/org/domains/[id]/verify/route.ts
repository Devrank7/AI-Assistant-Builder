import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { checkPermission } from '@/lib/orgAuth';
import { verifyDomain } from '@/lib/customDomainService';
import type { OrgRole } from '@/models/OrgMember';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.forbidden('Organization required');
  if (!auth.orgRole || !checkPermission(auth.orgRole as OrgRole, 'manage_whitelabel')) {
    return Errors.forbidden('Insufficient permissions');
  }

  await connectDB();
  const org = await Organization.findById(auth.organizationId);
  if (!org || org.plan !== 'enterprise') {
    return Errors.forbidden('Custom domains require Enterprise plan');
  }

  const { id } = await params;

  try {
    const domain = await verifyDomain(id);
    return successResponse(domain);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Verification failed';
    return Errors.badRequest(message);
  }
}
