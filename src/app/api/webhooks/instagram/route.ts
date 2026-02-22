import { NextRequest, NextResponse } from 'next/server';
import { processGlobalInstagramWebhook, processInstagramWebhook } from '@/lib/instagramService';

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
 *
 * Tries global auto-responder first. If the pageId doesn't match
 * the global config, falls back to per-client ChannelConfig flow.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Process asynchronously — always return 200 to Meta immediately
    (async () => {
      try {
        // Try global handler first
        const handled = await processGlobalInstagramWebhook(body);

        // If not handled by global, try per-client
        if (!handled) {
          await processInstagramWebhook(body);
        }
      } catch (err) {
        console.error('[Instagram] Webhook processing error:', err);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Instagram] Webhook error:', error);
    return NextResponse.json({ success: true }); // Always return 200 to Meta
  }
}
