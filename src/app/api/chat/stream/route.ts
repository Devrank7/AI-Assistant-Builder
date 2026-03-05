import { NextRequest, NextResponse } from 'next/server';
import { routeMessageStream } from '@/lib/channelRouter';

export async function POST(request: NextRequest) {
  try {
    const { clientId, message, conversationHistory, sessionId, metadata, image } = await request.json();

    if (!clientId || !message) {
      return NextResponse.json({ success: false, error: 'clientId and message are required' }, { status: 400 });
    }

    const result = await routeMessageStream({
      channel: 'website',
      clientId,
      message,
      sessionId,
      conversationHistory,
      metadata,
      image,
    });

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: result.status || 500 });
    }

    return new Response(result.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[Stream] Top-level error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate response' }, { status: 500 });
  }
}
