/**
 * Emotion AI
 *
 * Real-time sentiment analysis during conversations.
 * Adapts AI tone and triggers escalation when needed.
 *
 * Lightweight: uses keyword matching + optional Gemini for complex cases.
 */

import connectDB from '@/lib/mongodb';
import CustomerProfile from '@/models/CustomerProfile';

// ── Keyword-Based Fast Sentiment ─────────────────────────────────────────────

const POSITIVE_KEYWORDS = [
  'thank',
  'thanks',
  'great',
  'awesome',
  'perfect',
  'excellent',
  'love',
  'amazing',
  'helpful',
  'good',
  'nice',
  'wonderful',
  'appreciate',
  'fantastic',
  'happy',
  'спасибо',
  'отлично',
  'супер',
  'здорово',
  'прекрасно',
  'классно',
  'замечательно',
  'дякую',
  'чудово',
  'файно',
];

const NEGATIVE_KEYWORDS = [
  'angry',
  'frustrated',
  'terrible',
  'awful',
  'horrible',
  'worst',
  'hate',
  'useless',
  'broken',
  "doesn't work",
  'not working',
  'disappointed',
  'annoyed',
  'ridiculous',
  'ужасно',
  'отвратительно',
  'плохо',
  'не работает',
  'сломано',
  'разочарован',
  'жахливо',
  'не працює',
  'погано',
];

const ESCALATION_KEYWORDS = [
  'speak to human',
  'talk to someone',
  'real person',
  'manager',
  'supervisor',
  'complaint',
  'legal',
  'lawyer',
  'sue',
  'refund',
  'cancel subscription',
  'человек',
  'оператор',
  'менеджер',
  'жалоба',
  'возврат',
  'отмена',
  'людина',
  'оператор',
  'скарга',
];

export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // -1 to 1
  needsEscalation: boolean;
  emotionLabel?: string; // "frustrated", "happy", "confused", etc.
  toneAdjustment?: string; // Instruction for AI: "be more empathetic", "be enthusiastic"
}

/**
 * Fast keyword-based sentiment analysis.
 * No API calls — runs in <1ms.
 */
export function analyzeSentimentFast(message: string): SentimentResult {
  const lower = message.toLowerCase();

  let positiveCount = 0;
  let negativeCount = 0;
  let needsEscalation = false;

  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw)) positiveCount++;
  }
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw)) negativeCount++;
  }
  for (const kw of ESCALATION_KEYWORDS) {
    if (lower.includes(kw)) needsEscalation = true;
  }

  // Caps lock detection (frustration indicator)
  const capsRatio = (message.match(/[A-ZА-ЯҐЄІЇ]/g) || []).length / Math.max(message.length, 1);
  if (capsRatio > 0.6 && message.length > 10) negativeCount += 2;

  // Exclamation marks (intensity)
  const exclamations = (message.match(/!/g) || []).length;
  if (exclamations >= 3) negativeCount += 1;

  // Question marks cluster (confusion/frustration)
  const questions = (message.match(/\?/g) || []).length;
  if (questions >= 3) negativeCount += 1;

  const total = positiveCount + negativeCount;
  let score = 0;
  let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
  let emotionLabel: string | undefined;
  let toneAdjustment: string | undefined;

  if (total > 0) {
    score = (positiveCount - negativeCount) / total;
    score = Math.max(-1, Math.min(1, score));
  }

  if (score > 0.3) {
    sentiment = 'positive';
    emotionLabel = 'happy';
    toneAdjustment = 'match their positive energy, be enthusiastic';
  } else if (score < -0.3) {
    sentiment = 'negative';
    emotionLabel = negativeCount >= 3 ? 'frustrated' : 'disappointed';
    toneAdjustment =
      'be empathetic and solution-focused, acknowledge their frustration, prioritize resolving their issue';
  }

  if (needsEscalation) {
    toneAdjustment = 'acknowledge they want human help, be apologetic, confirm you will connect them with a person';
  }

  return { sentiment, score, needsEscalation, emotionLabel, toneAdjustment };
}

/**
 * Analyze sentiment across a conversation (last N messages).
 * Returns overall trend.
 */
export function analyzeConversationSentiment(messages: Array<{ role: string; content: string }>): SentimentResult {
  const userMessages = messages.filter((m) => m.role === 'user').slice(-5);
  if (userMessages.length === 0) {
    return { sentiment: 'neutral', score: 0, needsEscalation: false };
  }

  let totalScore = 0;
  let anyEscalation = false;
  let latestResult: SentimentResult = { sentiment: 'neutral', score: 0, needsEscalation: false };

  for (const msg of userMessages) {
    const result = analyzeSentimentFast(msg.content);
    totalScore += result.score;
    if (result.needsEscalation) anyEscalation = true;
    latestResult = result;
  }

  const avgScore = totalScore / userMessages.length;
  const sentiment: 'positive' | 'neutral' | 'negative' =
    avgScore > 0.3 ? 'positive' : avgScore < -0.3 ? 'negative' : 'neutral';

  return {
    ...latestResult,
    sentiment,
    score: avgScore,
    needsEscalation: anyEscalation,
  };
}

/**
 * Build tone adjustment instruction for AI system prompt.
 */
export function buildEmotionContext(sentimentResult: SentimentResult): string {
  if (!sentimentResult.toneAdjustment) return '';

  let context = `\n\nEMOTION CONTEXT:`;
  context += `\nCustomer mood: ${sentimentResult.emotionLabel || sentimentResult.sentiment} (${sentimentResult.score.toFixed(1)})`;
  context += `\nTone instruction: ${sentimentResult.toneAdjustment}`;

  if (sentimentResult.needsEscalation) {
    context += '\nACTION: Customer wants to speak to a human. Prioritize connecting them with support.';
  }

  return context;
}

/**
 * Update customer profile sentiment.
 */
export async function updateProfileSentiment(
  clientId: string,
  visitorId: string,
  sentimentResult: SentimentResult
): Promise<void> {
  await connectDB();

  await CustomerProfile.findOneAndUpdate(
    { clientId, visitorId },
    {
      $set: {
        'sentiment.current': sentimentResult.sentiment,
        'sentiment.score': sentimentResult.score,
      },
      $push: {
        'sentiment.history': {
          $each: [{ score: sentimentResult.score, timestamp: new Date() }],
          $slice: -50, // Keep last 50 entries
        },
      },
    }
  );
}
