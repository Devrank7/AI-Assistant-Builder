import { NextRequest } from 'next/server';
import { verifyApiKey } from '@/lib/apiKeyAuth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { executeQuery } from '@/lib/graphql/executor';

export async function POST(request: NextRequest) {
  const auth = await verifyApiKey(request);
  if (!auth.authenticated) return auth.response;

  try {
    const body = await request.json();
    const { query, variables } = body;

    if (!query || typeof query !== 'string') {
      return Errors.badRequest('Missing or invalid "query" field');
    }

    const result = await executeQuery(query, variables || {}, {
      userId: auth.userId,
      organizationId: auth.organizationId,
    });

    return successResponse(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'GraphQL execution failed';
    return Errors.internal(message);
  }
}
