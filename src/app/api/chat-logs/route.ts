import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import { verifyAdminOrClient } from '@/lib/auth';

// GET - List chat logs for a client
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    // Auth Check
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role === 'client' && auth.clientId !== clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ChatLog.find({ clientId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('sessionId messages metadata createdAt'),
      ChatLog.countDocuments({ clientId }),
    ]);

    return NextResponse.json({
      success: true,
      logs: logs.map((log) => ({
        _id: log._id,
        sessionId: log.sessionId,
        messageCount: log.messages.length,
        lastMessage: log.messages[log.messages.length - 1]?.content?.substring(0, 100),
        createdAt: log.createdAt,
        metadata: log.metadata,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching chat logs:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch chat logs' }, { status: 500 });
  }
}
