import { NextRequest, NextResponse } from 'next/server';
import { routeMessage } from '@/lib/channelRouter';
import { checkMessageLimit } from '@/lib/planLimits';
import Client from '@/models/Client';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { clientId, message, conversationHistory, sessionId, metadata } = await request.json();

    if (!clientId || !message) {
      return NextResponse.json({ success: false, error: 'clientId and message are required' }, { status: 400 });
    }

    // Message limit check (same as stream endpoint)
    await connectDB();
    const client = await Client.findOne({ clientId }).select('userId').lean();
    if (client?.userId) {
      const user = await User.findById(client.userId).select('plan').lean();
      if (user?.plan) {
        const limitCheck = await checkMessageLimit(String(client.userId), user.plan as import('@/models/User').Plan);
        if (!limitCheck.allowed) {
          return NextResponse.json(
            {
              success: false,
              error: `Message limit reached (${limitCheck.used}/${limitCheck.limit}). Please upgrade your plan.`,
            },
            { status: 429 }
          );
        }
      }
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
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate response' }, { status: 500 });
  }
}
