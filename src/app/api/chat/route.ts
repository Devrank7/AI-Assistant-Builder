import { NextRequest, NextResponse } from 'next/server';
import { routeMessage } from '@/lib/channelRouter';

export async function POST(request: NextRequest) {
  try {
    const { clientId, message, conversationHistory, sessionId, metadata } = await request.json();

    if (!clientId || !message) {
      return NextResponse.json({ success: false, error: 'clientId and message are required' }, { status: 400 });
    }

    const result = await routeMessage({
      channel: 'website',
      clientId,
      message,
      sessionId,
      conversationHistory,
      metadata,
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 429 });
    }

    return NextResponse.json({
      success: true,
      response: result.response,
      richBlocks: result.richBlocks,
      model: result.model,
      tokensUsed: {
        input: result.inputTokens,
        output: result.outputTokens,
        total: result.inputTokens + result.outputTokens,
      },
      costUsd: result.costUsd,
      ...(result.costWarning ? { costWarning: result.costWarning } : {}),
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate response' }, { status: 500 });
  }
}
