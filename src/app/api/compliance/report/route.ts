import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { exportComplianceReport } from '@/lib/complianceService';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const orgId = auth.organizationId || auth.userId;
    const actorEmail = auth.user?.email || auth.userId;

    const report = await exportComplianceReport(orgId, actorEmail);
    return successResponse(report, 'Compliance report generated');
  } catch (error) {
    console.error('Export compliance report error:', error);
    return Errors.internal('Failed to generate compliance report');
  }
}
