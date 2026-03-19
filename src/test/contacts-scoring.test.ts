import { describe, it, expect } from 'vitest';
import { calculateScore } from '@/lib/contacts/scoring';

describe('Lead Scoring', () => {
  it('should return 0 for empty input', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 1,
      totalMessages: 0,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(0);
    expect(result.temp).toBe('cold');
    expect(result.breakdown).toEqual([]);
  });

  it('should detect pricing keywords (+25)', () => {
    const result = calculateScore({
      messages: ['How much does the enterprise plan cost?'],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(25);
    expect(result.breakdown).toContainEqual({ reason: 'Asked about pricing', points: 25 });
  });

  it('should detect email (+15)', () => {
    const result = calculateScore({
      messages: ['My email is john@example.com'],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(15);
    expect(result.breakdown).toContainEqual({ reason: 'Left email', points: 15 });
  });

  it('should detect phone (+10)', () => {
    const result = calculateScore({
      messages: ['Call me at +380671234567'],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(10);
    expect(result.breakdown).toContainEqual({ reason: 'Left phone number', points: 10 });
  });

  it('should score returning visitors (+20)', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 3,
      totalMessages: 2,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(20);
    expect(result.temp).toBe('cold'); // 20 is still cold
  });

  it('should score 5+ messages (+12)', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 1,
      totalMessages: 7,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(12);
  });

  it('should score handoff request (+15)', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: true,
      metadata: {},
    });
    expect(result.score).toBe(15);
  });

  it('should score paid traffic (+10)', () => {
    const result = calculateScore({
      messages: [],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: { referrer: 'https://example.com?utm_source=google_ads' },
    });
    expect(result.score).toBe(10);
  });

  it('should combine multiple signals and cap at 100', () => {
    const result = calculateScore({
      messages: ['How much does it cost?', 'My email is a@b.com', 'Call me at +1234567890'],
      totalConversations: 3,
      totalMessages: 10,
      hasHandoff: true,
      metadata: { referrer: 'https://x.com?utm_source=fb' },
    });
    // 25 + 15 + 10 + 20 + 12 + 15 + 10 = 107 → capped at 100
    expect(result.score).toBe(100);
    expect(result.temp).toBe('hot');
  });

  it('should classify warm (31-65)', () => {
    const result = calculateScore({
      messages: ['What is the pricing?'],
      totalConversations: 2,
      totalMessages: 3,
      hasHandoff: false,
      metadata: {},
    });
    // 25 + 20 = 45
    expect(result.score).toBe(45);
    expect(result.temp).toBe('warm');
  });

  it('should detect Ukrainian/Russian pricing keywords', () => {
    const result = calculateScore({
      messages: ['Скільки коштує?'],
      totalConversations: 1,
      totalMessages: 1,
      hasHandoff: false,
      metadata: {},
    });
    expect(result.score).toBe(25);
  });
});
