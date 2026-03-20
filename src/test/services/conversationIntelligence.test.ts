import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/ConversationInsight', () => ({
  default: {
    insertMany: vi.fn().mockResolvedValue([]),
    find: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@/models/CustomerProfile', () => ({
  default: {
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
    aggregate: vi.fn().mockResolvedValue([]),
  },
}));
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                intents: [{ label: 'pricing_inquiry', confidence: 0.9 }],
                buyingSignalScore: 75,
                churnRiskScore: 10,
                insights: [
                  { type: 'buying_signal', label: 'price_check', confidence: 0.85, details: 'Asked about pricing' },
                ],
                suggestedTags: ['interested'],
              }),
          },
        }),
      };
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

describe('conversationIntelligence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return default result for short conversations', async () => {
    const { analyzeConversation } = await import('@/lib/conversationIntelligence');
    const result = await analyzeConversation([{ role: 'user', content: 'Hi' }]);

    expect(result.intents).toEqual([]);
    expect(result.buyingSignalScore).toBe(0);
    expect(result.churnRiskScore).toBe(0);
  });

  it('should analyze conversation and extract buying signals', async () => {
    const { analyzeConversation } = await import('@/lib/conversationIntelligence');
    const result = await analyzeConversation([
      { role: 'user', content: 'How much does the pro plan cost?' },
      { role: 'assistant', content: 'The pro plan is $79/month.' },
      { role: 'user', content: 'Can I get a discount for annual billing?' },
      { role: 'assistant', content: 'Yes, annual billing saves 20%.' },
    ]);

    expect(result.intents.length).toBeGreaterThan(0);
    expect(result.buyingSignalScore).toBe(75);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('should store insights with confidence >= 0.6', async () => {
    const ConversationInsight = (await import('@/models/ConversationInsight')).default;
    const { storeInsights } = await import('@/lib/conversationIntelligence');

    await storeInsights('client-1', 'session-1', 'visitor-1', {
      intents: [{ label: 'pricing_inquiry', confidence: 0.9 }],
      buyingSignalScore: 80,
      churnRiskScore: 5,
      insights: [
        { type: 'buying_signal' as any, label: 'price_check', confidence: 0.85, details: 'Asked about pricing' },
        { type: 'intent' as any, label: 'low_conf', confidence: 0.3, details: 'Maybe' },
      ],
      suggestedTags: ['hot_lead'],
    });

    expect(ConversationInsight.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ label: 'price_check', confidence: 0.85 })])
    );
    // Low confidence insight should be filtered out
    const insertedDocs = (ConversationInsight.insertMany as any).mock.calls[0][0];
    expect(insertedDocs.length).toBe(1);
  });

  it('should get insights summary with aggregated data', async () => {
    const ConversationInsight = (await import('@/models/ConversationInsight')).default;
    (ConversationInsight.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        { type: 'intent', label: 'pricing_inquiry' },
        { type: 'intent', label: 'pricing_inquiry' },
        { type: 'competitor_mention', label: 'CompetitorX' },
        { type: 'escalation_needed', label: 'urgent' },
      ]),
    });

    const CustomerProfile = (await import('@/models/CustomerProfile')).default;
    (CustomerProfile.aggregate as any).mockResolvedValue([{ avgBuying: 60, avgChurn: 15 }]);

    const { getInsightsSummary } = await import('@/lib/conversationIntelligence');
    const summary = await getInsightsSummary('client-1', 30);

    expect(summary.topIntents[0].label).toBe('pricing_inquiry');
    expect(summary.topIntents[0].count).toBe(2);
    expect(summary.avgBuyingSignal).toBe(60);
    expect(summary.competitorMentions.length).toBe(1);
    expect(summary.recentEscalations).toBe(1);
  });

  it('should run full pipeline via processConversationIntelligence', async () => {
    const ConversationInsight = (await import('@/models/ConversationInsight')).default;
    const { processConversationIntelligence } = await import('@/lib/conversationIntelligence');

    const result = await processConversationIntelligence('client-1', 'session-1', 'visitor-1', [
      { role: 'user', content: 'What is the price?' },
      { role: 'assistant', content: '$79/month for Pro.' },
    ]);

    expect(result.intents.length).toBeGreaterThan(0);
    expect(ConversationInsight.insertMany).toHaveBeenCalled();
  });
});
