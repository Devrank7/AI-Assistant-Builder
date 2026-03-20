import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { addTrainingExample } from '@/lib/trainingStudio';
import connectDB from '@/lib/mongodb';
import TrainingExample from '@/models/TrainingExample';
import Client from '@/models/Client';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('clientId');
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);

  if (!clientId) return Errors.badRequest('clientId is required');

  // Verify ownership
  await connectDB();
  const client = await Client.findOne({ clientId, userId: auth.userId });
  if (!client) return Errors.forbidden('Not authorized for this widget');

  const query: Record<string, unknown> = { clientId };
  if (status) query.status = status;

  const [examples, total] = await Promise.all([
    TrainingExample.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    TrainingExample.countDocuments(query),
  ]);

  return successResponse({ examples, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { clientId, userMessage, idealResponse, actualResponse, category, tags } = body;

    if (!clientId || !userMessage || !idealResponse) {
      return Errors.badRequest('clientId, userMessage, and idealResponse are required');
    }

    // Verify ownership
    await connectDB();
    const client = await Client.findOne({ clientId, userId: auth.userId });
    if (!client) return Errors.forbidden('Not authorized for this widget');

    const example = await addTrainingExample({
      clientId,
      userId: auth.userId,
      userMessage,
      idealResponse,
      actualResponse,
      category,
      tags,
    });

    return successResponse(example, 'Training example created');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create training example';
    return Errors.badRequest(message);
  }
}
