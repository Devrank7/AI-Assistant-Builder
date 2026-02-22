/**
 * ManyChat Integration Service — Standalone Instagram Assistant
 *
 * A self-contained AI chatbot for Instagram DMs via ManyChat.
 * NOT connected to widget clients — this is an independent assistant.
 *
 * Features:
 * - Text messages: synchronous response (within 10s ManyChat limit)
 * - Voice messages: async — instant "processing" reply, then AI response via ManyChat API
 * - Photo messages: async — same pattern as voice
 * - Conversation history: persisted per Instagram user
 * - Username whitelist: only responds to allowed accounts
 *
 * Flow (text):
 * 1. ManyChat sends External Request → we respond within 9s
 *
 * Flow (voice/photo):
 * 1. ManyChat sends External Request → we instantly reply "Processing..."
 * 2. Background: download media → Gemini processes → send response via ManyChat sendContent API
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import InstagramConfig from '@/models/InstagramConfig';

// ManyChat External Request timeout is ~10s; we use 9s for text messages
const MANYCHAT_TIMEOUT_MS = 9_000;

// Only respond to these Instagram usernames (empty array = respond to all)
const ALLOWED_USERNAMES: string[] = ['michael_hoiwinbix', 'verstat178'];

// Pseudo clientId for storing chat logs (not a real widget client)
const INSTAGRAM_BOT_ID = '_instagram_assistant_';

// Fallback system prompt (used only if InstagramConfig has no systemPrompt)
const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful AI assistant responding to Instagram direct messages. Be friendly, concise, and helpful.';

// Known Facebook/Instagram CDN patterns for media URLs
const MEDIA_URL_PATTERNS = [
  /^https?:\/\/.*fbsbx\.com\//i,
  /^https?:\/\/.*fbcdn\.net\//i,
  /^https?:\/\/.*cdninstagram\.com\//i,
  /^https?:\/\/.*facebook\.com\/.*\.(mp4|ogg|oga|m4a|wav|mp3|aac|jpg|jpeg|png|gif|webp)/i,
  /^https?:\/\/.*instagram\.com\/.*\.(mp4|ogg|oga|m4a|wav|mp3|aac|jpg|jpeg|png|gif|webp)/i,
];

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
  last_input_type?: string;
  last_input_url?: string;
  custom_fields?: Record<string, string>;
}

interface ManyChatResponse {
  version: string;
  content: {
    type: string;
    messages: Array<{ type: string; text: string }>;
    actions: unknown[];
    quick_replies: unknown[];
  };
}

/**
 * Build a ManyChat-compatible response
 */
function buildResponse(text: string): ManyChatResponse {
  return {
    version: 'v2',
    content: {
      type: 'instagram',
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
 * Send a message directly to a subscriber via ManyChat API (bypasses 10s limit)
 */
async function sendViaManyChatAPI(subscriberId: string, text: string): Promise<void> {
  const apiKey = process.env.MANYCHAT_API_KEY;
  if (!apiKey) {
    console.error('[ManyChat] MANYCHAT_API_KEY not set, cannot send async response');
    return;
  }

  try {
    const response = await fetch('https://api.manychat.com/fb/sending/sendContent', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscriber_id: Number(subscriberId),
        data: {
          version: 'v2',
          content: {
            type: 'instagram',
            messages: [{ type: 'text', text }],
            actions: [],
            quick_replies: [],
          },
        },
      }),
    });

    const result = await response.json();
    if (result.status === 'success') {
      console.log(`[ManyChat] Async message sent via API (${text.length} chars)`);
    } else {
      console.error('[ManyChat] API sendContent failed:', JSON.stringify(result).slice(0, 300));
    }
  } catch (error) {
    console.error('[ManyChat] API sendContent error:', error);
  }
}

/**
 * Detect if a string looks like a media URL
 */
function isMediaUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('http')) return false;
  if (MEDIA_URL_PATTERNS.some((p) => p.test(trimmed))) return true;
  if (AUDIO_EXTENSIONS.test(trimmed) || IMAGE_EXTENSIONS.test(trimmed)) return true;
  return false;
}

/**
 * Determine message type from the input
 */
function detectMessageType(body: ManyChatWebhookBody): { type: MessageType; mediaUrl?: string } {
  const text = (body.last_input_text || '').trim();
  const typeHint = (body.last_input_type || '').toLowerCase();
  const directUrl = (body.last_input_url || '').trim();

  if (directUrl && directUrl.startsWith('http')) {
    if (typeHint === 'audio' || AUDIO_EXTENSIONS.test(directUrl)) return { type: 'voice', mediaUrl: directUrl };
    if (typeHint === 'image' || IMAGE_EXTENSIONS.test(directUrl)) return { type: 'photo', mediaUrl: directUrl };
  }

  if (typeHint === 'audio' && isMediaUrl(text)) return { type: 'voice', mediaUrl: text };
  if (typeHint === 'image' && isMediaUrl(text)) return { type: 'photo', mediaUrl: text };

  if (isMediaUrl(text)) {
    if (AUDIO_EXTENSIONS.test(text)) return { type: 'voice', mediaUrl: text };
    if (IMAGE_EXTENSIONS.test(text)) return { type: 'photo', mediaUrl: text };
    // URL but unknown type — default to voice (more common per user request)
    return { type: 'voice', mediaUrl: text };
  }

  return { type: 'text' };
}

