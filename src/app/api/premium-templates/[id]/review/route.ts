import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { reviewTemplate } from '@/lib/marketplaceService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const { rating, comment } = body;

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return Errors.badRequest('Rating must be a number between 1 and 5');
    }

    const result = await reviewTemplate(id, auth.userId, auth.user.email, rating, comment || '');

    return successResponse(result, 'Review submitted');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Review failed';
    return Errors.badRequest(message);
  }
}
