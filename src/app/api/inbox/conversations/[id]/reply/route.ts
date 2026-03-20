// src/app/api/inbox/conversations/[id]/reply/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { sendOperatorReply } from '@/lib/inbox/replyRouter';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const body = await request.json();

    if (!body.text || typeof body.text !== 'string') {
      return Errors.badRequest('text is required');
    }

    // Verify ownership before sending
    await connectDB();
    const conversation = await Conversation.findOne({ conversationId: id });
    if (!conversation) return Errors.notFound('Conversation not found');

    const ownerQuery = auth.organizationId
      ? { clientId: conversation.clientId, organizationId: auth.organizationId }
      : { clientId: conversation.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Conversation not found');

    const result = await sendOperatorReply({
      conversationId: id,
      text: body.text,
      operatorId: auth.userId,
    });

    if (!result.success) {
      return Errors.internal(result.error || 'Failed to send reply');
    }

    return successResponse(null, 'Reply sent');
  } catch (error) {
    console.error('Send reply error:', error);
    return Errors.internal('Failed to send reply');
  }
}
