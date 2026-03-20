import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { installAgent } from '@/lib/agentStoreService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  try {
    const agent = await installAgent(id);
    if (!agent) return Errors.notFound('Agent not found');
    return successResponse(agent, 'Agent installed successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to install agent';
    return Errors.badRequest(message);
  }
}
