/**
 * ManyChat Integration Service — Standalone Instagram Assistant
 *
 * A self-contained AI chatbot for Instagram DMs via ManyChat.
 * NOT connected to widget clients — this is an independent assistant.
 *
 * Features:
 * - Text messages: direct AI response
 * - Voice messages: download audio → Gemini transcribes & responds
 * - Photo messages: download image → Gemini analyzes & responds
 * - Conversation history: persisted per Instagram user
 * - Username whitelist: only responds to allowed accounts
 *
 * Flow:
 * 1. User sends DM on Instagram
 * 2. ManyChat receives it → triggers External Request to our webhook
 * 3. We detect message type, download media if needed
 * 4. Load conversation history for this user
 * 5. Send to Gemini API with system prompt + history
 * 6. Save conversation, return response in ManyChat v2 format
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import ChatLog from '@/models/ChatLog';
import InstagramConfig from '@/models/InstagramConfig';

// ManyChat External Request timeout is ~10s; we use 9s to leave margin
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
      signal: AbortSignal.timeout(6_000),
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

  const timeoutResponse = buildResponse('Извините, ответ занимает слишком много времени. Попробуйте ещё раз.');

  return withTimeout(
    processMessage(inputText, messageType, mediaUrl, sessionId, metadata),
    MANYCHAT_TIMEOUT_MS,
    timeoutResponse
  );
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
    await connectDB();

    // --- Download media if voice or photo ---
    let audioData: { data: string; mimeType: string } | undefined;
    let imageData: { data: string; mimeType: string } | undefined;
    let textMessage = rawMessage;

    if (messageType === 'voice' && mediaUrl) {
      const media = await downloadMedia(mediaUrl);
      if (media) {
        // Instagram sends voice as video/mp4 — remap to audio/mp4 for Gemini
        if (media.mimeType.startsWith('video/')) {
          media.mimeType = media.mimeType.replace('video/', 'audio/');
        }
        audioData = media;
        textMessage = 'Пользователь отправил голосовое сообщение. Послушай его и ответь на то, что он сказал.';
      } else {
        return buildResponse('Не удалось обработать голосовое сообщение. Попробуйте отправить текстом.');
      }
    }

    if (messageType === 'photo' && mediaUrl) {
      const media = await downloadMedia(mediaUrl);
      if (media) {
        imageData = media;
        textMessage = 'Пользователь отправил фото. Посмотри на него и ответь уместно.';
      } else {
        return buildResponse('Не удалось обработать фото. Попробуйте отправить ещё раз.');
      }
    }

    // --- Load Instagram config from DB (admin panel settings) ---
    const igConfig = await InstagramConfig.findOne();
    const systemPrompt = igConfig?.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    const aiModel = igConfig?.aiModel || 'gemini-3-flash-preview';
    const temperature = igConfig?.temperature ?? 0.7;
    const maxTokens = igConfig?.maxTokens || 1024;

    // --- Load conversation history ---
    const history = await loadHistory(sessionId);

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

    // Call Gemini with one retry on 500 errors
    let result;
    try {
      result = await model.generateContent(contentInput);
    } catch (err: unknown) {
      const status = (err as { status?: number }).status;
      if (status === 500 || status === 503) {
        console.log('[ManyChat] Gemini 500/503, retrying once...');
        await new Promise((r) => setTimeout(r, 1000));
        result = await model.generateContent(contentInput);
      } else {
        throw err;
      }
    }
    let responseText = result.response.text();

    // Truncate for Instagram DM limits (1000 chars)
    if (responseText.length > 1000) {
      responseText = responseText.slice(0, 997) + '...';
    }

    // --- Save conversation history ---
    await saveHistory(sessionId, textMessage, responseText, metadata);

    console.log(`[ManyChat] Response (${responseText.length} chars): ${responseText.slice(0, 80)}...`);
    return buildResponse(responseText);
  } catch (error) {
    console.error('[ManyChat] Processing error:', error);
    return buildResponse('Произошла ошибка. Попробуйте позже.');
  }
}
