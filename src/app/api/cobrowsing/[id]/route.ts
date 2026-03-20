import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getSessionById, addHighlight, updateScroll, endSession } from '@/lib/coBrowsingService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const session = await getSessionById(id);
    if (!session) return Errors.notFound('Session not found');

    return successResponse(session);
  } catch (error) {
    console.error('Get co-browsing session error:', error);
    return Errors.internal('Failed to fetch session');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const body = await request.json();

    if (body.highlight) {
      const { selector, label, color } = body.highlight;
      const highlight = await addHighlight(id, selector, label || '', color || '#FFEB3B');
      if (!highlight) return Errors.notFound('Session not found or already ended');
      return successResponse(highlight);
    }

    if (body.scrollPosition) {
      await updateScroll(id, body.scrollPosition.x, body.scrollPosition.y);
      return successResponse(null, 'Scroll position updated');
    }

    return Errors.badRequest('Provide highlight or scrollPosition');
  } catch (error) {
    console.error('Update co-browsing session error:', error);
    return Errors.internal('Failed to update session');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const session = await endSession(id);
    if (!session) return Errors.notFound('Session not found');

    return successResponse(session, 'Session ended');
  } catch (error) {
    console.error('End co-browsing session error:', error);
    return Errors.internal('Failed to end session');
  }
}
