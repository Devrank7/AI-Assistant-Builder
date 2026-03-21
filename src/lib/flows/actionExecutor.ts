// src/lib/flows/actionExecutor.ts
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import Conversation from '@/models/Conversation';
import ChannelConfig from '@/models/ChannelConfig';
import { sendTelegramMessage } from '@/lib/telegramBot';
import { sendWhatsAppMessageWhapi } from '@/lib/whatsappService';
import { sendInstagramMessage } from '@/lib/instagramService';
import ChatLog from '@/models/ChatLog';
import { emitEvent } from '@/lib/events';
import { resolveTemplate, type TemplateContext } from './templateResolver';
import type { FlowActionType } from '@/models/Flow';

interface ActionInput {
  actionType: FlowActionType;
  config: Record<string, unknown>;
  contactId: string;
  clientId: string;
  conversationId: string | null;
  templateContext: TemplateContext;
}

interface ActionResult {
  success: boolean;
  result?: string;
}

/**
 * Execute a single flow action.
 */
export async function executeAction(input: ActionInput): Promise<ActionResult> {
  await connectDB();

  switch (input.actionType) {
    case 'send_message': {
      const messageTemplate = String(input.config.message || '');
      const text = resolveTemplate(messageTemplate, input.templateContext);
      if (!text) return { success: false, result: 'Empty message after template resolution' };

      const contact = await Contact.findOne({ contactId: input.contactId });
      if (!contact) return { success: false, result: 'Contact not found' };

      let sent = false;
      const channel = contact.channel;

      if (channel === 'web') {
        // Append to chatlog for web widget polling
        const conversation = input.conversationId
          ? await Conversation.findOne({ conversationId: input.conversationId })
          : null;
        if (conversation) {
          await ChatLog.findOneAndUpdate(
            { clientId: input.clientId, sessionId: conversation.sessionId },
            { $push: { messages: { role: 'assistant', content: text, timestamp: new Date() } } }
          );
          sent = true;
        }
      } else if (channel === 'telegram') {
        const chatId = contact.channelIds?.telegram;
        if (chatId) sent = await sendTelegramMessage(chatId, text);
      } else if (channel === 'whatsapp') {
        const channelConfig = await ChannelConfig.findOne({ clientId: input.clientId, channel: 'whatsapp' });
        const phone = contact.channelIds?.whatsapp;
        if (channelConfig?.config?.whapiToken && phone) {
          sent = await sendWhatsAppMessageWhapi(channelConfig.config.whapiToken as string, phone, text);
        }
      } else if (channel === 'instagram') {
        const channelConfig = await ChannelConfig.findOne({ clientId: input.clientId, channel: 'instagram' });
        const igId = contact.channelIds?.instagram;
        const cfgAny = channelConfig?.config as Record<string, unknown> | undefined;
        if (cfgAny?.pageId && cfgAny?.accessToken && igId) {
          sent = await sendInstagramMessage(cfgAny.pageId as string, cfgAny.accessToken as string, igId, text);
        }
      }

      return { success: sent, result: sent ? `Sent via ${channel}` : `Failed to send via ${channel}` };
    }

    case 'send_notification': {
      const messageTemplate = String(input.config.message || '');
      const text = resolveTemplate(messageTemplate, input.templateContext);
      const channel = String(input.config.channel || 'telegram');

      if (channel === 'telegram') {
        // Use internal API to send notification
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL;
        if (!baseUrl) {
          console.warn('[actionExecutor] Neither NEXT_PUBLIC_BASE_URL nor NEXTAUTH_URL is set');
        }
        const res = await fetch(`${baseUrl}/api/telegram/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Cookie: `admin_token=${process.env.ADMIN_SECRET_TOKEN}`,
          },
          body: JSON.stringify({ message: text }),
        });
        return { success: res.ok, result: res.ok ? 'Notification sent' : 'Notification failed' };
      }

      return { success: false, result: `Unsupported notification channel: ${channel}` };
    }

    case 'add_tag': {
      const tag = String(input.config.tag || '');
      if (!tag) return { success: false, result: 'No tag specified' };

      await Contact.findOneAndUpdate({ contactId: input.contactId }, { $addToSet: { tags: tag } });
      return { success: true, result: `Tag "${tag}" added` };
    }

    case 'remove_tag': {
      const tag = String(input.config.tag || '');
      if (!tag) return { success: false, result: 'No tag specified' };

      await Contact.findOneAndUpdate({ contactId: input.contactId }, { $pull: { tags: tag } });
      return { success: true, result: `Tag "${tag}" removed` };
    }

    case 'change_score': {
      const delta = Number(input.config.delta || 0);
      if (delta === 0) return { success: false, result: 'Delta is 0' };

      const contact = await Contact.findOne({ contactId: input.contactId });
      if (!contact) return { success: false, result: 'Contact not found' };

      const oldScore = contact.leadScore;
      contact.leadScore = Math.max(0, Math.min(100, contact.leadScore + delta));
      contact.leadTemp = contact.leadScore >= 66 ? 'hot' : contact.leadScore >= 31 ? 'warm' : 'cold';
      await contact.save();

      // Emit score change if threshold crossed
      const oldTemp = oldScore >= 66 ? 'hot' : oldScore >= 31 ? 'warm' : 'cold';
      if (contact.leadTemp !== oldTemp) {
        await emitEvent('contact:score_changed', input.clientId, {
          contactId: input.contactId,
          oldScore,
          newScore: contact.leadScore,
          reason: 'flow_action',
        });
      }

      return { success: true, result: `Score changed by ${delta}: ${oldScore} → ${contact.leadScore}` };
    }

    case 'assign_operator': {
      const userId = String(input.config.userId || '');
      if (!userId || !input.conversationId) {
        return { success: false, result: 'Missing userId or conversationId' };
      }

      await Conversation.findOneAndUpdate(
        { conversationId: input.conversationId },
        { $set: { assignedTo: userId, status: 'assigned' } }
      );
      return { success: true, result: `Assigned to ${userId}` };
    }

    default:
      return { success: false, result: `Unknown action: ${input.actionType}` };
  }
}
