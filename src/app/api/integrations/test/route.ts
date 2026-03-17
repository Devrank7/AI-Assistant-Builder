import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();

  const { slug, credentials } = await request.json();
  if (!slug || !credentials) return Errors.badRequest('slug and credentials are required');

  const plugin = pluginRegistry.get(slug);
  if (!plugin) return Errors.badRequest(`Unknown integration: ${slug}`);

  const result = await plugin.testConnection(credentials);
  return successResponse(result);
}
