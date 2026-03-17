import { NextRequest } from 'next/server';
import { verifyUser, applyRateLimit } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(request, 'api');
  if (rateLimited) return rateLimited;

  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();

  const { widgetId, slug, action, params } = await request.json();
  if (!widgetId || !slug || !action) {
    return Errors.badRequest('widgetId, slug, and action are required');
  }

  const result = await pluginRegistry.executeAction(slug, action, params || {}, auth.userId, widgetId);
  if (!result.success) return Errors.badRequest(result.error || 'Action execution failed');

  return successResponse(result.data);
}
