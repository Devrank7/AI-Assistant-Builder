import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { checkPermission } from '@/lib/orgAuth';
import { createDomain, getDomains } from '@/lib/customDomainService';
import type { OrgRole } from '@/models/OrgMember';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.forbidden('Organization required');
  if (!auth.orgRole || !checkPermission(auth.orgRole as OrgRole, 'manage_whitelabel')) {
    return Errors.forbidden('Insufficient permissions');
  }

  // Check Enterprise plan
  await connectDB();
  const org = await Organization.findById(auth.organizationId);
  if (!org || org.plan !== 'enterprise') {
    return Errors.forbidden('Custom domains require Enterprise plan');
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId') || undefined;

  const domains = await getDomains(auth.organizationId, clientId);
  return successResponse(domains);
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;
  if (!auth.organizationId) return Errors.forbidden('Organization required');
  if (!auth.orgRole || !checkPermission(auth.orgRole as OrgRole, 'manage_whitelabel')) {
    return Errors.forbidden('Insufficient permissions');
  }

  // Check Enterprise plan
  await connectDB();
  const org = await Organization.findById(auth.organizationId);
  if (!org || org.plan !== 'enterprise') {
    return Errors.forbidden('Custom domains require Enterprise plan');
  }

  try {
    const body = await request.json();
    const { domain, clientId } = body;

    if (!domain || !clientId) {
      return Errors.badRequest('domain and clientId are required');
    }

    const customDomain = await createDomain(auth.organizationId, clientId, domain);
    return successResponse(customDomain, 'Domain added successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create domain';
    return Errors.badRequest(message);
  }
}
