import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import { verifyAdminOrClient } from '@/lib/auth';

// GET - Get single chat log by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const log = await ChatLog.findById(id);

    if (!log) {
      return NextResponse.json({ success: false, error: 'Chat log not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      log: {
        _id: log._id,
        clientId: log.clientId,
        sessionId: log.sessionId,
        messages: log.messages,
        metadata: log.metadata,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error fetching chat log:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch chat log' }, { status: 500 });
  }
}

// DELETE - Delete a chat log
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    const log = await ChatLog.findById(id);

    if (!log) {
      return NextResponse.json({ success: false, error: 'Chat log not found' }, { status: 404 });
    }

    // Clients can only delete their own chat logs
    if (auth.role === 'client' && log.clientId !== auth.clientId) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    await ChatLog.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      message: 'Chat log deleted',
    });
  } catch (error) {
    console.error('Error deleting chat log:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete chat log' }, { status: 500 });
  }
}
