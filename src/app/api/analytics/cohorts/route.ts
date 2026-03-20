import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getCohortRetention } from '@/lib/advancedAnalytics';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const weeks = parseInt(searchParams.get('weeks') || '8', 10);

  if (!clientId) return Errors.badRequest('clientId is required');

  try {
    const cohorts = await getCohortRetention(clientId, weeks);
    return successResponse(cohorts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get cohort data';
    return Errors.internal(message);
  }
}
