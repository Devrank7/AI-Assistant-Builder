import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Webhook from '@/models/Webhook';
import Client from '@/models/Client';
import { generateWebhookSecret } from '@/lib/webhookService';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

/**
 * GET /api/webhooks/manage
 * List all webhooks for the authenticated user's widgets.
 */
export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  try {
    await connectDB();

    // Resolve the set of clientIds owned by this user (direct or via org)
    const clientQuery = auth.organizationId
      ? { $or: [{ userId: auth.userId }, { organizationId: auth.organizationId }] }
      : { userId: auth.userId };

    const clients = await Client.find(clientQuery).select('clientId').lean();
    const clientIds = clients.map((c) => c.clientId);

    const webhooks = await Webhook.find({ clientId: { $in: clientIds } })
      .select('-secret') // never expose secret in list
      .sort({ createdAt: -1 })
      .lean();

    return successResponse({ webhooks, total: webhooks.length });
  } catch (error) {
    console.error('GET /api/webhooks/manage error:', error);
    return Errors.internal('Failed to fetch webhooks');
  }
}

/**
 * POST /api/webhooks/manage
 * Create a new webhook for one of the user's widgets.
 * Body: { clientId, url, events }
 * Returns the webhook record + the plain-text secret (shown once only).
 */
export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  try {
    await connectDB();

    const body = await request.json();
    const { clientId, url, events } = body as { clientId?: string; url?: string; events?: string[] };

    if (!clientId || !url || !Array.isArray(events) || events.length === 0) {
      return Errors.badRequest('clientId, url, and at least one event are required');
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return Errors.badRequest('Invalid URL format');
    }

    // Verify the requesting user owns this widget
    const ownershipQuery = auth.organizationId
      ? { clientId, $or: [{ userId: auth.userId }, { organizationId: auth.organizationId }] }
      : { clientId, userId: auth.userId };

    const client = await Client.findOne(ownershipQuery).select('clientId').lean();
    if (!client) {
      return Errors.forbidden('Widget not found or access denied');
    }

    // Enforce per-client webhook limit
    const existingCount = await Webhook.countDocuments({ clientId });
    if (existingCount >= 5) {
      return Errors.badRequest('Maximum 5 webhooks per widget');
    }

    const secret = generateWebhookSecret();

    const webhook = await Webhook.create({
      clientId,
      url,
      events,
      secret,
      isActive: true,
      userId: auth.userId,
      organizationId: auth.organizationId ?? undefined,
    });

    // Return the full document minus the secret field, plus the plain secret separately
    const { secret: _secret, ...webhookData } = webhook.toObject();

    return successResponse(
      { webhook: webhookData, secret },
      'Webhook created. Save the secret — it will not be shown again.',
      201
    );
  } catch (error) {
    console.error('POST /api/webhooks/manage error:', error);
    return Errors.internal('Failed to create webhook');
  }
}
