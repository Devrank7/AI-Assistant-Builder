import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getAuditLog } from '@/lib/complianceService';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const orgId = auth.organizationId || auth.userId;
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const search = searchParams.get('search') || '';

    const result = await getAuditLog(orgId, page, limit, search);
    return successResponse(result);
  } catch (error) {
    console.error('Get audit log error:', error);
    return Errors.internal('Failed to fetch audit log');
  }
}
