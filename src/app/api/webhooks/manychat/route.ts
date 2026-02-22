import { NextRequest, NextResponse } from 'next/server';
import { processManyChatWebhook } from '@/lib/manychatService';

/**
 * POST /api/webhooks/manychat — ManyChat External Request webhook
 *
 * Setup in ManyChat:
 * 1. Create a Flow triggered by "Default Reply" or keyword
 * 2. Add an "External Request" action
 * 3. Set URL: https://your-domain.com/api/webhooks/manychat
 * 4. Method: POST, Content-Type: application/json
 * 5. Add body fields: subscriber_id, first_name, last_name, ig_id, last_input_text
 * 6. In Response Mapping, map the response content to a message
 *
 * The response follows ManyChat's Dynamic Content format.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await processManyChatWebhook(body);
    return NextResponse.json(response);
  } catch (error) {
    console.error('[ManyChat] Webhook error:', error);
    return NextResponse.json({
      version: 'v2',
      content: {
        type: 'instagram',
        messages: [{ type: 'text', text: 'Произошла ошибка. Попробуйте позже.' }],
        actions: [],
        quick_replies: [],
      },
    });
  }
}

/**
 * GET /api/webhooks/manychat — Health check
 */
export async function GET() {
  return NextResponse.json({ status: 'ok', provider: 'manychat' });
}
