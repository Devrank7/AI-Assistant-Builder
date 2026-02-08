/**
 * Instagram Messaging API Service
 *
 * Handles Instagram Direct Messages via Meta Graph API.
 * Each client can configure their own Instagram Business account.
 */

import connectDB from '@/lib/mongodb';
import ChannelConfig from '@/models/ChannelConfig';
import { routeMessage } from '@/lib/channelRouter';
import { runBeforeAI, runAfterAIResponse, buildScriptContext, buildPreprocessContext } from '@/lib/scriptRunner';

interface InstagramWebhookBody {
  object: string;
  entry?: Array<{
    id: string;
    messaging?: Array<{
      sender: { id: string };
      recipient: { id: string };
      timestamp: number;
      message?: {
        mid: string;
        text: string;
      };
    }>;
  }>;
}

/**
 * Send an Instagram Direct Message
 */
export async function sendInstagramMessage(
  pageId: string,
  accessToken: string,
  recipientId: string,
  text: string
): Promise<boolean> {
  try {
    const response = await fetch(`https://graph.facebook.com/v21.0/${pageId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });

    return response.ok;
  } catch (error) {
    console.error('[Instagram] Send error:', error);
    return false;
  }
}

/**
 * Process incoming Instagram webhook
 */
export async function processInstagramWebhook(body: InstagramWebhookBody): Promise<void> {
  if (body.object !== 'instagram') return;

  for (const entry of body.entry || []) {
    const pageId = entry.id;

    for (const event of entry.messaging || []) {
      if (!event.message?.text) continue;

      await connectDB();

      // Find which client owns this Instagram page
      const channelConfig = await ChannelConfig.findOne({
        channel: 'instagram',
        isActive: true,
        'config.pageId': pageId,
      });

      if (!channelConfig) {
        console.warn(`[Instagram] No channel config found for page_id: ${pageId}`);
        continue;
      }

      const sessionId = `ig_${event.sender.id}_${new Date().toISOString().split('T')[0]}`;
      const metadata = {
        instagramSenderId: event.sender.id,
        instagramMessageId: event.message.mid,
      };

      try {
        // --- Script: onBeforeAI hook ---
        const preCtx = await buildPreprocessContext({
          clientId: channelConfig.clientId,
          channel: 'instagram',
          channelFolder: 'instagram',
          rawMessage: event.message.text,
          metadata,
        });
        const preResult = await runBeforeAI(channelConfig.clientId, 'instagram', preCtx);

        if (preResult.skip) {
          if (preResult.customResponse && channelConfig.config.apiKey) {
            await sendInstagramMessage(pageId, channelConfig.config.apiKey, event.sender.id, preResult.customResponse);
          }
          continue;
        }

        const messageToSend = preResult.modifiedMessage || event.message.text;

        // --- AI pipeline ---
        const result = await routeMessage({
          channel: 'instagram',
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
            channel: 'instagram',
            channelFolder: 'instagram',
            userMessage: messageToSend,
            aiResponse: responseText,
            sessionId,
            metadata,
            isFirstContact: false,
          });
          const scriptResult = await runAfterAIResponse(channelConfig.clientId, 'instagram', scriptCtx);

          if (scriptResult.replaceResponse) {
            responseText = scriptResult.replaceResponse;
          } else if (scriptResult.appendToResponse) {
            responseText += scriptResult.appendToResponse;
          }

          if (responseText.length > 1000) {
            responseText = responseText.slice(0, 1000) + '...';
          }

          await sendInstagramMessage(pageId, channelConfig.config.apiKey, event.sender.id, responseText);
        }
      } catch (error) {
        console.error('[Instagram] Processing error:', error);
      }
    }
  }
}
