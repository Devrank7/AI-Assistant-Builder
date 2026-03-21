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
    const { rating, comment } = body;

    if (!rating || rating < 1 || rating > 5) {
      return Errors.badRequest('Rating must be between 1 and 5');
    }
    if (!comment || typeof comment !== 'string' || comment.trim().length < 10) {
      return Errors.badRequest('Comment must be at least 10 characters');
    }

    const userName = auth.user.email?.split('@')[0] || 'Anonymous';
    const agent = await reviewAgent(id, auth.userId, userName, rating, comment.trim());
    if (!agent) return Errors.notFound('Agent not found');
    return successResponse(agent, 'Review submitted');
  } catch (err: unknown) {
    return Errors.badRequest(err instanceof Error ? err.message : 'Failed to submit review');
  }
}
