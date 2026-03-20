// src/app/api/inbox/conversations/[id]/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Contact from '@/models/Contact';
import ChatLog from '@/models/ChatLog';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { emitEvent } from '@/lib/events';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;

    const conversation = await Conversation.findOne({ conversationId: id });
    if (!conversation) return Errors.notFound('Conversation not found');

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: conversation.clientId, organizationId: auth.organizationId }
      : { clientId: conversation.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Conversation not found');

    // Get messages from chatlog
    const chatlog = await ChatLog.findOne({
      clientId: conversation.clientId,
      sessionId: conversation.sessionId,
    });

    // Get contact
    const contact = await Contact.findOne({ contactId: conversation.contactId });

    // Mark as read
    conversation.unreadCount = 0;
    await conversation.save();

    return successResponse({
      conversation,
      messages: chatlog?.messages?.slice(-50) || [],
      contact,
    });
  } catch (error) {
    console.error('Get conversation detail error:', error);
    return Errors.internal('Failed to fetch conversation');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const conversation = await Conversation.findOne({ conversationId: id });
    if (!conversation) return Errors.notFound('Conversation not found');

    // Verify ownership
    const ownerQuery = auth.organizationId
      ? { clientId: conversation.clientId, organizationId: auth.organizationId }
      : { clientId: conversation.clientId, userId: auth.userId };
    const client = await Client.findOne(ownerQuery);
    if (!client) return Errors.notFound('Conversation not found');

    // Update allowed fields
    if (body.status) conversation.status = body.status;
    if (body.assignedTo !== undefined) conversation.assignedTo = body.assignedTo;
    await conversation.save();

    // Emit events
    if (body.status === 'resolved') {
      await emitEvent('conversation:resolved', conversation.clientId, {
        conversationId: conversation.conversationId,
        contactId: conversation.contactId,
        resolvedBy: auth.userId,
      });
    }

    return successResponse(conversation, 'Conversation updated');
  } catch (error) {
    console.error('Update conversation error:', error);
    return Errors.internal('Failed to update conversation');
  }
}
