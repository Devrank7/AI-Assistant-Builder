import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getAgentById } from '@/lib/agentStoreService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;
  const agent = await getAgentById(id);
  if (!agent) return Errors.notFound('Agent not found');

  return successResponse(agent);
}
