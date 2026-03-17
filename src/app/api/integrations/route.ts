import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();
  const manifests = pluginRegistry.getAllManifests();
  return successResponse(manifests);
}
