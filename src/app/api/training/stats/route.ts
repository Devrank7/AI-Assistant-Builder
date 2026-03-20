import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getTrainingStats } from '@/lib/trainingStudio';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');

  if (!clientId) return Errors.badRequest('clientId is required');

  // Verify ownership
  await connectDB();
  const client = await Client.findOne({ clientId, userId: auth.userId });
  if (!client) return Errors.forbidden('Not authorized for this widget');

  try {
    const stats = await getTrainingStats(clientId);
    return successResponse(stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to get training stats';
    return Errors.internal(message);
  }
}
