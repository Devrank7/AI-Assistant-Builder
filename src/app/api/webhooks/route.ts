import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Webhook from '@/models/Webhook';
import { generateWebhookSecret } from '@/lib/webhookService';

/**
 * GET /api/webhooks?clientId=xxx
 * List webhooks for a client
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const clientId = new URL(request.url).searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const webhooks = await Webhook.find({ clientId }).sort({ createdAt: -1 }).lean();

    return NextResponse.json({ success: true, webhooks });
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch webhooks' }, { status: 500 });
  }
}

/**
 * POST /api/webhooks
 * Create a new webhook
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const { clientId, url, events } = await request.json();

    if (!clientId || !url || !events?.length) {
      return NextResponse.json({ success: false, error: 'clientId, url, and events are required' }, { status: 400 });
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL' }, { status: 400 });
    }

    // Limit webhooks per client
    const count = await Webhook.countDocuments({ clientId });
    if (count >= 5) {
      return NextResponse.json({ success: false, error: 'Maximum 5 webhooks per client' }, { status: 400 });
    }

    const secret = generateWebhookSecret();

    const webhook = await Webhook.create({
      clientId,
      url,
      events,
      secret,
      isActive: true,
    });

    return NextResponse.json({ success: true, webhook, secret }, { status: 201 });
  } catch (error) {
    console.error('Error creating webhook:', error);
    return NextResponse.json({ success: false, error: 'Failed to create webhook' }, { status: 500 });
  }
}

/**
 * DELETE /api/webhooks?id=xxx&clientId=xxx
 * Delete a webhook
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const clientId = searchParams.get('clientId');

    if (!id || !clientId) {
      return NextResponse.json({ success: false, error: 'id and clientId are required' }, { status: 400 });
    }

    const result = await Webhook.deleteOne({ _id: id, clientId });

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: 'Webhook not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete webhook' }, { status: 500 });
  }
}
