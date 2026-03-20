import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/Client', () => ({
  default: {
    findOne: vi.fn().mockReturnThis(),
    select: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));
vi.mock('@/models/AISettings', () => ({
  default: { findOne: vi.fn() },
  defaultSystemPrompt: 'You are a helpful assistant.',
}));
vi.mock('@/models/ChatLog', () => ({
  default: { findOneAndUpdate: vi.fn().mockResolvedValue({}) },
}));
vi.mock('@/models/KnowledgeChunk', () => ({
  default: { find: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/models/Correction', () => ({
  default: { find: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/lib/gemini', () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1]),
  findSimilarChunks: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/models', () => ({
  getModel: vi.fn().mockReturnValue({ id: 'gemini-2.0-flash' }),
  getDefaultModel: vi.fn().mockReturnValue({ id: 'gemini-2.0-flash' }),
  calculateCost: vi.fn().mockReturnValue(0.002),
}));
vi.mock('@/lib/richMessages', () => ({
  parseRichBlocks: vi.fn().mockReturnValue({ cleanText: 'Response', richBlocks: [] }),
}));
vi.mock('@/lib/handoff', () => ({
  detectHandoffRequest: vi.fn().mockReturnValue(false),
  getActiveHandoff: vi.fn().mockResolvedValue(null),
  createHandoff: vi.fn(),
}));
vi.mock('@/lib/widgetTools', () => ({
  loadWidgetTools: vi.fn().mockResolvedValue({
    declarations: [],
    executors: new Map(),
  }),
}));
vi.mock('@/lib/customerMemory', () => ({
  getOrCreateProfile: vi.fn(),
  buildCustomerContext: vi.fn().mockResolvedValue(''),
  processConversation: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/emotionAI', () => ({
  analyzeConversationSentiment: vi.fn().mockReturnValue({ sentiment: 'neutral', score: 0, needsEscalation: false }),
  buildEmotionContext: vi.fn().mockReturnValue(''),
  updateProfileSentiment: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/conversationIntelligence', () => ({
  processConversationIntelligence: vi.fn(),
}));
vi.mock('@/lib/personaRouter', () => ({
  selectPersona: vi.fn().mockResolvedValue({ persona: null, overlay: '' }),
}));
vi.mock('@/lib/inboxManager', () => ({
  upsertInboxThread: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/revenueTracker', () => ({
  trackFunnelEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    chats = {
      create: vi.fn().mockReturnValue({
        sendMessage: vi.fn().mockResolvedValue({
          text: 'AI response text',
          usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 10 },
          functionCalls: [],
        }),
      }),
    };
  }
  return { GoogleGenAI: MockGoogleGenAI, Type: {} };
});

describe('agenticRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when client is inactive', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const { agenticChatStream } = await import('@/lib/agenticRouter');
    const result = await agenticChatStream({
      channel: 'website',
      clientId: 'test-client',
      message: 'Hello',
    });

    expect(result.error).toBe('Widget is disabled');
    expect(result.status).toBe(403);
  });

  it('should return a readable stream for active client', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ isActive: true, userId: 'user-1' }),
    });
    const AISettings = (await import('@/models/AISettings')).default;
    (AISettings.findOne as any).mockResolvedValue(null);

    const { agenticChatStream } = await import('@/lib/agenticRouter');
    const result = await agenticChatStream({
      channel: 'website',
      clientId: 'test-client',
      message: 'Book an appointment',
      sessionId: 'sess-1',
    });

    expect(result.stream).toBeDefined();
    expect(result.stream).toBeInstanceOf(ReadableStream);
    expect(result.error).toBeUndefined();
  });

  it('should handle handoff when enabled and active', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ isActive: true, userId: 'user-1' }),
    });
    const AISettings = (await import('@/models/AISettings')).default;
    (AISettings.findOne as any).mockResolvedValue({ handoffEnabled: true });

    const { getActiveHandoff } = await import('@/lib/handoff');
    (getActiveHandoff as any).mockResolvedValue({ message: 'Agent is connected.' });

    const { agenticChatStream } = await import('@/lib/agenticRouter');
    const result = await agenticChatStream({
      channel: 'website',
      clientId: 'test-client',
      message: 'Hello',
      sessionId: 'sess-1',
    });

    expect(result.stream).toBeInstanceOf(ReadableStream);
  });

  it('should load widget tools for agentic mode', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ isActive: true, userId: 'user-1' }),
    });
    const AISettings = (await import('@/models/AISettings')).default;
    (AISettings.findOne as any).mockResolvedValue({ actionsEnabled: true });

    const { loadWidgetTools } = await import('@/lib/widgetTools');

    const { agenticChatStream } = await import('@/lib/agenticRouter');
    await agenticChatStream({
      channel: 'website',
      clientId: 'test-client',
      message: 'I want to book',
      sessionId: 'sess-2',
    });

    expect(loadWidgetTools).toHaveBeenCalledWith('test-client');
  });
});
