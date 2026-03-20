// src/test/aiQuality.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockConversationCountDocuments = vi.fn();
const mockConversationFind = vi.fn();
const mockChatLogAggregate = vi.fn();

vi.mock('@/models/Conversation', () => ({
  default: {
    countDocuments: (...args: unknown[]) => mockConversationCountDocuments(...args),
    find: (...args: unknown[]) => mockConversationFind(...args),
  },
}));

vi.mock('@/models/ChatLog', () => ({
  default: {
    aggregate: (...args: unknown[]) => mockChatLogAggregate(...args),
  },
}));

describe('aiQuality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calculates resolution rate correctly', async () => {
    mockConversationCountDocuments
      .mockResolvedValueOnce(100) // total conversations
      .mockResolvedValueOnce(15); // handoff conversations
    const { getResolutionRate } = await import('@/lib/analytics/aiQuality');
    const rate = await getResolutionRate('client1', 30);
    expect(rate).toBe(85);
  });

  it('returns 100% resolution when no conversations', async () => {
    mockConversationCountDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const { getResolutionRate } = await import('@/lib/analytics/aiQuality');
    const rate = await getResolutionRate('client1', 30);
    expect(rate).toBe(100);
  });

  it('getKnowledgeGaps returns unanswered questions', async () => {
    mockChatLogAggregate.mockResolvedValue([
      { _id: 'What are your hours?', count: 5 },
      { _id: 'Do you offer refunds?', count: 3 },
    ]);
    const { getKnowledgeGaps } = await import('@/lib/analytics/aiQuality');
    const gaps = await getKnowledgeGaps('client1', 30);
    expect(gaps).toHaveLength(2);
    expect(gaps[0].question).toBe('What are your hours?');
    expect(gaps[0].count).toBe(5);
  });
});
