/**
 * ManyChat Integration Service
 *
 * ManyChat acts as a bridge to Instagram (and WhatsApp) DMs.
 * Users connect their Instagram through ManyChat (which has App Review approval),
 * and ManyChat forwards messages to our webhook via External Request.
 *
 * Flow:
 * 1. User sends DM on Instagram
 * 2. ManyChat receives it (official Instagram API)
 * 3. ManyChat triggers External Request to our webhook
 * 4. We process through channelRouter (AI + RAG + knowledge base)
 * 5. Return response in ManyChat format
 * 6. ManyChat sends it back to the user
 *
 * ManyChat External Request format (incoming):
 * {
 *   "subscriber_id": "...",
 *   "first_name": "...",
 *   "last_name": "...",
 *   "ig_id": "...",         // Instagram user ID (if Instagram)
 *   "wa_phone": "...",      // WhatsApp phone (if WhatsApp)
 *   "last_input_text": "...",
 *   "custom_fields": { ... }
 * }
 *
 * Expected response format:
 * {
 *   "version": "v2",
 *   "content": {
 *     "messages": [{ "type": "text", "text": "AI response" }],
 *     "actions": [],
 *     "quick_replies": []
 *   }
 * }
 */

import connectDB from '@/lib/mongodb';
import ChannelConfig from '@/models/ChannelConfig';
import { routeMessage } from '@/lib/channelRouter';
import type { ChannelType } from '@/lib/channelRouter';
import { runBeforeAI, runAfterAIResponse, buildScriptContext, buildPreprocessContext } from '@/lib/scriptRunner';

interface ManyChatWebhookBody {
  subscriber_id?: string;
  first_name?: string;
  last_name?: string;
  ig_id?: string;
  wa_phone?: string;
  last_input_text?: string;
  custom_fields?: Record<string, string>;
  // Custom field we ask users to set in ManyChat
  winbix_client_id?: string;
}

interface ManyChatResponse {
  version: string;
  content: {
    messages: Array<{ type: string; text: string }>;
    actions: unknown[];
    quick_replies: unknown[];
  };
}

/**
 * Build a ManyChat-compatible response
 */
function buildManyChatResponse(text: string): ManyChatResponse {
  return {
    version: 'v2',
    content: {
      messages: [{ type: 'text', text }],
      actions: [],
      quick_replies: [],
    },
  };
}

/**
 * Process incoming ManyChat External Request webhook
 */
export async function processManyChatWebhook(body: ManyChatWebhookBody): Promise<ManyChatResponse> {
  const message = body.last_input_text;
  if (!message) {
    return buildManyChatResponse('Не удалось обработать сообщение.');
  }

  await connectDB();

  // Determine channel: Instagram (ig_id) or WhatsApp (wa_phone)
  const isInstagram = !!body.ig_id;
  const channel: ChannelType = isInstagram ? 'instagram' : 'whatsapp';

  // Find clientId: first check custom field, then find by ManyChat subscriber
  let clientId = body.winbix_client_id || body.custom_fields?.winbix_client_id;

  if (!clientId) {
    // Try to find a channel config with manychat provider
    const channelConfig = await ChannelConfig.findOne({
      channel: isInstagram ? 'instagram' : 'whatsapp',
      provider: 'manychat',
      isActive: true,
    });

    if (channelConfig) {
      clientId = channelConfig.clientId;
    }
  }

  if (!clientId) {
    return buildManyChatResponse('Ошибка конфигурации: не удалось определить аккаунт. Обратитесь к администратору.');
  }

  const subscriberId = body.subscriber_id || body.ig_id || body.wa_phone || 'unknown';
  const customerName = [body.first_name, body.last_name].filter(Boolean).join(' ') || undefined;
  const sessionId = `mc_${subscriberId}_${new Date().toISOString().split('T')[0]}`;
  const channelFolder = isInstagram ? 'instagram' : 'whatsapp';
  const metadata = {
    manychatSubscriberId: body.subscriber_id,
    instagramId: body.ig_id,
    whatsappPhone: body.wa_phone,
    customerName,
    provider: 'manychat',
  };

  try {
    // --- Script: onBeforeAI hook ---
    const preCtx = await buildPreprocessContext({
      clientId,
      channel,
      channelFolder,
      rawMessage: message,
      metadata,
    });
    const preResult = await runBeforeAI(clientId, channelFolder, preCtx);

    if (preResult.skip) {
      return buildManyChatResponse(preResult.customResponse || '');
    }

    const messageToSend = preResult.modifiedMessage || message;

    // --- AI pipeline ---
    const result = await routeMessage({
      channel,
      clientId,
      message: messageToSend,
      sessionId,
      metadata,
    });

    if (!result.success) {
      return buildManyChatResponse(result.error || 'Не удалось получить ответ.');
    }

    // --- Script: onAfterAIResponse hook ---
    let responseText = result.response;
    const scriptCtx = await buildScriptContext({
      clientId,
      channel,
      channelFolder,
      userMessage: messageToSend,
      aiResponse: responseText,
      sessionId,
      metadata,
      isFirstContact: false,
    });
    const scriptResult = await runAfterAIResponse(clientId, channelFolder, scriptCtx);

    if (scriptResult.replaceResponse) {
      responseText = scriptResult.replaceResponse;
    } else if (scriptResult.appendToResponse) {
      responseText += scriptResult.appendToResponse;
    }

    // Truncate for Instagram DM limits
    if (isInstagram && responseText.length > 1000) {
      responseText = responseText.slice(0, 1000) + '...';
    } else if (responseText.length > 4000) {
      responseText = responseText.slice(0, 4000) + '...';
    }

    return buildManyChatResponse(responseText);
  } catch (error) {
    console.error('[ManyChat] Processing error:', error);
    return buildManyChatResponse('Произошла ошибка. Попробуйте позже.');
  }
}
