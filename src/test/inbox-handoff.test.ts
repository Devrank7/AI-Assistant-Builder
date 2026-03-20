import { describe, it, expect } from 'vitest';
import { detectHandoff, type HandoffInput } from '@/lib/inbox/handoff';

const base: HandoffInput = {
  message: '',
  consecutiveLowConfidence: 0,
  contactLeadScore: 0,
  messageText: '',
};

describe('Handoff Detection', () => {
  it('should detect user request keywords (English)', () => {
    const result = detectHandoff({ ...base, message: 'I want to talk to a human' });
    expect(result).toEqual({ shouldHandoff: true, reason: 'user_request' });
  });

  it('should detect user request keywords (Russian)', () => {
    const result = detectHandoff({ ...base, message: 'Позовите оператора пожалуйста' });
    expect(result).toEqual({ shouldHandoff: true, reason: 'user_request' });
  });

  it('should detect user request keywords (Ukrainian)', () => {
    const result = detectHandoff({ ...base, message: 'Хочу поговорити з людиною' });
    expect(result).toEqual({ shouldHandoff: true, reason: 'user_request' });
  });

  it('should detect low confidence after 2+ consecutive', () => {
    const result = detectHandoff({ ...base, consecutiveLowConfidence: 2 });
    expect(result).toEqual({ shouldHandoff: true, reason: 'low_confidence' });
  });

  it('should NOT detect low confidence for 1 miss', () => {
    const result = detectHandoff({ ...base, consecutiveLowConfidence: 1 });
    expect(result.shouldHandoff).toBe(false);
  });

  it('should detect negative sentiment (ALL CAPS)', () => {
    const result = detectHandoff({ ...base, message: 'THIS IS TERRIBLE SERVICE' });
    expect(result).toEqual({ shouldHandoff: true, reason: 'negative_sentiment' });
  });

  it('should detect negative sentiment (excessive punctuation)', () => {
    const result = detectHandoff({ ...base, message: 'Why is nothing working???' });
    expect(result).toEqual({ shouldHandoff: true, reason: 'negative_sentiment' });
  });

  it('should detect high value lead with pricing keywords', () => {
    const result = detectHandoff({
      ...base,
      contactLeadScore: 85,
      messageText: 'What is the enterprise pricing?',
    });
    expect(result).toEqual({ shouldHandoff: true, reason: 'high_value' });
  });

  it('should NOT detect high value without pricing keywords', () => {
    const result = detectHandoff({
      ...base,
      contactLeadScore: 85,
      messageText: 'Hello how are you?',
    });
    expect(result.shouldHandoff).toBe(false);
  });

  it('should return no handoff for normal message', () => {
    const result = detectHandoff({ ...base, message: 'What are your opening hours?' });
    expect(result.shouldHandoff).toBe(false);
  });
});
