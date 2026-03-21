import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { purchaseTemplate } from '@/lib/marketplaceService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    const result = await purchaseTemplate(id, auth.userId);
    return successResponse(result, 'Purchase completed');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Purchase failed';
    return Errors.badRequest(message);
  }
}
