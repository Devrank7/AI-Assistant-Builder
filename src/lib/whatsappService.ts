/**
 * WhatsApp Service — Dual-Provider Support
 *
 * Supports two WhatsApp API providers:
 * 1. Meta Cloud API (official WhatsApp Business API)
 * 2. Whapi.cloud (works with regular WhatsApp accounts)
 *
 * Key feature: Human Takeover
 * - When humanTakeover is enabled, the bot pauses for a chat
 *   if the human sends a message manually (from_me=true in Whapi)
 * - Bot resumes after humanTimeoutMinutes of inactivity
 */

import connectDB from '@/lib/mongodb';
import ChannelConfig from '@/models/ChannelConfig';
import { routeMessage } from '@/lib/channelRouter';
import { runBeforeAI, runAfterAIResponse, buildScriptContext, buildPreprocessContext } from '@/lib/scriptRunner';

// In-memory store for human takeover timestamps per chat
// Key: `${clientId}:${chatId}`, Value: timestamp when human last replied
const humanTakeoverMap = new Map<string, number>();

// ─── Meta Cloud API Types ─────────────────────────────────────────

interface MetaWhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface MetaWhatsAppWebhookBody {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value: {
        messaging_product: string;
        metadata: { display_phone_number: string; phone_number_id: string };
        messages?: MetaWhatsAppMessage[];
      };
      field: string;
    }>;
  }>;
}

// ─── Whapi Types ──────────────────────────────────────────────────

interface WhapiMessage {
  id: string;
  from_me: boolean;
  type: string;
  chat_id: string;
  timestamp: number;
  text?: { body: string };
  from: string;
  from_name?: string;
}

interface WhapiWebhookBody {
  messages?: WhapiMessage[];
  event?: { type: string; event: string };
  channel_id?: string;
}

// ─── Human Takeover Logic ─────────────────────────────────────────

/**
 * Check if bot should respond or if human has taken over the chat
 */
function isBotPaused(clientId: string, chatId: string, timeoutMinutes: number): boolean {
  const key = `${clientId}:${chatId}`;
  const lastHumanReply = humanTakeoverMap.get(key);
  if (!lastHumanReply) return false;

  const elapsed = Date.now() - lastHumanReply;
  const timeoutMs = timeoutMinutes * 60 * 1000;

  if (elapsed > timeoutMs) {
    humanTakeoverMap.delete(key);
    return false;
  }

  return true;
}

/**
 * Mark that a human has taken over a chat
 */
function markHumanTakeover(clientId: string, chatId: string): void {
  const key = `${clientId}:${chatId}`;
  humanTakeoverMap.set(key, Date.now());
}

// ─── Meta Cloud API ───────────────────────────────────────────────

/**
 * Send a WhatsApp text message via Meta Cloud API
 */
export async function sendWhatsAppMessageMeta(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp/Meta] Send error:', error);
    return false;
  }
}

/**
 * Process incoming Meta Cloud API webhook
 */
export async function processMetaWhatsAppWebhook(body: MetaWhatsAppWebhookBody): Promise<void> {
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;

      const value = change.value;
      const phoneNumberId = value.metadata?.phone_number_id;

      for (const message of value.messages || []) {
        if (message.type !== 'text' || !message.text?.body) continue;

        await connectDB();

        const channelConfig = await ChannelConfig.findOne({
          channel: 'whatsapp',
          provider: 'meta',
          isActive: true,
          'config.phoneNumberId': phoneNumberId,
        });

        if (!channelConfig) {
          console.warn(`[WhatsApp/Meta] No config for phone_number_id: ${phoneNumberId}`);
          continue;
        }

        const sessionId = `wa_${message.from}_${new Date().toISOString().split('T')[0]}`;
        const metadata = {
          whatsappFrom: message.from,
          whatsappMessageId: message.id,
          provider: 'meta',
        };

        try {
          // --- Script: onBeforeAI hook ---
          const preCtx = await buildPreprocessContext({
            clientId: channelConfig.clientId,
            channel: 'whatsapp',
            channelFolder: 'whatsapp',
            rawMessage: message.text.body,
            metadata,
          });
          const preResult = await runBeforeAI(channelConfig.clientId, 'whatsapp', preCtx);

          if (preResult.skip) {
            if (preResult.customResponse && channelConfig.config.apiKey) {
              await sendWhatsAppMessageMeta(
                phoneNumberId,
                channelConfig.config.apiKey,
                message.from,
                preResult.customResponse
              );
            }
            continue;
          }

          const messageToSend = preResult.modifiedMessage || message.text.body;

          // --- AI pipeline ---
          const result = await routeMessage({
            channel: 'whatsapp',
            clientId: channelConfig.clientId,
            message: messageToSend,
            sessionId,
            metadata,
          });

          if (result.success && channelConfig.config.apiKey) {
            // --- Script: onAfterAIResponse hook ---
            let responseText = result.response;
            const scriptCtx = await buildScriptContext({
              clientId: channelConfig.clientId,
              channel: 'whatsapp',
              channelFolder: 'whatsapp',
              userMessage: messageToSend,
              aiResponse: responseText,
              sessionId,
              metadata,
              isFirstContact: false,
            });
            const scriptResult = await runAfterAIResponse(channelConfig.clientId, 'whatsapp', scriptCtx);

            if (scriptResult.replaceResponse) {
              responseText = scriptResult.replaceResponse;
            } else if (scriptResult.appendToResponse) {
              responseText += scriptResult.appendToResponse;
            }

            if (responseText.length > 4000) {
              responseText = responseText.slice(0, 4000) + '...';
            }

            await sendWhatsAppMessageMeta(phoneNumberId, channelConfig.config.apiKey, message.from, responseText);
          }
        } catch (error) {
          console.error('[WhatsApp/Meta] Processing error:', error);
        }
      }
    }
  }
}

