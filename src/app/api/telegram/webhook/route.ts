/**
 * Telegram Webhook API
 *
 * POST /api/telegram/webhook - Receive updates from Telegram
 *
 * Setup webhook:
 * curl "https://api.telegram.org/bot{TOKEN}/setWebhook?url={YOUR_DOMAIN}/api/telegram/webhook"
 */

import { NextRequest, NextResponse } from 'next/server';
import { processTelegramUpdate } from '@/lib/telegramBot';

export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Process update in background
    await processTelegramUpdate(update);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true }); // Always return 200 to Telegram
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Telegram webhook endpoint',
    message: 'Use POST to receive updates from Telegram Bot API',
  });
}
