import { NextRequest } from 'next/server';
import { verifyUser, applyRateLimit } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';
import { encrypt } from '@/lib/encryption';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

export async function POST(request: NextRequest) {
  const rateLimited = applyRateLimit(request, 'api');
  if (rateLimited) return rateLimited;

  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();

  if (auth.user.plan !== 'pro') {
    return Errors.forbidden('Pro plan required');
  }

  const { slug, credentials } = await request.json();
  if (!slug || !credentials) return Errors.badRequest('slug and credentials are required');

  const plugin = pluginRegistry.get(slug);
  if (!plugin) return Errors.badRequest(`Unknown integration: ${slug}`);

  const result = await plugin.connect(credentials);
  if (!result.success) return Errors.badRequest(result.error || 'Connection failed');

  await connectDB();

  const existing = await Integration.findOne({ userId: auth.userId, provider: slug, status: 'connected' });
  if (existing) return Errors.badRequest('Integration already connected');

  // Encrypt credentials before storing
  const encryptedAccessToken = credentials.apiKey ? encrypt(credentials.apiKey) : undefined;
  const encryptedRefreshToken = credentials.refreshToken ? encrypt(credentials.refreshToken) : undefined;

  const integration = await Integration.create({
    userId: auth.userId,
    provider: slug,
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    status: 'connected',
    isActive: true,
    metadata: result.metadata || {},
  });

  return successResponse({ connectionId: String(integration._id) }, 'Connected successfully');
}
