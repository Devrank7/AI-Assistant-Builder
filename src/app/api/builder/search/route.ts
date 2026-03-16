import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { Errors, successResponse } from '@/lib/apiResponse';
import { webSearch } from '@/lib/builder/webSearch';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const query = request.nextUrl.searchParams.get('q');
  if (!query) return Errors.badRequest('q parameter required');

  const count = parseInt(request.nextUrl.searchParams.get('count') || '10', 10);
  const results = await webSearch(query, Math.min(count, 20));
  return successResponse({ results });
}