/**
 * Download media from URL and return as base64
 */
async function downloadMedia(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    console.log(`[ManyChat] Downloading media: ${url.slice(0, 100)}...`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'WinBix-AI/1.0' },
      signal: AbortSignal.timeout(15_000),
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
 * Load recent conversation history for a user
 */
async function loadHistory(sessionId: string): Promise<Array<{ role: string; content: string }>> {
  try {
    const chatLog = await ChatLog.findOne({
      clientId: INSTAGRAM_BOT_ID,
      sessionId,
    }).select('messages');

    if (!chatLog?.messages) return [];

    // Return last 10 messages for context
    return chatLog.messages.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));
  } catch {
    return [];
  }
}

/**
 * Save messages to conversation history
 */
async function saveHistory(
  sessionId: string,
  userMessage: string,
  assistantMessage: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    await ChatLog.findOneAndUpdate(
      { clientId: INSTAGRAM_BOT_ID, sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: userMessage, timestamp: new Date() },
              { role: 'assistant', content: assistantMessage, timestamp: new Date() },
            ],
          },
        },
        $setOnInsert: {
          clientId: INSTAGRAM_BOT_ID,
          sessionId,
          metadata: { ...metadata, channel: 'instagram' },
        },
      },
      { upsert: true, new: true }
    );
  } catch (err) {
    console.error('[ManyChat] Failed to save history:', err);
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
      console.log(`[ManyChat] Blocked: username="${username}" not in whitelist`);
      return buildResponse('');
    }
  }

  const inputText = body.last_input_text;
  if (!inputText) {
    console.warn('[ManyChat] Empty message received:', JSON.stringify(body).slice(0, 200));
    return buildResponse('Не удалось обработать сообщение.');
  }

  const { type: messageType, mediaUrl } = detectMessageType(body);
  console.log(`[ManyChat] ${messageType} from @${body.ig_username || body.ig_id}: ${inputText.slice(0, 80)}`);

  // Session: persists for 24 hours per user
  const subscriberId = body.subscriber_id || body.ig_id || 'unknown';
  const dayBlock = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const sessionId = `ig_${subscriberId}_${dayBlock}`;

  const metadata = {
    instagramId: body.ig_id,
    instagramUsername: body.ig_username,
    customerName: [body.first_name, body.last_name].filter(Boolean).join(' ') || undefined,
    subscriberId: body.subscriber_id,
    messageType,
  };

  // --- Voice/Photo: async processing (no 10s limit) ---
  if (messageType !== 'text' && mediaUrl && body.subscriber_id) {
    // Load processing message from DB config (quick query)
    let processingMsg = 'Секунду, обрабатываю...';
    try {
      await connectDB();
      const igConfig = await InstagramConfig.findOne().select('processingMessage').lean();
      if (igConfig?.processingMessage) processingMsg = igConfig.processingMessage;
    } catch {}

    // Fire and forget — process in background, send response via ManyChat API
    processMediaAsync(inputText, messageType, mediaUrl, sessionId, metadata, body.subscriber_id).catch((err) =>
      console.error('[ManyChat] Async processing failed:', err)
    );
    // Return "processing" message immediately — the real response comes via API
    return buildResponse(processingMsg);
  }

  // --- Text: synchronous processing (within 9s) ---
  const timeoutResponse = buildResponse('Извините, ответ занимает слишком много времени. Попробуйте ещё раз.');

  return withTimeout(
    processMessage(inputText, messageType, undefined, sessionId, metadata),
    MANYCHAT_TIMEOUT_MS,
    timeoutResponse
  );
}

/**
 * Async processing for voice/photo — no time limit, sends via ManyChat API
 */
async function processMediaAsync(
  rawMessage: string,
  messageType: MessageType,
  mediaUrl: string,
  sessionId: string,
  metadata: Record<string, unknown>,
  subscriberId: string
): Promise<void> {
  try {
    const response = await processMessage(rawMessage, messageType, mediaUrl, sessionId, metadata);
    const text = response.content.messages[0]?.text;
    if (text) {
      await sendViaManyChatAPI(subscriberId, text);
    }
  } catch (error) {
    console.error('[ManyChat] Async media processing error:', error);
    await sendViaManyChatAPI(subscriberId, 'Произошла ошибка при обработке. Попробуйте отправить текстом.');
  }
}

/**
 * Core: process message through Gemini AI with conversation history
 */
