import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getFunnelAnalysis } from '@/lib/advancedAnalytics';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const days = parseInt(searchParams.get('days') || '30', 10);

  if (!clientId) return Errors.badRequest('clientId is required');

  try {
    const funnel = await getFunnelAnalysis(clientId, days);
    return successResponse(funnel);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get funnel data';
    return Errors.internal(message);
  }
}
