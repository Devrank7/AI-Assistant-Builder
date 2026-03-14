import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { decrypt, encrypt } from '@/lib/encryption';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';
import { getCRMAdapter } from '@/lib/integrations/registry';
import { CRMContact } from '@/lib/integrations/types';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  if (auth.user.plan !== 'pro') {
    return Errors.forbidden('CRM sync requires a Pro plan');
  }

  const body = await request.json();
  const { provider, contact } = body as { provider: string; contact: CRMContact };

  if (!provider || !contact?.email) {
    return Errors.badRequest('provider and contact.email are required');
  }

  const adapter = getCRMAdapter(provider);
  if (!adapter) {
    return Errors.badRequest(`Unsupported CRM provider: ${provider}`);
  }

  await connectDB();
  const integration = await Integration.findOne({ userId: auth.userId, provider, isActive: true });

  if (!integration) {
    return Errors.notFound(`No active ${provider} integration found`);
  }

  let accessToken: string;
  try {
    accessToken = decrypt(integration.accessToken);
  } catch {
    return Errors.internal('Failed to decrypt access token');
  }

  // Check if token is expired and try to refresh
  if (integration.tokenExpiry && new Date(integration.tokenExpiry) < new Date()) {
    if (adapter.refreshToken && integration.refreshToken) {
      try {
        const refreshed = await adapter.refreshToken(decrypt(integration.refreshToken));
        accessToken = refreshed.accessToken;

        // Update stored tokens
        integration.accessToken = encrypt(refreshed.accessToken);
        if (refreshed.refreshToken) {
          integration.refreshToken = encrypt(refreshed.refreshToken);
        }
        if (refreshed.expiresIn) {
          integration.tokenExpiry = new Date(Date.now() + refreshed.expiresIn * 1000);
        }
        await integration.save();
      } catch {
        return Errors.internal('Token expired and refresh failed. Please reconnect the integration.');
      }
    } else {
      return Errors.badRequest('Token expired. Please reconnect the integration.');
    }
  }

  try {
    const result = await adapter.createContact(contact, accessToken);
    return successResponse({ contactId: result.id, provider }, 'Contact synced successfully');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Errors.internal(`Failed to sync contact: ${message}`);
  }
}
