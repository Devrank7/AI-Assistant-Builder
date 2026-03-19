import type { LeadTemperature } from '@/models/Contact';

interface ScoringInput {
  messages: string[];
  totalConversations: number;
  totalMessages: number;
  hasHandoff: boolean;
  metadata: Record<string, string | undefined>;
}

interface ScoringResult {
  score: number;
  temp: LeadTemperature;
  breakdown: Array<{ reason: string; points: number }>;
}

const PRICING_KEYWORDS = [
  'price',
  'pricing',
  'cost',
  'how much',
  'quote',
  'rates',
  'цена',
  'стоимость',
  'сколько стоит',
  'прайс',
  'ціна',
  'вартість',
  'скільки коштує',
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /\+?\d[\d\s\-()]{7,}\d/;

export function calculateScore(input: ScoringInput): ScoringResult {
  const breakdown: Array<{ reason: string; points: number }> = [];
  const allText = input.messages.join(' ').toLowerCase();

  // 1. Pricing keywords (+25)
  if (PRICING_KEYWORDS.some((kw) => allText.includes(kw))) {
    breakdown.push({ reason: 'Asked about pricing', points: 25 });
  }

  // 2. Left email (+15)
  if (EMAIL_REGEX.test(allText)) {
    breakdown.push({ reason: 'Left email', points: 15 });
  }

  // 3. Left phone (+10)
  if (PHONE_REGEX.test(allText)) {
    breakdown.push({ reason: 'Left phone number', points: 10 });
  }

  // 4. Returning visitor (+20)
  if (input.totalConversations >= 2) {
    breakdown.push({ reason: 'Returning visitor', points: 20 });
  }

  // 5. Engaged — 5+ messages (+12)
  if (input.totalMessages >= 5) {
    breakdown.push({ reason: '5+ messages', points: 12 });
  }

  // 6. Requested human (+15)
  if (input.hasHandoff) {
    breakdown.push({ reason: 'Requested human agent', points: 15 });
  }

  // 7. Paid traffic (+10)
  if (input.metadata.referrer && input.metadata.referrer.includes('utm_source')) {
    breakdown.push({ reason: 'From paid ads', points: 10 });
  }

  const rawScore = breakdown.reduce((sum, b) => sum + b.points, 0);
  const score = Math.min(rawScore, 100);

  let temp: LeadTemperature = 'cold';
  if (score >= 66) temp = 'hot';
  else if (score >= 31) temp = 'warm';

  return { score, temp, breakdown };
}
