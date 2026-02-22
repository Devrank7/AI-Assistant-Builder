/**
 * Instagram Messaging API Service
 *
 * Handles Instagram Direct Messages via Meta Graph API.
 * Two modes:
 * 1. Global auto-responder — uses InstagramConfig singleton (admin-configured system prompt)
 * 2. Per-client — uses ChannelConfig per client (existing flow)
 *
 * Supports: text messages, voice/audio messages, photo attachments.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import ChannelConfig from '@/models/ChannelConfig';
import InstagramConfig from '@/models/InstagramConfig';
import ChatLog from '@/models/ChatLog';
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
        text?: string;
        attachments?: Array<{
          type: 'image' | 'audio' | 'video' | 'file';
          payload: { url: string };
        }>;
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

    if (!response.ok) {
      const err = await response.text();
      console.error('[Instagram] Send failed:', response.status, err);
    }

    return response.ok;
  } catch (error) {
    console.error('[Instagram] Send error:', error);
    return false;
  }
}

/**
 * Download media from Instagram CDN (requires access token)
 */
async function downloadInstagramMedia(
  url: string,
  accessToken: string
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const separator = url.includes('?') ? '&' : '?';
    const response = await fetch(`${url}${separator}access_token=${accessToken}`, {
      headers: { 'User-Agent': 'WinBixAI/1.0' },
    });

    if (!response.ok) {
      console.error('[Instagram] Media download failed:', response.status);
      return null;
    }

    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const base64 = Buffer.from(buffer).toString('base64');
    return { data: base64, mimeType: contentType };
  } catch (error) {
    console.error('[Instagram] Media download error:', error);
    return null;
  }
}

/**
 * Generate AI response with multimodal support (text, image, audio)
 */
async function generateInstagramResponse(
  systemPrompt: string,
  conversationHistory: Array<{ role: string; content: string }>,
  message: string,
  media: { data: string; mimeType: string } | null,
  aiConfig: { model: string; temperature: number; maxTokens: number }
): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: aiConfig.model,
    generationConfig: {
      temperature: aiConfig.temperature,
      maxOutputTokens: aiConfig.maxTokens,
    },
  });

  let prompt = systemPrompt;

  // Add conversation history for context
  if (conversationHistory.length > 0) {
    const history = conversationHistory
      .slice(-10)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n');
    prompt += `\n\nConversation history:\n${history}`;
  }

  prompt += `\n\nUser message: ${message}`;

  // Build multimodal parts
  const parts: Array<{ text: string } | { inlineData: { data: string; mimeType: string } }> = [{ text: prompt }];

  if (media) {
    parts.push({ inlineData: { data: media.data, mimeType: media.mimeType } });

    if (media.mimeType.startsWith('audio/')) {
      parts[0] = {
        text:
          prompt +
          '\n\n[The user sent a voice message. Listen to it, understand the content, and respond appropriately.]',
      };
    } else if (media.mimeType.startsWith('image/')) {
      parts[0] = {
        text: prompt + '\n\n[The user sent an image. Analyze it and respond appropriately based on what you see.]',
      };
    }
  }

  const result = await model.generateContent(parts);
  return result.response.text();
}

/**
 * Load conversation history from ChatLog for a session
 */
async function loadConversationHistory(sessionId: string): Promise<Array<{ role: string; content: string }>> {
  try {
    const chatLog = await ChatLog.findOne({
      clientId: 'instagram-global',
      sessionId,
    });
    if (!chatLog || !chatLog.messages) return [];
    return chatLog.messages.map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));
  } catch {
    return [];
  }
}

/**
 * Log conversation to ChatLog
 */
async function logConversation(
  sessionId: string,
  userMessage: string,
  aiResponse: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await ChatLog.findOneAndUpdate(
      { clientId: 'instagram-global', sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: userMessage, timestamp: new Date() },
              { role: 'assistant', content: aiResponse, timestamp: new Date() },
            ],
          },
        },
        $setOnInsert: {
          clientId: 'instagram-global',
          sessionId,
          metadata: { ...metadata, channel: 'instagram' },
        },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    console.error('[Instagram] Failed to log conversation:', error);
  }
}

/**
 * Process incoming Instagram webhook — Global auto-responder
 *
 * Uses the InstagramConfig singleton for system prompt and API credentials.
 * Returns true if the message was handled by the global handler.
 */
export async function processGlobalInstagramWebhook(body: InstagramWebhookBody): Promise<boolean> {
  if (body.object !== 'instagram') return false;

  await connectDB();

  const igConfig = await InstagramConfig.findOne({});
  if (!igConfig || !igConfig.isActive || !igConfig.pageId || !igConfig.pageAccessToken) {
    return false;
  }

  let handled = false;

  for (const entry of body.entry || []) {
    const pageId = entry.id;

    // Only handle messages for our configured page
    if (pageId !== igConfig.pageId) continue;

    for (const event of entry.messaging || []) {
      if (!event.message) continue;

      const hasText = !!event.message.text;
      const hasAttachments = event.message.attachments && event.message.attachments.length > 0;

      // Skip if no content at all
      if (!hasText && !hasAttachments) continue;

      handled = true;

      const senderId = event.sender.id;
      const sessionId = `ig_global_${senderId}_${new Date().toISOString().split('T')[0]}`;

      try {
        // Load conversation history
        const history = await loadConversationHistory(sessionId);

        // Determine message text and media
        let messageText = event.message.text || '';
        let media: { data: string; mimeType: string } | null = null;

        if (hasAttachments && event.message.attachments) {
          const attachment = event.message.attachments[0];

          if (attachment.type === 'image') {
            const downloaded = await downloadInstagramMedia(attachment.payload.url, igConfig.pageAccessToken);
            if (downloaded) {
              media = downloaded;
              if (!messageText) messageText = 'User sent an image.';
            } else {
              if (!messageText) messageText = 'User sent an image but it could not be loaded.';
            }
          } else if (attachment.type === 'audio') {
            const downloaded = await downloadInstagramMedia(attachment.payload.url, igConfig.pageAccessToken);
            if (downloaded) {
              media = downloaded;
              if (!messageText) messageText = 'User sent a voice message.';
            } else {
              if (!messageText) messageText = 'User sent a voice message but it could not be loaded.';
            }
          } else if (attachment.type === 'video') {
            if (!messageText) messageText = 'User sent a video.';
          } else {
            if (!messageText) messageText = 'User sent a file.';
          }
        }

        // Generate AI response
        const responseText = await generateInstagramResponse(igConfig.systemPrompt, history, messageText, media, {
          model: igConfig.aiModel,
          temperature: igConfig.temperature,
          maxTokens: igConfig.maxTokens,
        });

        // Truncate to Instagram DM limit
        let finalResponse = responseText;
        if (finalResponse.length > 1000) {
          finalResponse = finalResponse.slice(0, 997) + '...';
        }

        // Send reply
        await sendInstagramMessage(pageId, igConfig.pageAccessToken, senderId, finalResponse);

        // Log conversation (async)
        logConversation(sessionId, messageText, finalResponse, {
          instagramSenderId: senderId,
          instagramMessageId: event.message.mid,
        }).catch(() => {});
      } catch (error) {
        console.error('[Instagram] Global processing error:', error);
      }
    }
  }

  return handled;
}

/**
 * Process incoming Instagram webhook — Per-client flow (existing)
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
            responseText = responseText.slice(0, 997) + '...';
          }

          await sendInstagramMessage(pageId, channelConfig.config.apiKey, event.sender.id, responseText);
        }
      } catch (error) {
        console.error('[Instagram] Processing error:', error);
      }
    }
  }
}