async function processMessage(
  rawMessage: string,
  messageType: MessageType,
  mediaUrl: string | undefined,
  sessionId: string,
  metadata: Record<string, unknown>
): Promise<ManyChatResponse> {
  try {
    // --- Run DB connect + media download + config/history load in parallel ---
    const mediaPromise = mediaUrl ? downloadMedia(mediaUrl) : Promise.resolve(null);
    const dbPromise = connectDB().then(() => Promise.all([InstagramConfig.findOne(), loadHistory(sessionId)]));

    const [media, [igConfig, history]] = await Promise.all([mediaPromise, dbPromise]);

    // --- Process media result (use actual content-type to determine real type) ---
    let audioData: { data: string; mimeType: string } | undefined;
    let imageData: { data: string; mimeType: string } | undefined;
    let textMessage = rawMessage;
    let actualType = messageType;

    if (mediaUrl && media) {
      // Use the actual content-type from the HTTP response to determine real media type
      // This fixes the issue where URL-based detection guesses wrong (e.g., photo detected as voice)
      const ct = media.mimeType.toLowerCase();
      if (ct.startsWith('image/')) {
        actualType = 'photo';
      } else if (ct.startsWith('audio/') || ct.startsWith('video/')) {
        actualType = 'voice';
      }
      console.log(
        `[ManyChat] Media actual content-type: ${media.mimeType}, resolved type: ${actualType} (detected: ${messageType})`
      );
    }

    if (actualType === 'voice' && mediaUrl) {
      if (media) {
        // Instagram sends voice as video/mp4 (AAC inside MP4 container)
        // Gemini only accepts: audio/wav, audio/mp3, audio/aac, audio/ogg, audio/flac
        media.mimeType = 'audio/aac';
        console.log(`[ManyChat] Voice mimeType set to: ${media.mimeType}`);
        audioData = media;
        textMessage = 'Пользователь отправил голосовое сообщение. Послушай его и ответь на то, что он сказал.';
      } else {
        return buildResponse('Не удалось обработать голосовое сообщение. Попробуйте отправить текстом.');
      }
    }

    if (actualType === 'photo' && mediaUrl) {
      if (media) {
        imageData = media;
        textMessage = 'Пользователь отправил фото. Посмотри на него и ответь уместно.';
      } else {
        return buildResponse('Не удалось обработать фото. Попробуйте отправить ещё раз.');
      }
    }

    const systemPrompt = igConfig?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const aiModel = igConfig?.aiModel || 'gemini-3-flash-preview';
    const temperature = igConfig?.temperature ?? 0.7;
    const maxTokens = igConfig?.maxTokens || 2048;

    // --- Build prompt ---
    let prompt = systemPrompt;

    if (history.length > 0) {
      const historyText = history.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
      prompt += `\n\nИстория разговора:\n${historyText}`;
    }

    prompt += `\n\nUser: ${textMessage}`;

    // --- Call Gemini API ---
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: aiModel,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    // Build multimodal content if media present
    const mediaParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
    if (imageData) {
      mediaParts.push({ inlineData: { data: imageData.data, mimeType: imageData.mimeType } });
    }
    if (audioData) {
      mediaParts.push({ inlineData: { data: audioData.data, mimeType: audioData.mimeType } });
    }

    const contentInput = mediaParts.length > 0 ? [{ text: prompt }, ...mediaParts] : prompt;

    const result = await model.generateContent(contentInput);

    // Check for blocked response (PROHIBITED_CONTENT, SAFETY, etc.)
    const candidate = result.response.candidates?.[0];
    if (candidate?.finishReason && !['STOP', 'MAX_TOKENS'].includes(candidate.finishReason)) {
      console.warn(`[ManyChat] Gemini blocked response: finishReason=${candidate.finishReason}`);
      return buildResponse('Извините, не могу ответить на это сообщение. Попробуйте переформулировать.');
    }

    let responseText: string;
    try {
      responseText = result.response.text();
    } catch (textError: unknown) {
      // Gemini throws when text() is called on a blocked response
      const errMsg = textError instanceof Error ? textError.message : String(textError);
      if (errMsg.includes('PROHIBITED_CONTENT') || errMsg.includes('blocked')) {
        console.warn(`[ManyChat] Gemini PROHIBITED_CONTENT: ${errMsg.slice(0, 200)}`);
        return buildResponse('Извините, не могу ответить на это сообщение. Попробуйте переформулировать.');
      }
      throw textError;
    }

    // Truncate for Instagram DM limits (1000 chars)
    if (responseText.length > 1000) {
      responseText = responseText.slice(0, 997) + '...';
    }

    // Save conversation history (non-blocking)
    saveHistory(sessionId, textMessage, responseText, metadata).catch(() => {});

    console.log(`[ManyChat] Response (${responseText.length} chars): ${responseText.slice(0, 80)}...`);
    return buildResponse(responseText);
  } catch (error) {
    // Catch-all for PROHIBITED_CONTENT that may throw at any stage
    const errMsg = error instanceof Error ? error.message : String(error);
    if (errMsg.includes('PROHIBITED_CONTENT') || errMsg.includes('blocked') || errMsg.includes('SAFETY')) {
      console.warn(`[ManyChat] Gemini content blocked (catch-all): ${errMsg.slice(0, 200)}`);
      return buildResponse('Извините, не могу ответить на это сообщение. Попробуйте переформулировать.');
    }
    console.error('[ManyChat] Processing error:', error);
    return buildResponse('Произошла ошибка. Попробуйте позже.');
  }
}
