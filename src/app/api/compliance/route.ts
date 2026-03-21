import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getComplianceConfig, updateComplianceConfig, checkComplianceStatus } from '@/lib/complianceService';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const orgId = auth.organizationId || auth.userId;
    const [config, status] = await Promise.all([getComplianceConfig(orgId), checkComplianceStatus(orgId)]);

    // Return a merged view: full config + live scores
    return successResponse({
      ...config.toObject(),
      complianceLevel: {
        soc2: status.soc2,
        hipaa: status.hipaa,
        gdpr: status.gdpr,
        overall: status.overall,
      },
    });
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
    const actorEmail = auth.user?.email || auth.userId;

    const config = await updateComplianceConfig(orgId, body, actorEmail);
    const scores = {
      soc2: config.soc2Score,
      hipaa: config.hipaaScore,
      gdpr: config.gdprScore,
      overall: config.complianceScore,
    };

    return successResponse({ ...config.toObject(), complianceLevel: scores }, 'Compliance settings saved');
  } catch (error) {
    console.error('Update compliance config error:', error);
    return Errors.internal('Failed to update compliance config');
  }
}
