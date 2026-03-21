import { NextRequest, NextResponse } from 'next/server';
import { processWhatsAppWebhook } from '@/lib/whatsappService';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * GET /api/webhooks/whatsapp — WhatsApp webhook verification
 */
export async function GET(request: NextRequest) {
  const mode = request.nextUrl.searchParams.get('hub.mode');
  const token = request.nextUrl.searchParams.get('hub.verify_token');
  const challenge = request.nextUrl.searchParams.get('hub.challenge');

  if (VERIFY_TOKEN && mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('[WhatsApp] Webhook verified');
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp — Incoming WhatsApp messages
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Process asynchronously so we respond to Meta quickly
    processWhatsAppWebhook(body).catch((err) => console.error('[WhatsApp] Webhook processing error:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[WhatsApp] Webhook error:', error);
    return NextResponse.json({ success: true }); // Always return 200 to Meta
  }
}
