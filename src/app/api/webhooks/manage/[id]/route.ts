import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Webhook from '@/models/Webhook';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

/**
 * PATCH /api/webhooks/manage/[id]
 * Update url, events, and/or isActive for an owned webhook.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    await connectDB();

    // Find the webhook and verify ownership via organizationId
    const ownershipFilter = auth.organizationId
      ? { _id: id, $or: [{ userId: auth.userId }, { organizationId: auth.organizationId }] }
      : { _id: id, userId: auth.userId };

    const webhook = await Webhook.findOne(ownershipFilter);
    if (!webhook) {
      return Errors.notFound('Webhook not found or access denied');
    }

    const body = await request.json();
    const { url, events, isActive } = body as { url?: string; events?: string[]; isActive?: boolean };

    // Validate URL if provided
    if (url !== undefined) {
      try {
        new URL(url);
      } catch {
        return Errors.badRequest('Invalid URL format');
      }
      webhook.url = url;
    }

    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return Errors.badRequest('events must be a non-empty array');
      }
      webhook.events = events as typeof webhook.events;
    }

    if (isActive !== undefined) {
      webhook.isActive = isActive;
    }

    await webhook.save();

    const updated = webhook.toObject();
    delete (updated as unknown as Record<string, unknown>).secret;

    return successResponse({ webhook: updated }, 'Webhook updated');
  } catch (error) {
    console.error('PATCH /api/webhooks/manage/[id] error:', error);
    return Errors.internal('Failed to update webhook');
  }
}

/**
 * DELETE /api/webhooks/manage/[id]
 * Remove an owned webhook.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const { id } = await params;

  try {
    await connectDB();

    const ownershipFilter = auth.organizationId
      ? { _id: id, $or: [{ userId: auth.userId }, { organizationId: auth.organizationId }] }
      : { _id: id, userId: auth.userId };

    const result = await Webhook.deleteOne(ownershipFilter);

    if (result.deletedCount === 0) {
      return Errors.notFound('Webhook not found or access denied');
    }

    return successResponse(null, 'Webhook deleted');
  } catch (error) {
    console.error('DELETE /api/webhooks/manage/[id] error:', error);
    return Errors.internal('Failed to delete webhook');
  }
}
