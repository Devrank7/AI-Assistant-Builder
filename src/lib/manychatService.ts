/**
 * ManyChat Integration Service
 *
 * ManyChat acts as a bridge to Instagram (and WhatsApp) DMs.
 * Users connect their Instagram through ManyChat (which has App Review approval),
 * and ManyChat forwards messages to our webhook via External Request.
 *
 * Supports 3 message types:
 * - Text: regular text messages
 * - Voice: audio URL in last_input_text (Facebook CDN), transcribed by Gemini
 * - Photo: image URL in last_input_text (Facebook CDN), analyzed by Gemini
 *
 * Flow:
 * 1. User sends DM on Instagram
 * 2. ManyChat receives it (official Instagram API)
 * 3. ManyChat triggers External Request to our webhook
 * 4. We detect message type (text/voice/photo), download media if needed
 * 5. Process through channelRouter (AI + RAG + knowledge base)
 * 6. Return response in ManyChat format
 * 7. ManyChat sends it back to the user
 *
 * ManyChat External Request format (incoming):
 * {
 *   "subscriber_id": "...",
 *   "first_name": "...",
 *   "last_name": "...",
 *   "ig_id": "...",         // Instagram user ID (if Instagram)
 *   "ig_username": "...",   // Instagram username (for whitelist)
 *   "wa_phone": "...",      // WhatsApp phone (if WhatsApp)
 *   "last_input_text": "...", // Text, or CDN URL for voice/photo
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

// ManyChat External Request timeout is ~30s; we use 25s to leave margin
const MANYCHAT_TIMEOUT_MS = 25_000;

// Only respond to these Instagram usernames (empty = respond to all)
const ALLOWED_USERNAMES: string[] = ['michael_hoiwinbix', 'verstat178'];

// Known Facebook/Instagram CDN patterns for media URLs
const MEDIA_URL_PATTERNS = [
  /^https?:\/\/.*fbsbx\.com\//i,
  /^https?:\/\/.*fbcdn\.net\//i,
  /^https?:\/\/.*cdninstagram\.com\//i,
  /^https?:\/\/.*facebook\.com\/.*\.(mp4|ogg|oga|m4a|wav|mp3|aac|jpg|jpeg|png|gif|webp)/i,
  /^https?:\/\/.*instagram\.com\/.*\.(mp4|ogg|oga|m4a|wav|mp3|aac|jpg|jpeg|png|gif|webp)/i,
];

// Audio file extensions and MIME patterns
const AUDIO_EXTENSIONS = /\.(ogg|oga|m4a|wav|mp3|aac|opus|webm)(\?|$)/i;
const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|gif|webp|heic|heif)(\?|$)/i;

type MessageType = 'text' | 'voice' | 'photo';

interface ManyChatWebhookBody {
  subscriber_id?: string;
  first_name?: string;
  last_name?: string;
  ig_id?: string;
  ig_username?: string;
  wa_phone?: string;
  last_input_text?: string;
  last_input_type?: string; // ManyChat may send 'audio', 'image', 'text'
  last_input_url?: string; // Direct media URL (some ManyChat setups)
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
 * Race a promise against a timeout. Returns fallback on timeout.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

/**
 * Detect if a string looks like a media URL (Facebook/Instagram CDN)
 */
function isMediaUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('http')) return false;
  // Check against known CDN patterns
  if (MEDIA_URL_PATTERNS.some((p) => p.test(trimmed))) return true;
  // Also check for direct media file extensions in any URL
  if (AUDIO_EXTENSIONS.test(trimmed) || IMAGE_EXTENSIONS.test(trimmed)) return true;
  return false;
}

/**
 * Determine message type from the input text and optional type hint
 */
