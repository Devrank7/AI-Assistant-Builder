// src/lib/inbox/replyRouter.ts
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import ChatLog from '@/models/ChatLog';
import ChannelConfig from '@/models/ChannelConfig';
import Client from '@/models/Client';
import { sendTelegramMessage } from '@/lib/telegramBot';
import { sendWhatsAppMessageWhapi } from '@/lib/whatsappService';
import { sendInstagramMessage } from '@/lib/instagramService';
import { emitEvent } from '@/lib/events';
import { upsertConversation } from './conversationManager';

interface ReplyInput {
  conversationId: string;
  text: string;
  operatorId: string;
}

interface ReplyResult {
  success: boolean;
  error?: string;
}

/**
 * Route operator reply to the correct channel.
 */
export async function sendOperatorReply(input: ReplyInput): Promise<ReplyResult> {
  await connectDB();

  const conversation = await Conversation.findOne({ conversationId: input.conversationId });
  if (!conversation) return { success: false, error: 'Conversation not found' };

  const client = await Client.findOne({ clientId: conversation.clientId });
  if (!client) return { success: false, error: 'Client not found' };

  let sent = false;

  switch (conversation.channel) {
    case 'web': {
      // For web: append to chatlog so the widget picks it up via polling/SSE
      await ChatLog.findOneAndUpdate(
        { clientId: conversation.clientId, sessionId: conversation.sessionId },
        {
          $push: {
            messages: {
              role: 'assistant',
              content: input.text,
              timestamp: new Date(),
            },
          },
        }
      );
      sent = true;
      break;
    }
    case 'telegram': {
      // sessionId for telegram conversations is the chatId
      sent = await sendTelegramMessage(conversation.sessionId, input.text);
      break;
    }
    case 'whatsapp': {
      const channelConfig = await ChannelConfig.findOne({
        clientId: conversation.clientId,
        channel: 'whatsapp',
      });
      if (channelConfig?.config?.whapiToken) {
        sent = await sendWhatsAppMessageWhapi(
          channelConfig.config.whapiToken as string,
          conversation.sessionId,
          input.text
        );
      }
      break;
    }
    case 'instagram': {
      const channelConfig = await ChannelConfig.findOne({
        clientId: conversation.clientId,
        channel: 'instagram',
      });
      if (channelConfig?.config?.accessToken) {
        sent = await sendInstagramMessage(
          channelConfig.config.accessToken as string,
          conversation.sessionId,
          input.text
        );
      }
      break;
    }
  }

  if (!sent) return { success: false, error: `Failed to send via ${conversation.channel}` };

  // Update conversation
  await upsertConversation({
    clientId: conversation.clientId,
    sessionId: conversation.sessionId,
    contactId: conversation.contactId,
    channel: conversation.channel as 'web' | 'telegram' | 'whatsapp' | 'instagram',
    text: input.text,
    sender: 'operator',
  });

  // Update status to assigned if was handoff
  if (conversation.status === 'handoff') {
    conversation.status = 'assigned';
    conversation.assignedTo = input.operatorId;
    await conversation.save();
  }

  // Emit event
  await emitEvent('message:sent', conversation.clientId, {
    conversationId: conversation.conversationId,
    contactId: conversation.contactId,
    channel: conversation.channel,
    text: input.text,
    sender: 'operator',
  });

  return { success: true };
}
