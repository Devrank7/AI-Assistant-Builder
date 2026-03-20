import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { generateSOC2AuditReport } from '@/lib/complianceService';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const orgId = auth.organizationId || auth.userId;
    const result = await generateSOC2AuditReport(orgId);
    return successResponse(result);
  } catch (error) {
    console.error('Generate SOC2 audit error:', error);
    return Errors.internal('Failed to generate SOC2 audit report');
  }
}
