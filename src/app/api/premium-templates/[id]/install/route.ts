import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { installTemplate } from '@/lib/marketplaceService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const clientId = body.clientId as string | undefined;

    if (!clientId) {
      return Errors.badRequest('clientId is required');
    }

    const result = await installTemplate(id, auth.userId, clientId);
    return successResponse(result, 'Template installed successfully');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Install failed';
    return Errors.badRequest(message);
  }
}
