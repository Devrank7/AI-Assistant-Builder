import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { installAgent } from '@/lib/agentStoreService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    // clientId can be passed in body, or defaults to userId (personal workspace)
    const clientId: string = (body as { clientId?: string }).clientId || auth.userId;

    const result = await installAgent(id, clientId, auth.userId);
    return successResponse(result, 'Agent installed successfully');
  } catch (err: unknown) {
    return Errors.badRequest(err instanceof Error ? err.message : 'Failed to install agent');
  }
}
