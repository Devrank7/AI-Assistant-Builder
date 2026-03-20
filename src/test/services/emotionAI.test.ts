import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/CustomerProfile', () => ({
  default: {
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));

describe('emotionAI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should detect positive sentiment from keywords', async () => {
    const { analyzeSentimentFast } = await import('@/lib/emotionAI');
    const result = analyzeSentimentFast('Thank you so much, this is great and awesome!');

    expect(result.sentiment).toBe('positive');
    expect(result.score).toBeGreaterThan(0);
    expect(result.emotionLabel).toBe('happy');
    expect(result.toneAdjustment).toContain('enthusiastic');
  });

  it('should detect negative sentiment from keywords', async () => {
    const { analyzeSentimentFast } = await import('@/lib/emotionAI');
    const result = analyzeSentimentFast('This is terrible, the service is awful and broken');

    expect(result.sentiment).toBe('negative');
    expect(result.score).toBeLessThan(0);
    expect(result.emotionLabel).toMatch(/frustrated|disappointed/);
    expect(result.toneAdjustment).toContain('empathetic');
  });

  it('should detect escalation keywords', async () => {
    const { analyzeSentimentFast } = await import('@/lib/emotionAI');
    const result = analyzeSentimentFast('I want to speak to a manager right now');

    expect(result.needsEscalation).toBe(true);
    expect(result.toneAdjustment).toContain('human help');
  });

  it('should detect frustration from CAPS LOCK', async () => {
    const { analyzeSentimentFast } = await import('@/lib/emotionAI');
    const result = analyzeSentimentFast('THIS IS NOT WORKING AT ALL AND I AM VERY ANGRY');

    expect(result.sentiment).toBe('negative');
    expect(result.score).toBeLessThan(0);
  });

  it('should return neutral for neutral messages', async () => {
    const { analyzeSentimentFast } = await import('@/lib/emotionAI');
    const result = analyzeSentimentFast('What time do you open tomorrow?');

    expect(result.sentiment).toBe('neutral');
    expect(result.score).toBe(0);
  });

  it('should analyze conversation sentiment across multiple messages', async () => {
    const { analyzeConversationSentiment } = await import('@/lib/emotionAI');
    const result = analyzeConversationSentiment([
      { role: 'user', content: 'This is terrible service' },
      { role: 'assistant', content: 'I apologize for the inconvenience' },
      { role: 'user', content: 'Not working at all, very frustrated' },
      { role: 'assistant', content: 'Let me help fix that' },
      { role: 'user', content: 'Still broken, useless' },
    ]);

    expect(result.sentiment).toBe('negative');
    expect(result.score).toBeLessThan(0);
  });

  it('should build emotion context string for negative sentiment', async () => {
    const { buildEmotionContext } = await import('@/lib/emotionAI');
    const context = buildEmotionContext({
      sentiment: 'negative',
      score: -0.8,
      needsEscalation: true,
      emotionLabel: 'frustrated',
      toneAdjustment: 'be empathetic',
    });

    expect(context).toContain('EMOTION CONTEXT');
    expect(context).toContain('frustrated');
    expect(context).toContain('Customer wants to speak to a human');
  });

  it('should return empty string for neutral context without tone adjustment', async () => {
    const { buildEmotionContext } = await import('@/lib/emotionAI');
    const context = buildEmotionContext({
      sentiment: 'neutral',
      score: 0,
      needsEscalation: false,
    });

    expect(context).toBe('');
  });

  it('should update profile sentiment in database', async () => {
    const CustomerProfile = (await import('@/models/CustomerProfile')).default;
    const { updateProfileSentiment } = await import('@/lib/emotionAI');

    await updateProfileSentiment('client-1', 'visitor-1', {
      sentiment: 'positive',
      score: 0.7,
      needsEscalation: false,
    });

    expect(CustomerProfile.findOneAndUpdate).toHaveBeenCalledWith(
      { clientId: 'client-1', visitorId: 'visitor-1' },
      expect.objectContaining({
        $set: { 'sentiment.current': 'positive', 'sentiment.score': 0.7 },
      })
    );
  });
});
