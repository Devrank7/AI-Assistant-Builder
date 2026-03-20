import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { listAgents, submitAgent } from '@/lib/agentStoreService';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const url = new URL(request.url);
  const filters = {
    category: url.searchParams.get('category') || undefined,
    niche: url.searchParams.get('niche') || undefined,
    search: url.searchParams.get('search') || undefined,
    sort: (url.searchParams.get('sort') as 'newest' | 'popular' | 'rating') || undefined,
    page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20,
  };

  const result = await listAgents(filters);
  return successResponse(result);
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    if (!body.name || !body.description || !body.niche || !body.systemPrompt) {
      return Errors.badRequest('Missing required fields: name, description, niche, systemPrompt');
    }

    const agent = await submitAgent(auth.userId, {
      ...body,
      authorName: auth.user?.email || '',
    });

    return successResponse(agent, 'Agent submitted for review');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit agent';
    return Errors.badRequest(message);
  }
}
