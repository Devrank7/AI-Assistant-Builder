import { NextRequest } from 'next/server';
import { processVoiceMessage } from '@/lib/voiceAgent';
import { successResponse, Errors } from '@/lib/apiResponse';

/**
 * POST /api/voice/stream — Process voice transcript through AI pipeline
 *
 * Body: { clientId, transcript, sessionId?, visitorId?, conversationHistory?, language? }
 * Returns: { text, ssml, inputTokens, outputTokens, costUsd }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.clientId) return Errors.badRequest('clientId is required');
    if (!body.transcript) return Errors.badRequest('transcript is required');

    const result = await processVoiceMessage({
      clientId: body.clientId,
      transcript: body.transcript,
      sessionId: body.sessionId,
      visitorId: body.visitorId,
      conversationHistory: body.conversationHistory,
      language: body.language,
    });

    if (!result.success) {
      return Errors.internal(result.error || 'Voice processing failed');
    }

    return successResponse({
      text: result.text,
      ssml: result.ssml,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
    });
  } catch (err) {
    console.error('[Voice API] Error:', err);
    return Errors.internal('Voice processing error');
  }
}
