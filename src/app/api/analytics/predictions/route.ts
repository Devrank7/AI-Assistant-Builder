import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getPredictiveChurnScores } from '@/lib/advancedAnalytics';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) return Errors.badRequest('clientId is required');

  try {
    const predictions = await getPredictiveChurnScores(clientId);
    return successResponse(predictions);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get predictions';
    return Errors.internal(message);
  }
}
