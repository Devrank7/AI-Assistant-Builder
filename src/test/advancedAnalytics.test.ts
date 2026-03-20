import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MongoDB
const mockConnectDB = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));

// Mock models
const mockChatLogDistinct = vi.fn();
const mockChatLogCountDocuments = vi.fn();
const mockChatLogAggregate = vi.fn();
const mockChatLogFind = vi.fn();
const mockContactCountDocuments = vi.fn();
const mockCustomerProfileFind = vi.fn();
const mockCustomerProfileAggregate = vi.fn();
const mockConversationInsightAggregate = vi.fn();

vi.mock('@/models/ChatLog', () => ({
  default: {
    distinct: (...args: unknown[]) => mockChatLogDistinct(...args),
    countDocuments: (...args: unknown[]) => mockChatLogCountDocuments(...args),
    aggregate: (...args: unknown[]) => mockChatLogAggregate(...args),
    find: (...args: unknown[]) => ({
      distinct: mockChatLogFind,
    }),
  },
}));

vi.mock('@/models/Contact', () => ({
  default: {
    countDocuments: (...args: unknown[]) => mockContactCountDocuments(...args),
  },
}));

vi.mock('@/models/CustomerProfile', () => ({
  default: {
    find: (...args: unknown[]) => mockCustomerProfileFind(...args),
    aggregate: (...args: unknown[]) => mockCustomerProfileAggregate(...args),
  },
}));

vi.mock('@/models/ConversationInsight', () => ({
  default: {
    aggregate: (...args: unknown[]) => mockConversationInsightAggregate(...args),
  },
}));

describe('Advanced Analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFunnelAnalysis', () => {
    it('should return 5 funnel stages with correct structure', async () => {
      mockChatLogDistinct.mockResolvedValue(['s1', 's2', 's3', 's4', 's5']);
      mockChatLogCountDocuments.mockResolvedValue(4);
      mockChatLogAggregate.mockResolvedValue([{ total: 3 }]);
      mockContactCountDocuments
        .mockResolvedValueOnce(2) // leads
        .mockResolvedValueOnce(1); // conversions

      const { getFunnelAnalysis } = await import('@/lib/advancedAnalytics');
      const result = await getFunnelAnalysis('client1', 30);

      expect(result).toHaveLength(5);
      expect(result[0].name).toBe('Visit');
      expect(result[0].count).toBe(5);
      expect(result[4].name).toBe('Conversion');
      expect(result[4].count).toBe(1);
      // Each stage should have dropOff and conversionRate
      for (const stage of result) {
        expect(stage).toHaveProperty('dropOff');
        expect(stage).toHaveProperty('conversionRate');
      }
    });
  });

  describe('getPredictiveChurnScores', () => {
    it('should return high-risk profiles with warning signals', async () => {
      const mockProfiles = [
        {
          visitorId: 'v1',
          name: 'Test User',
          email: 'test@example.com',
          churnRisk: 85,
          lastActiveAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
          messageCount: 2,
          sentiment: { current: 'negative', score: -0.5, history: [] },
        },
      ];
      mockCustomerProfileFind.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(mockProfiles),
          }),
        }),
      });

      const { getPredictiveChurnScores } = await import('@/lib/advancedAnalytics');
      const result = await getPredictiveChurnScores('client1');

      expect(result).toHaveLength(1);
      expect(result[0].churnRisk).toBe(85);
      expect(result[0].warningSignals).toContain('Critical churn risk');
      expect(result[0].warningSignals).toContain('Negative sentiment');
      expect(result[0].warningSignals).toContain('Low engagement');
    });
  });

  describe('getRevenueAttribution', () => {
    it('should aggregate revenue by channel', async () => {
      mockCustomerProfileAggregate.mockResolvedValue([
        { _id: 'website', revenue: 500 },
        { _id: 'telegram', revenue: 300 },
      ]);
      mockConversationInsightAggregate.mockResolvedValue([
        { _id: 'pricing_inquiry', conversions: 10 },
        { _id: 'booking_request', conversions: 5 },
      ]);

      const { getRevenueAttribution } = await import('@/lib/advancedAnalytics');
      const result = await getRevenueAttribution('client1', 30);

      expect(result.totalRevenue).toBe(800);
      expect(result.byChannel).toHaveLength(2);
      expect(result.byChannel[0].channel).toBe('website');
      expect(result.topConvertingIntents).toHaveLength(2);
    });
  });
});
