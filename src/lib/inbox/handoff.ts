export interface HandoffInput {
  message: string;
  consecutiveLowConfidence: number;
  contactLeadScore: number;
  messageText: string; // same as message, used for high-value check
}

export interface HandoffResult {
  shouldHandoff: boolean;
  reason?: 'user_request' | 'low_confidence' | 'negative_sentiment' | 'high_value';
}

const HUMAN_KEYWORDS = [
  'human',
  'operator',
  'person',
  'agent',
  'real person',
  'talk to someone',
  'живой',
  'оператор',
  'человек',
  'позовите',
  'людина',
  'оператор',
  'поговорити з людиною',
];

const NEGATIVE_WORDS = [
  'terrible',
  'awful',
  'worst',
  'useless',
  'stupid',
  'hate',
  'ужасно',
  'отвратительно',
  'бесполезно',
  'жахливо',
  'огидно',
];

const PRICING_KEYWORDS = [
  'price',
  'pricing',
  'cost',
  'enterprise',
  'demo',
  'quote',
  'цена',
  'стоимость',
  'прайс',
  'демо',
  'ціна',
  'вартість',
];

export function detectHandoff(input: HandoffInput): HandoffResult {
  const msg = input.message.toLowerCase();

  // 1. User request keywords
  if (HUMAN_KEYWORDS.some((kw) => msg.includes(kw))) {
    return { shouldHandoff: true, reason: 'user_request' };
  }

  // 2. Low confidence (2+ consecutive messages without RAG grounding)
  if (input.consecutiveLowConfidence >= 2) {
    return { shouldHandoff: true, reason: 'low_confidence' };
  }

  // 3. Negative sentiment: ALL CAPS (5+ word message), excessive punctuation, negative words
  const words = input.message.split(/\s+/).filter((w) => w.length > 1);
  const capsRatio =
    words.filter((w) => w === w.toUpperCase() && /[A-ZА-ЯҐЄІЇ]/.test(w)).length / Math.max(words.length, 1);
  const hasExcessivePunctuation = /[!?]{3,}/.test(input.message);
  const hasNegativeWords = NEGATIVE_WORDS.some((w) => msg.includes(w));

  if ((capsRatio > 0.7 && words.length >= 4) || hasExcessivePunctuation || hasNegativeWords) {
    return { shouldHandoff: true, reason: 'negative_sentiment' };
  }

  // 4. High value lead + pricing keywords
  const text = input.messageText.toLowerCase();
  if (input.contactLeadScore > 80 && PRICING_KEYWORDS.some((kw) => text.includes(kw))) {
    return { shouldHandoff: true, reason: 'high_value' };
  }

  return { shouldHandoff: false };
}
