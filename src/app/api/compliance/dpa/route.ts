import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { generateGDPRDPA } from '@/lib/complianceService';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { companyName, address, dpoEmail } = await request.json();
    if (!companyName || !address || !dpoEmail) {
      return Errors.badRequest('companyName, address, and dpoEmail are required');
    }

    const orgId = auth.organizationId || auth.userId;
    const result = await generateGDPRDPA(orgId, { companyName, address, dpoEmail });
    return successResponse(result);
  } catch (error) {
    console.error('Generate GDPR DPA error:', error);
    return Errors.internal('Failed to generate GDPR DPA');
  }
}
