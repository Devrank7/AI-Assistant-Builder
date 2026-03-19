/**
 * Inbox Thread Detail API
 *
 * PATCH /api/inbox/[sessionId] - Update thread (status, priority, assign, tags)
 * POST /api/inbox/[sessionId] - Mark as read / generate AI reply
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminOrClient } from '@/lib/auth';
import { updateThreadStatus, markThreadRead, generateSuggestedReply } from '@/lib/inboxManager';
import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import AISettings from '@/models/AISettings';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;
    const body = await request.json();
    const { clientId, status, priority, assignedTo, snoozedUntil, tags } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    await updateThreadStatus(clientId, sessionId, { status, priority, assignedTo, snoozedUntil, tags });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inbox thread PATCH error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const auth = await verifyAdminOrClient(request);
    if (!auth.authenticated) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { sessionId } = await params;
    const body = await request.json();
    const { clientId, action } = body;

    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    if (action === 'mark_read') {
      await markThreadRead(clientId, sessionId);
      return NextResponse.json({ success: true });
    }

    if (action === 'suggest_reply') {
      const chatLog = await ChatLog.findOne({ clientId, sessionId });
      if (!chatLog) {
        return NextResponse.json({ success: false, error: 'Chat log not found' }, { status: 404 });
      }

      const settings = await AISettings.findOne({ clientId });
      const messages = chatLog.messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      }));

      const reply = await generateSuggestedReply(messages, settings?.systemPrompt || '');
      return NextResponse.json({ success: true, suggestedReply: reply });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Inbox thread POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
