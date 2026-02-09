import { NextRequest, NextResponse } from 'next/server';

const REPORT_BOT_TOKEN = '8560273693:AAG2okukMLX-x94cyH_AD9BnQ6pdcGztwC8';

export async function POST(request: NextRequest) {
  try {
    const adminToken = request.cookies.get('admin_token')?.value;
    const expectedToken = process.env.ADMIN_SECRET_TOKEN;

    if (!expectedToken || adminToken !== expectedToken) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, chatId, botToken } = body;

    if (!message) {
      return NextResponse.json({ success: false, error: 'message is required' }, { status: 400 });
    }

    // Support multiple chat IDs: comma-separated in env var or array/string in body
    const rawChatIds = chatId || process.env.TELEGRAM_REPORT_CHAT_ID;
    if (!rawChatIds) {
      return NextResponse.json(
        { success: false, error: 'No chat ID provided. Set TELEGRAM_REPORT_CHAT_ID env var or pass chatId.' },
        { status: 400 }
      );
    }

    const chatIds: string[] = Array.isArray(rawChatIds)
      ? rawChatIds.map(String)
      : String(rawChatIds)
          .split(',')
          .map((id: string) => id.trim())
          .filter(Boolean);

    const targetBotToken = botToken || REPORT_BOT_TOKEN;

    const results = await Promise.allSettled(
      chatIds.map(async (id) => {
        const response = await fetch(`https://api.telegram.org/bot${targetBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: id,
            text: message,
            parse_mode: 'HTML',
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.ok) {
          throw new Error(data.description || 'Telegram API error');
        }
        return id;
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => r.reason?.message || 'Unknown error');

    if (sent === 0) {
      return NextResponse.json({ success: false, error: `All sends failed: ${failed.join('; ')}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, sent, total: chatIds.length, failed });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
    return NextResponse.json({ success: false, error: 'Failed to send notification' }, { status: 500 });
  }
}
