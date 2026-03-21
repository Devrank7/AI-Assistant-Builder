import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { listAgents, submitAgent, seedDefaultAgents } from '@/lib/agentStoreService';
import { AgentCategory } from '@/models/AgentStoreItem';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const url = new URL(request.url);
  const filters = {
    search: url.searchParams.get('search') || undefined,
    category: url.searchParams.get('category') || undefined,
    pricing: (url.searchParams.get('pricing') as 'free' | 'premium' | 'all') || undefined,
    sort: (url.searchParams.get('sort') as 'rating' | 'installs' | 'newest' | 'featured') || 'featured',
    page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 20,
  };

  let result = await listAgents(filters);

  // Seed if empty
  if (result.agents.length === 0 && result.total === 0) {
    await seedDefaultAgents();
    result = await listAgents(filters);
  }

  return successResponse(result);
}

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { name, description, longDescription, category, tags, config, pricing } = body;

    if (!name || !description || !category || !config?.systemPrompt || !config?.greeting) {
      return Errors.badRequest(
        'Missing required fields: name, description, category, config.systemPrompt, config.greeting'
      );
    }

    const agent = await submitAgent(auth.userId, auth.user.email || 'Unknown', {
      name,
      description,
      longDescription,
      category: category as AgentCategory,
      tags,
      config,
      pricing,
    });

    return successResponse(agent, 'Agent submitted for review');
  } catch (err: unknown) {
    return Errors.badRequest(err instanceof Error ? err.message : 'Failed to submit agent');
  }
}
