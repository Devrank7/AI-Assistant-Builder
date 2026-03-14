export interface IntentResult {
  intent: 'none' | 'booking' | 'contact_info';
  data?: {
    email?: string;
    phone?: string;
    name?: string;
  };
}

const BOOKING_KEYWORDS = [
  'book',
  'schedule',
  'appointment',
  'meeting',
  'reserve',
  'calendar',
  'booking',
  'scheduled',
  'appointments',
  'meetings',
  'reservation',
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{2,4}/;
const NAME_REGEX = /(?:my name is|i'm|i am|this is|name:\s*)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;

export function detectIntent(message: string): IntentResult {
  const lower = message.toLowerCase();

  // Check for booking intent
  const hasBookingKeyword = BOOKING_KEYWORDS.some((kw) => lower.includes(kw));
  if (hasBookingKeyword) {
    return { intent: 'booking' };
  }

  // Check for contact info intent
  const emailMatch = message.match(EMAIL_REGEX);
  const phoneMatch = message.match(PHONE_REGEX);
  const nameMatch = message.match(NAME_REGEX);

  if (emailMatch || phoneMatch || nameMatch || lower.includes('contact me')) {
    const data: IntentResult['data'] = {};
    if (emailMatch) data.email = emailMatch[0];
    if (phoneMatch) data.phone = phoneMatch[0].trim();
    if (nameMatch) data.name = nameMatch[1].trim();
    return { intent: 'contact_info', data };
  }

  return { intent: 'none' };
}
