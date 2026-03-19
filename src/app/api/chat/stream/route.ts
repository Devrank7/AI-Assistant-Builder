import { NextRequest, NextResponse } from 'next/server';
import { routeMessageStream } from '@/lib/channelRouter';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import User from '@/models/User';
import { checkMessageLimit } from '@/lib/planLimits';

export async function POST(request: NextRequest) {
  try {
    const { clientId, message, conversationHistory, sessionId, metadata, image } = await request.json();

    if (!clientId || !message) {
      return NextResponse.json({ success: false, error: 'clientId and message are required' }, { status: 400 });
    }

    // --- Message limit enforcement ---
    await connectDB();
    const client = await Client.findOne({ clientId }).lean();
    if (client) {
      const userId = (client as { userId?: string }).userId;
      if (userId) {
        const user = await User.findById(userId).lean();
        if (user) {
          const plan = (user as { plan?: string }).plan || 'none';
          const limitCheck = await checkMessageLimit(userId, plan as import('@/models/User').Plan);
          if (!limitCheck.allowed) {
            return NextResponse.json(
              {
                success: false,
                error: 'MESSAGE_LIMIT_EXCEEDED',
                message: `Monthly message limit reached (${limitCheck.used}/${limitCheck.limit}). Please upgrade your plan.`,
                used: limitCheck.used,
                limit: limitCheck.limit,
              },
              { status: 429 }
            );
          }
        }
      }
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
