import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock @google/genai
const mockGenerateContent = vi.fn();
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => ({
    models: {
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    },
  })),
}));

import { getAvailableProviders, generateWithFallback, calculateProviderCost } from '@/lib/multiModelProvider';

describe('multiModelProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear env
    delete process.env.GEMINI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it('getAvailableProviders returns only configured providers', () => {
    expect(getAvailableProviders()).toEqual([]);

    process.env.GEMINI_API_KEY = 'test-gemini-key';
    expect(getAvailableProviders()).toEqual(['gemini']);

    process.env.OPENAI_API_KEY = 'test-openai-key';
    expect(getAvailableProviders()).toEqual(['gemini', 'openai']);

    process.env.ANTHROPIC_API_KEY = 'test-claude-key';
    expect(getAvailableProviders()).toEqual(['gemini', 'claude', 'openai']);
  });

  it('calculateProviderCost returns correct cost', () => {
    process.env.GEMINI_API_KEY = 'key';
    const cost = calculateProviderCost('gemini', 1000, 500);
    // 1000 * 0.000000075 + 500 * 0.0000003 = 0.000075 + 0.00015 = 0.000225
    expect(cost).toBeCloseTo(0.000225, 6);
  });

  it('generateWithFallback falls back on provider failure', async () => {
    process.env.GEMINI_API_KEY = 'test-key';
    process.env.OPENAI_API_KEY = 'test-openai-key';

    // Make Gemini fail
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini rate limited'));

    // Make OpenAI succeed
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Hello from OpenAI' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      }),
    });

    const result = await generateWithFallback({
      prompt: 'Hello',
      systemPrompt: 'You are helpful.',
    });

    expect(result.provider).toBe('openai');
    expect(result.text).toBe('Hello from OpenAI');
    expect(result.inputTokens).toBe(10);
    expect(result.outputTokens).toBe(5);
  });
});
