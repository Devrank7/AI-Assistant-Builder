import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { reviewAgent } from '@/lib/agentStoreService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  try {
    const body = await request.json();
    if (!body.rating || body.rating < 1 || body.rating > 5) {
      return Errors.badRequest('Rating must be between 1 and 5');
    }

    const agent = await reviewAgent(id, body.rating, body.review || '');
    if (!agent) return Errors.notFound('Agent not found');
    return successResponse(agent, 'Review submitted');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit review';
    return Errors.badRequest(message);
  }
}
