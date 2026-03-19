import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Feedback from '@/models/Feedback';
import AISettings from '@/models/AISettings';
import { verifyAdminOrClient } from '@/lib/auth';
import { processNegativeFeedback } from '@/lib/autoLearning';

/**
 * POST /api/feedback — Save message feedback (from widget, public)
 */
export async function POST(request: NextRequest) {
  try {
    const { clientId, sessionId, messageIndex, rating, comment } = await request.json();

    if (!clientId || !sessionId || messageIndex === undefined || !rating) {
      return NextResponse.json(
        { success: false, error: 'clientId, sessionId, messageIndex, and rating are required' },
        { status: 400 }
      );
    }

    if (!['up', 'down'].includes(rating)) {
      return NextResponse.json({ success: false, error: 'rating must be "up" or "down"' }, { status: 400 });
    }

    await connectDB();

    await Feedback.findOneAndUpdate(
      { clientId, sessionId, messageIndex },
      { rating, comment },
      { upsert: true, new: true }
    );

    // Auto-learning: process negative feedback to generate corrections
    if (rating === 'down') {
      const settings = (await AISettings.findOne({ clientId }).select('autoLearningEnabled').lean()) as {
        autoLearningEnabled?: boolean;
      } | null;
      if (settings?.autoLearningEnabled) {
        processNegativeFeedback(clientId, sessionId, messageIndex, comment).catch((err) =>
          console.error('[AutoLearning] Background processing error:', err)
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save feedback' }, { status: 500 });
  }
}

/**
 * GET /api/feedback?clientId=X — Get feedback with stats (admin/client auth)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId required' }, { status: 400 });
    }

    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const [totalUp, totalDown, recentFeedback] = await Promise.all([
      Feedback.countDocuments({ clientId, rating: 'up' }),
      Feedback.countDocuments({ clientId, rating: 'down' }),
      Feedback.find({ clientId }).sort({ createdAt: -1 }).limit(50).lean(),
    ]);

    const total = totalUp + totalDown;
    const satisfactionPercent = total > 0 ? Math.round((totalUp / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      stats: { totalUp, totalDown, total, satisfactionPercent },
      feedback: recentFeedback,
    });
  } catch (error) {
    console.error('Feedback fetch error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch feedback' }, { status: 500 });
  }
}
