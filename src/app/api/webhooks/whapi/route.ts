import { NextRequest, NextResponse } from 'next/server';
import { processWhapiWebhook } from '@/lib/whatsappService';

/**
 * POST /api/webhooks/whapi — Incoming Whapi.cloud webhook
 *
 * Set this URL in Whapi.cloud channel settings:
 * https://your-domain.com/api/webhooks/whapi
 *
 * Enable events: messages.post
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Process asynchronously so we respond quickly
    processWhapiWebhook(body).catch((err) => console.error('[Whapi] Webhook processing error:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Whapi] Webhook error:', error);
    return NextResponse.json({ success: true }); // Always return 200
  }
}

/**
 * GET /api/webhooks/whapi — Health check (Whapi doesn't require verification like Meta)
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', provider: 'whapi.cloud' });
}