function detectMessageType(body: ManyChatWebhookBody): { type: MessageType; mediaUrl?: string } {
  const text = (body.last_input_text || '').trim();
  const typeHint = (body.last_input_type || '').toLowerCase();
  const directUrl = (body.last_input_url || '').trim();

  // If ManyChat sends a direct media URL field
  if (directUrl && directUrl.startsWith('http')) {
    if (typeHint === 'audio' || AUDIO_EXTENSIONS.test(directUrl)) {
      return { type: 'voice', mediaUrl: directUrl };
    }
    if (typeHint === 'image' || IMAGE_EXTENSIONS.test(directUrl)) {
      return { type: 'photo', mediaUrl: directUrl };
    }
  }

  // Check type hint from ManyChat
  if (typeHint === 'audio' && isMediaUrl(text)) {
    return { type: 'voice', mediaUrl: text };
  }
  if (typeHint === 'image' && isMediaUrl(text)) {
    return { type: 'photo', mediaUrl: text };
  }

  // Detect from URL patterns in last_input_text
  if (isMediaUrl(text)) {
    if (AUDIO_EXTENSIONS.test(text)) {
      return { type: 'voice', mediaUrl: text };
    }
    if (IMAGE_EXTENSIONS.test(text)) {
      return { type: 'photo', mediaUrl: text };
    }
    // URL present but can't determine type — try content-type via HEAD request later
    // Default to voice (more common per user request)
    return { type: 'voice', mediaUrl: text };
  }

  return { type: 'text' };
}

/**
 * Download media from URL and return as base64 with MIME type.
 * Facebook CDN URLs are temporary — must be downloaded immediately.
 */
async function downloadMediaAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    console.log(`[ManyChat] Downloading media: ${url.slice(0, 100)}...`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WinBix-AI/1.0' },
      signal: AbortSignal.timeout(15_000), // 15s download timeout
    });

    if (!response.ok) {
      console.error(`[ManyChat] Media download failed: ${response.status} ${response.statusText}`);
      return null;
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    console.log(`[ManyChat] Media downloaded: ${contentType}, ${Math.round(buffer.byteLength / 1024)}KB`);
    return { data: base64, mimeType: contentType };
  } catch (error) {
    console.error('[ManyChat] Media download error:', error);
    return null;
  }
}

/**
 * Process incoming ManyChat External Request webhook
 */
export async function processManyChatWebhook(body: ManyChatWebhookBody): Promise<ManyChatResponse> {
  // --- Username whitelist check ---
  if (ALLOWED_USERNAMES.length > 0) {
    const username = (body.ig_username || '').toLowerCase().trim();
    if (!username || !ALLOWED_USERNAMES.includes(username)) {
      console.log(`[ManyChat] Blocked: username="${username}" not in whitelist. subscriber_id=${body.subscriber_id}`);
      // Return empty response — don't reply to non-whitelisted users
      return buildManyChatResponse('');
    }
  }

  const inputText = body.last_input_text;
  if (!inputText) {
    console.warn('[ManyChat] Empty message received:', JSON.stringify(body).slice(0, 200));
    return buildManyChatResponse('Не удалось обработать сообщение.');
  }

  // Detect message type (text / voice / photo)
  const { type: messageType, mediaUrl } = detectMessageType(body);
  console.log(
    `[ManyChat] Message type: ${messageType}, from: ${body.ig_username || body.ig_id}, text: ${inputText.slice(0, 80)}`
  );

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
    } else {
      console.warn(
        `[ManyChat] No active ChannelConfig found for channel=${channel}, provider=manychat. Body: subscriber_id=${body.subscriber_id}, ig_id=${body.ig_id}`
      );
    }
  }

  if (!clientId) {
    console.error(
      `[ManyChat] Cannot determine clientId. subscriber_id=${body.subscriber_id}, ig_id=${body.ig_id}, custom_fields=${JSON.stringify(body.custom_fields)}`
    );
    return buildManyChatResponse('Ошибка конфигурации: не удалось определить аккаунт. Обратитесь к администратору.');
  }

  const subscriberId = body.subscriber_id || body.ig_id || body.wa_phone || 'unknown';
  const customerName = [body.first_name, body.last_name].filter(Boolean).join(' ') || undefined;
  // Session persists for 4 hours of inactivity (hash changes every 4h block)
  const hourBlock = Math.floor(Date.now() / (4 * 60 * 60 * 1000));
  const sessionId = `mc_${subscriberId}_${hourBlock}`;
  const channelFolder = isInstagram ? 'instagram' : 'whatsapp';
  const metadata = {
    manychatSubscriberId: body.subscriber_id,
    instagramId: body.ig_id,
    instagramUsername: body.ig_username,
    whatsappPhone: body.wa_phone,
    customerName,
    provider: 'manychat',
    messageType,
  };

  // Wrap entire processing in a timeout to respect ManyChat's ~30s limit
  const timeoutResponse = buildManyChatResponse('Извините, ответ занимает слишком много времени. Попробуйте ещё раз.');

  return withTimeout(
    processMessage(
      clientId,
      channel,
      channelFolder,
      isInstagram,
      inputText,
      messageType,
      mediaUrl,
      sessionId,
      metadata
    ),
    MANYCHAT_TIMEOUT_MS,
    timeoutResponse
  );
}

