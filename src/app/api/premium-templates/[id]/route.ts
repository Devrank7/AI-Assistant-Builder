import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getTemplateById } from '@/lib/marketplaceService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  const template = await getTemplateById(id);
  if (!template) return Errors.notFound('Template not found');

  return successResponse(template);
}
