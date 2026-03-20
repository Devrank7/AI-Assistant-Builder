import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getAccuracyStats } from '@/lib/predictiveEngagement';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) return Errors.badRequest('clientId is required');

    const stats = await getAccuracyStats(clientId);
    return successResponse(stats);
  } catch (error) {
    console.error('Get accuracy stats error:', error);
    return Errors.internal('Failed to fetch accuracy stats');
  }
}
