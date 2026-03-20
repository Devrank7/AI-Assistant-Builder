/**
 * Voice Agent
 *
 * Processes voice transcripts through the AI pipeline and formats
 * responses for speech output, including SSML generation.
 */

import { routeMessage } from '@/lib/channelRouter';
import type { RouteMessageInput } from '@/lib/channelRouter';

export interface VoiceRequest {
  clientId: string;
  transcript: string;
  sessionId?: string;
  visitorId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  language?: string;
}

export interface VoiceResponse {
  success: boolean;
  text: string;
  ssml: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  error?: string;
}

/**
 * Clean AI response text for speech synthesis.
 * Removes markdown, URLs, special formatting, and excessive punctuation.
 */
function cleanTextForSpeech(text: string): string {
  let clean = text;

  // Remove markdown bold/italic
  clean = clean.replace(/\*\*(.+?)\*\*/g, '$1');
  clean = clean.replace(/\*(.+?)\*/g, '$1');
  clean = clean.replace(/_(.+?)_/g, '$1');

  // Remove markdown links [text](url) -> text
  clean = clean.replace(/\[(.+?)\]\(.+?\)/g, '$1');

  // Remove URLs
  clean = clean.replace(/https?:\/\/\S+/g, '');

  // Remove markdown headers
  clean = clean.replace(/^#{1,6}\s+/gm, '');

  // Remove markdown list markers
  clean = clean.replace(/^[-*]\s+/gm, '');
  clean = clean.replace(/^\d+\.\s+/gm, '');

  // Remove code blocks
  clean = clean.replace(/```[\s\S]*?```/g, '');
  clean = clean.replace(/`(.+?)`/g, '$1');

  // Remove rich blocks (carousel, form, etc.)
  clean = clean.replace(/:::[\s\S]*?:::/g, '');

  // Remove suggestion tags
  clean = clean.replace(/\[SUGGESTIONS\].*?\[\/SUGGESTIONS\]/g, '');

  // Clean up whitespace
  clean = clean.replace(/\n{3,}/g, '\n\n');
  clean = clean.trim();

  return clean;
}

/**
 * Generate SSML from cleaned text for enhanced speech output.
 */
function generateSSML(text: string, language?: string): string {
  const lang = language || 'en-US';

  // Split into sentences for natural pacing
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);

  let ssml = `<speak xml:lang="${lang}">`;

  for (const sentence of sentences) {
    // Add a brief pause between sentences
    ssml += `<s>${escapeXml(sentence)}</s>`;
    ssml += '<break time="300ms"/>';
  }

  ssml += '</speak>';
  return ssml;
}

/**
 * Escape XML special characters.
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Process a voice message through the AI pipeline.
 * Takes a transcript, gets AI response, cleans it for speech, and generates SSML.
 */
export async function processVoiceMessage(request: VoiceRequest): Promise<VoiceResponse> {
  if (!request.transcript?.trim()) {
    return {
      success: false,
      text: '',
      ssml: '',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      error: 'Empty transcript',
    };
  }

  try {
    const input: RouteMessageInput = {
      channel: 'website',
      clientId: request.clientId,
      message: request.transcript,
      sessionId: request.sessionId || `voice-${Date.now()}`,
      conversationHistory: request.conversationHistory || [],
      metadata: {
        visitorId: request.visitorId || 'voice-user',
        isVoice: true,
      },
    };

    const result = await routeMessage(input);

    if (!result.success) {
      return {
        success: false,
        text: result.error || 'AI processing failed',
        ssml: '',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        error: result.error,
      };
    }

    const cleanText = cleanTextForSpeech(result.response);
    const ssml = generateSSML(cleanText, request.language);

    return {
      success: true,
      text: cleanText,
      ssml,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[VoiceAgent] Error:', msg);
    return {
      success: false,
      text: '',
      ssml: '',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
      error: msg,
    };
  }
}
