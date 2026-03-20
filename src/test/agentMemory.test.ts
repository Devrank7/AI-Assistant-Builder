import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockFindOne = vi.fn();
const mockCreate = vi.fn();

vi.mock('@/models/AgentMemory', () => ({
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

import { loadAgentMemory, saveAgentMemory } from '@/lib/agentMemory';

describe('agentMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loadAgentMemory returns empty string when no memory exists', async () => {
    mockFindOne.mockReturnValueOnce({ lean: () => null });

    const result = await loadAgentMemory('client1', 'visitor1', 'default');
    expect(result).toBe('');
  });

  it('loadAgentMemory returns context when memory exists', async () => {
    mockFindOne.mockReturnValueOnce({
      lean: () => ({
        facts: [
          { key: 'name', value: 'John', confidence: 0.9, extractedAt: new Date() },
          { key: 'email', value: 'john@test.com', confidence: 0.95, extractedAt: new Date() },
        ],
        conversationSummary: 'Visitor asked about pricing.',
        interactionCount: 3,
      }),
    });

    const result = await loadAgentMemory('client1', 'visitor1', 'default');
    expect(result).toContain('name: John');
    expect(result).toContain('email: john@test.com');
    expect(result).toContain('Visitor asked about pricing');
    expect(result).toContain('interaction #3');
  });

  it('saveAgentMemory creates new memory with extracted facts', async () => {
    mockFindOne.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({});

    const messages = [
      { role: 'user', content: 'Hi, my name is Alice and my email is alice@example.com' },
      { role: 'assistant', content: 'Hello Alice! How can I help you?' },
      { role: 'user', content: "I'm looking at your pricing plans" },
    ];

    await saveAgentMemory('client1', 'visitor1', 'default', 'session1', messages);

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const createArg = mockCreate.mock.calls[0][0];
    expect(createArg.clientId).toBe('client1');
    expect(createArg.visitorId).toBe('visitor1');
    expect(createArg.interactionCount).toBe(1);

    // Should have extracted name and email facts
    const factKeys = createArg.facts.map((f: { key: string }) => f.key);
    expect(factKeys).toContain('name');
    expect(factKeys).toContain('email');
  });
});
