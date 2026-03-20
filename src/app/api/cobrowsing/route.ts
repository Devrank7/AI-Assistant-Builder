import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getActiveSessions, createSession } from '@/lib/coBrowsingService';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const sessions = await getActiveSessions(auth.userId);
    return successResponse(sessions);
  } catch (error) {
    console.error('Get co-browsing sessions error:', error);
    return Errors.internal('Failed to fetch co-browsing sessions');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { clientId, visitorId } = await request.json();
    if (!clientId || !visitorId) {
      return Errors.badRequest('clientId and visitorId are required');
    }

    const session = await createSession(clientId, visitorId, auth.userId);
    return successResponse(session, 'Co-browsing session created', 201);
  } catch (error) {
    console.error('Create co-browsing session error:', error);
    return Errors.internal('Failed to create co-browsing session');
  }
}
