import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockFind = vi.fn();
vi.mock('@/models/AgentRoutingRule', () => ({
  default: {
    find: (...args: unknown[]) => {
      const result = mockFind(...args);
      return { sort: () => ({ lean: () => result }) };
    },
  },
}));

import { quickAnalyze, matchCondition, evaluateRouting } from '@/lib/multiAgentRouter';

describe('multiAgentRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('quickAnalyze detects intents, sentiment, and handoff requests', () => {
    const analysis1 = quickAnalyze('How much does your product cost?');
    expect(analysis1.intents).toContain('pricing_inquiry');
    expect(analysis1.sentiment).toBe('neutral');
    expect(analysis1.isHandoffRequest).toBe(false);

    const analysis2 = quickAnalyze('I want to speak to a human agent, this is terrible!');
    expect(analysis2.isHandoffRequest).toBe(true);
    expect(analysis2.sentiment).toBe('negative');
    expect(analysis2.intents).toContain('complaint');

    const analysis3 = quickAnalyze('Great service, I love it!');
    expect(analysis3.sentiment).toBe('positive');
  });

  it('matchCondition evaluates conditions correctly', () => {
    const analysis = quickAnalyze('I need help with my broken order');

    // Keyword condition
    expect(
      matchCondition(
        { type: 'keyword', value: 'broken', operator: 'contains' },
        analysis,
        'I need help with my broken order'
      )
    ).toBe(true);

    expect(
      matchCondition(
        { type: 'keyword', value: 'pricing', operator: 'contains' },
        analysis,
        'I need help with my broken order'
      )
    ).toBe(false);

    // Intent condition
    expect(
      matchCondition(
        { type: 'intent', value: 'support_request', operator: 'equals' },
        analysis,
        'I need help with my broken order'
      )
    ).toBe(true);

    // Sentiment condition
    expect(
      matchCondition(
        { type: 'sentiment', value: 'neutral', operator: 'equals' },
        analysis,
        'I need help with my broken order'
      )
    ).toBe(true);
  });

  it('evaluateRouting returns correct routing decision', async () => {
    mockFind.mockReturnValueOnce([
      {
        _id: 'rule1',
        clientId: 'client1',
        name: 'Route complaints to support',
        priority: 10,
        fromPersonaId: '*',
        toPersonaId: 'support-persona',
        conditions: [
          { type: 'intent', value: 'complaint', operator: 'equals' },
          { type: 'sentiment', value: 'negative', operator: 'equals' },
        ],
        matchMode: 'any',
        isActive: true,
        handoffMessage: 'Let me connect you with our support team.',
      },
    ]);

    const decision = await evaluateRouting({
      clientId: 'client1',
      currentPersonaId: 'sales-persona',
      message: 'This is terrible, I am so disappointed!',
    });

    expect(decision.shouldRoute).toBe(true);
    expect(decision.targetPersonaId).toBe('support-persona');
    expect(decision.ruleName).toBe('Route complaints to support');
    expect(decision.confidence).toBeGreaterThan(0);
  });
});