/**
 * Internal: process message through AI pipeline with script hooks.
 * Handles text, voice (audio → transcription), and photo (image → analysis).
 */
async function processMessage(
  clientId: string,
  channel: ChannelType,
  channelFolder: string,
  isInstagram: boolean,
  rawMessage: string,
  messageType: MessageType,
  mediaUrl: string | undefined,
  sessionId: string,
  metadata: Record<string, unknown>
): Promise<ManyChatResponse> {
  try {
    // --- Download media if voice or photo ---
    let audioData: { data: string; mimeType: string } | undefined;
    let imageData: { data: string; mimeType: string } | undefined;
    let textMessage = rawMessage;

    if (messageType === 'voice' && mediaUrl) {
      const media = await downloadMediaAsBase64(mediaUrl);
      if (media) {
        audioData = media;
        // For voice messages, the "text" is just a URL — tell AI to transcribe
        textMessage = 'User sent a voice message. Please listen to it and respond to what they said.';
      } else {
        return buildManyChatResponse('Не удалось обработать голосовое сообщение. Попробуйте отправить текстом.');
      }
    }

    if (messageType === 'photo' && mediaUrl) {
      const media = await downloadMediaAsBase64(mediaUrl);
      if (media) {
        imageData = media;
        // For photos, the "text" is just a URL — tell AI to describe/respond
        textMessage = 'User sent a photo. Please look at it and respond appropriately based on the context.';
      } else {
        return buildManyChatResponse('Не удалось обработать фото. Попробуйте отправить ещё раз.');
      }
    }

    // --- Script: onBeforeAI hook ---
    const preCtx = await buildPreprocessContext({
      clientId,
      channel,
      channelFolder,
      rawMessage: textMessage,
      metadata,
    });
    const preResult = await runBeforeAI(clientId, channelFolder, preCtx);

    if (preResult.skip) {
      return buildManyChatResponse(preResult.customResponse || '');
    }

    const messageToSend = preResult.modifiedMessage || textMessage;

    // --- AI pipeline (with multimodal support) ---
    const result = await routeMessage({
      channel,
      clientId,
      message: messageToSend,
      sessionId,
      metadata,
      ...(imageData ? { image: imageData } : {}),
      ...(audioData ? { audio: audioData } : {}),
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

    // Truncate for Instagram DM limits (1000 chars) or general limit (4000 chars)
    const charLimit = isInstagram ? 1000 : 4000;
    if (responseText.length > charLimit) {
      responseText = responseText.slice(0, charLimit) + '...';
    }

    return buildManyChatResponse(responseText);
  } catch (error) {
    console.error('[ManyChat] Processing error:', error);
    return buildManyChatResponse('Произошла ошибка. Попробуйте позже.');
  }
}
