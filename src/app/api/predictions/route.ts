import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import {
  calculateExitProbability,
  generateNudgeMessage,
  recordPrediction,
  listPredictions,
} from '@/lib/predictiveEngagement';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) return Errors.badRequest('clientId is required');

    const predictions = await listPredictions(clientId);
    return successResponse(predictions);
  } catch (error) {
    console.error('Get predictions error:', error);
    return Errors.internal('Failed to fetch predictions');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { clientId, visitorId, sessionId, signals, pageContext } = await request.json();
    if (!clientId || !visitorId || !sessionId || !signals) {
      return Errors.badRequest('clientId, visitorId, sessionId, and signals are required');
    }

    const prediction = calculateExitProbability(signals);
    const nudgeMessage =
      prediction.recommendedAction !== 'none'
        ? generateNudgeMessage(clientId, prediction.engagementScore, pageContext)
        : undefined;

    const saved = await recordPrediction(clientId, visitorId, sessionId, {
      ...prediction,
      nudgeMessage,
    });

    return successResponse(saved, 'Prediction recorded', 201);
  } catch (error) {
    console.error('Create prediction error:', error);
    return Errors.internal('Failed to create prediction');
  }
}