// ─── Whapi.cloud ──────────────────────────────────────────────────

/**
 * Send a WhatsApp text message via Whapi.cloud
 */
export async function sendWhatsAppMessageWhapi(whapiToken: string, chatId: string, text: string): Promise<boolean> {
  try {
    const response = await fetch('https://gate.whapi.cloud/messages/text', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${whapiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: chatId,
        body: text,
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[WhatsApp/Whapi] Send error:', error);
    return false;
  }
}

/**
 * Process incoming Whapi.cloud webhook
 *
 * Whapi format:
 * {
 *   "messages": [{ "id", "from_me", "type", "chat_id", "text": { "body" }, "from", "from_name" }],
 *   "event": { "type": "messages", "event": "post" },
 *   "channel_id": "..."
 * }
 */
export async function processWhapiWebhook(body: WhapiWebhookBody): Promise<void> {
  if (!body.messages || !Array.isArray(body.messages)) return;

  const channelId = body.channel_id;

  for (const message of body.messages) {
    // Skip non-text messages
    if (message.type !== 'text' || !message.text?.body) continue;

    await connectDB();

    // Find which client owns this Whapi channel
    const channelConfig = await ChannelConfig.findOne({
      channel: 'whatsapp',
      provider: 'whapi',
      isActive: true,
      ...(channelId ? { 'config.whapiChannelId': channelId } : {}),
    });

    if (!channelConfig) {
      console.warn(`[WhatsApp/Whapi] No config for channel_id: ${channelId}`);
      continue;
    }

    const clientId = channelConfig.clientId;
    const chatId = message.chat_id;
    const humanTakeoverEnabled = channelConfig.config.humanTakeover !== false;
    const timeoutMinutes = channelConfig.config.humanTimeoutMinutes || 30;

    // ─── Human Takeover Logic ───
    if (message.from_me) {
      // This is a message sent by the human (account owner)
      // Mark this chat as "human is handling it"
      if (humanTakeoverEnabled) {
        markHumanTakeover(clientId, chatId);
        console.log(`[WhatsApp/Whapi] Human takeover for chat ${chatId} (${timeoutMinutes}min timeout)`);
      }
      continue; // Don't process our own messages
    }

    // Check if human has taken over this chat
    if (humanTakeoverEnabled && isBotPaused(clientId, chatId, timeoutMinutes)) {
      console.log(`[WhatsApp/Whapi] Bot paused for chat ${chatId} — human takeover active`);
      continue;
    }

    // ─── AI Response ───
    const sessionId = `wa_${message.from}_${new Date().toISOString().split('T')[0]}`;
    const metadata = {
      whatsappFrom: message.from,
      whatsappChatId: chatId,
      whatsappMessageId: message.id,
      whatsappFromName: message.from_name,
      provider: 'whapi',
    };

    try {
      // --- Script: onBeforeAI hook ---
      const preCtx = await buildPreprocessContext({
        clientId,
        channel: 'whatsapp',
        channelFolder: 'whatsapp',
        rawMessage: message.text.body,
        metadata,
      });
      const preResult = await runBeforeAI(clientId, 'whatsapp', preCtx);

      if (preResult.skip) {
        if (preResult.customResponse && channelConfig.config.whapiToken) {
          await sendWhatsAppMessageWhapi(channelConfig.config.whapiToken, chatId, preResult.customResponse);
        }
        continue;
      }

      const messageToSend = preResult.modifiedMessage || message.text.body;

      // --- AI pipeline ---
      const result = await routeMessage({
        channel: 'whatsapp',
        clientId,
        message: messageToSend,
        sessionId,
        metadata,
      });

      if (result.success && channelConfig.config.whapiToken) {
        // --- Script: onAfterAIResponse hook ---
        let responseText = result.response;
        const scriptCtx = await buildScriptContext({
          clientId,
          channel: 'whatsapp',
          channelFolder: 'whatsapp',
          userMessage: messageToSend,
          aiResponse: responseText,
          sessionId,
          metadata,
          isFirstContact: false,
        });
        const scriptResult = await runAfterAIResponse(clientId, 'whatsapp', scriptCtx);

        if (scriptResult.replaceResponse) {
          responseText = scriptResult.replaceResponse;
        } else if (scriptResult.appendToResponse) {
          responseText += scriptResult.appendToResponse;
        }

        if (responseText.length > 4000) {
          responseText = responseText.slice(0, 4000) + '...';
        }

        await sendWhatsAppMessageWhapi(channelConfig.config.whapiToken, chatId, responseText);
      }
    } catch (error) {
      console.error('[WhatsApp/Whapi] Processing error:', error);
    }
  }
}

// ─── Legacy export (backward compatible) ──────────────────────────

export const sendWhatsAppMessage = sendWhatsAppMessageMeta;
export const processWhatsAppWebhook = processMetaWhatsAppWebhook;
