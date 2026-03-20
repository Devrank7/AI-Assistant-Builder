import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock channelRouter
const mockRouteMessage = vi.fn();
vi.mock('@/lib/channelRouter', () => ({
  routeMessage: (...args: unknown[]) => mockRouteMessage(...args),
}));

import { processVoiceMessage } from '@/lib/voiceAgent';

describe('voiceAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error for empty transcript', async () => {
    const result = await processVoiceMessage({
      clientId: 'test-client',
      transcript: '',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Empty transcript');
    expect(mockRouteMessage).not.toHaveBeenCalled();
  });

  it('processes voice transcript and returns clean text + SSML', async () => {
    mockRouteMessage.mockResolvedValueOnce({
      success: true,
      response:
        'Hello! **Welcome** to our clinic. Visit https://example.com for more info.\n\n[SUGGESTIONS]q1|q2|q3[/SUGGESTIONS]',
      richBlocks: [],
      model: 'gemini-2.0-flash',
      inputTokens: 50,
      outputTokens: 30,
      costUsd: 0.001,
    });

    const result = await processVoiceMessage({
      clientId: 'test-client',
      transcript: 'Hello, I need help',
      sessionId: 'voice-session-1',
    });

    expect(result.success).toBe(true);
    // Should clean markdown and URLs
    expect(result.text).not.toContain('**');
    expect(result.text).not.toContain('https://');
    expect(result.text).not.toContain('[SUGGESTIONS]');
    expect(result.text).toContain('Welcome');
    // Should generate SSML
    expect(result.ssml).toContain('<speak');
    expect(result.ssml).toContain('</speak>');
    expect(result.inputTokens).toBe(50);
    expect(result.outputTokens).toBe(30);
  });
});
