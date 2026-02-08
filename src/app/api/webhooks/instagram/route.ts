import { NextRequest, NextResponse } from 'next/server';
import { processInstagramWebhook } from '@/lib/instagramService';

const VERIFY_TOKEN = process.env.INSTAGRAM_VERIFY_TOKEN || 'winbix_instagram_verify';

/**
 * GET /api/webhooks/instagram — Instagram webhook verification
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[Instagram] Webhook verified');
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST /api/webhooks/instagram — Incoming Instagram messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    processInstagramWebhook(body).catch((err) => console.error('[Instagram] Webhook processing error:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Instagram] Webhook error:', error);
    return NextResponse.json({ success: true }); // Always return 200 to Meta
  }
}
