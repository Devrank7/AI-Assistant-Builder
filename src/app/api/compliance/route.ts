import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getComplianceConfig, updateComplianceConfig } from '@/lib/complianceService';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const orgId = auth.organizationId || auth.userId;
    const config = await getComplianceConfig(orgId);
    return successResponse(config);
  } catch (error) {
    console.error('Get compliance config error:', error);
    return Errors.internal('Failed to fetch compliance config');
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const orgId = auth.organizationId || auth.userId;

    const config = await updateComplianceConfig(orgId, body);
    return successResponse(config, 'Compliance config updated');
  } catch (error) {
    console.error('Update compliance config error:', error);
    return Errors.internal('Failed to update compliance config');
  }
}
