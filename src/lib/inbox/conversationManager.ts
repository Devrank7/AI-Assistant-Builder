import { nanoid } from 'nanoid';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import type { MessageSender } from '@/models/Conversation';

interface UpsertInput {
  clientId: string;
  sessionId: string;
  contactId: string;
  channel: 'web' | 'telegram' | 'whatsapp' | 'instagram';
  text: string;
  sender: MessageSender;
  metadata?: {
    pageUrl?: string;
    userAgent?: string;
    ip?: string;
    referrer?: string;
  };
}

/**
 * Create or update a Conversation document when a message arrives.
 * Returns the conversationId.
 */
export async function upsertConversation(input: UpsertInput): Promise<string> {
  await connectDB();

  let conversation = await Conversation.findOne({
    clientId: input.clientId,
    sessionId: input.sessionId,
  });

  if (!conversation) {
    conversation = await Conversation.create({
      conversationId: nanoid(12),
      clientId: input.clientId,
      contactId: input.contactId,
      sessionId: input.sessionId,
      channel: input.channel,
      status: 'bot',
      lastMessage: {
        text: input.text.substring(0, 500),
        sender: input.sender,
        timestamp: new Date(),
      },
      unreadCount: input.sender === 'visitor' ? 1 : 0,
      metadata: input.metadata || {},
    });
  } else {
    conversation.lastMessage = {
      text: input.text.substring(0, 500),
      sender: input.sender,
      timestamp: new Date(),
    };
    if (input.sender === 'visitor') {
      conversation.unreadCount += 1;
    }
    await conversation.save();
  }

  return conversation.conversationId;
}

/**
 * Mark conversation as handoff.
 */
export async function triggerHandoff(
  conversationId: string,
  reason: 'low_confidence' | 'negative_sentiment' | 'user_request' | 'high_value'
): Promise<void> {
  await connectDB();
  await Conversation.findOneAndUpdate({ conversationId }, { $set: { status: 'handoff', handoffReason: reason } });
}
