import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { applyTrainingExamples } from '@/lib/trainingStudio';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { clientId } = body;

    if (!clientId) return Errors.badRequest('clientId is required');

    // Verify ownership
    await connectDB();
    const client = await Client.findOne({ clientId, userId: auth.userId });
    if (!client) return Errors.forbidden('Not authorized for this widget');

    const result = await applyTrainingExamples(clientId);
    return successResponse(result, `Applied ${result.applied} training examples to knowledge base`);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to apply training examples';
    return Errors.internal(message);
  }
}
