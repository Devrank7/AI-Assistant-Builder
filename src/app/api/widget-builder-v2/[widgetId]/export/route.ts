import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse } from '@/lib/apiResponse';
import { exportToThemeJson } from '@/lib/widgetBuilderV2';

export async function GET(request: NextRequest, { params }: { params: Promise<{ widgetId: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { widgetId } = await params;
  const themeJson = await exportToThemeJson(widgetId);
  return successResponse(themeJson);
}
