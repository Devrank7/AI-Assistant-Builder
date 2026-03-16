import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { Errors, successResponse } from '@/lib/apiResponse';
import { webFetch } from '@/lib/builder/webFetch';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const body = await request.json();
  const { url } = body;
  if (!url || typeof url !== 'string') return Errors.badRequest('url is required');

  const result = await webFetch(url);
  if (result.error) {
    return Errors.badRequest(result.error);
  }
  return successResponse({ content: result.content });
}
