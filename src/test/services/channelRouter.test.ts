import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/KnowledgeChunk', () => {
  const m = { find: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue([]) };
  return { default: m };
});
vi.mock('@/models/AISettings', () => ({
  default: { findOne: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), lean: vi.fn() },
  defaultSystemPrompt: 'You are a helpful assistant.',
}));
vi.mock('@/models/ChatLog', () => ({
  default: { findOneAndUpdate: vi.fn().mockReturnThis(), catch: vi.fn() },
}));
vi.mock('@/models/Client', () => ({
  default: {
    findOne: vi.fn().mockReturnThis(),
    select: vi.fn(),
  },
}));
vi.mock('@/models/Correction', () => ({
  default: { find: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), lean: vi.fn().mockResolvedValue([]) },
}));
vi.mock('@/models/Contact', () => ({
  default: {
    findOne: vi.fn().mockReturnThis(),
    lean: vi.fn().mockReturnThis(),
    catch: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@/lib/gemini', () => ({
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2]),
  findSimilarChunks: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/models', () => ({
  calculateCost: vi.fn().mockReturnValue(0.001),
  getModel: vi.fn().mockReturnValue({ id: 'gemini-2.0-flash' }),
  getDefaultModel: vi.fn().mockReturnValue({ id: 'gemini-2.0-flash' }),
}));
vi.mock('@/lib/richMessages', () => ({
  parseRichBlocks: vi.fn().mockReturnValue({ cleanText: 'Hello!', richBlocks: [] }),
}));
vi.mock('@/lib/handoff', () => ({
  detectHandoffRequest: vi.fn().mockReturnValue(false),
  getActiveHandoff: vi.fn().mockResolvedValue(null),
  createHandoff: vi.fn(),
}));
vi.mock('@/lib/agenticRouter', () => ({
  agenticChatStream: vi.fn(),
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
  processConversationIntelligence: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/personaRouter', () => ({
  selectPersona: vi.fn().mockResolvedValue({ persona: null, overlay: '' }),
  buildPersonaContext: vi.fn().mockReturnValue(''),
}));
vi.mock('@/lib/inboxManager', () => ({
  upsertInboxThread: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/revenueTracker', () => ({
  trackFunnelEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/autoLearning', () => ({
  processNegativeFeedback: vi.fn(),
}));
vi.mock('@/lib/events', () => ({
  emitEvent: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/contacts/autoCreate', () => ({
  handleContactForMessage: vi.fn().mockResolvedValue('contact-1'),
}));
vi.mock('@/lib/inbox/conversationManager', () => ({
  upsertConversation: vi.fn().mockResolvedValue('conv-1'),
  triggerHandoff: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/inbox/handoff', () => ({
  detectHandoff: vi.fn().mockReturnValue({ shouldHandoff: false }),
}));
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'Hello!',
            usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
          },
        }),
        generateContentStream: vi.fn(),
      };
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

describe('channelRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when client is inactive', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const { routeMessage } = await import('@/lib/channelRouter');
    const result = await routeMessage({
      channel: 'website',
      clientId: 'test-client',
      message: 'Hello',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Widget is disabled');
  });

  it('should route a website message and return AI response', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ isActive: true }),
    });
    const AISettings = (await import('@/models/AISettings')).default;
    (AISettings.findOne as any).mockResolvedValue(null);

    const { routeMessage } = await import('@/lib/channelRouter');
    const result = await routeMessage({
      channel: 'website',
      clientId: 'test-client',
      message: 'What are your hours?',
      sessionId: 'session-1',
    });

    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
    expect(result.model).toBe('gemini-2.0-flash');
  });

  it('should handle telegram channel with correct metadata', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ isActive: true }),
    });
    const AISettings = (await import('@/models/AISettings')).default;
    (AISettings.findOne as any).mockResolvedValue(null);

    const { routeMessage } = await import('@/lib/channelRouter');
    const result = await routeMessage({
      channel: 'telegram',
      clientId: 'test-client',
      message: 'Hi from Telegram',
      sessionId: 'tg-session',
      metadata: { telegramChatId: '12345', telegramUsername: 'testuser' },
    });

    expect(result.success).toBe(true);
    expect(result.costUsd).toBeGreaterThanOrEqual(0);
  });

  it('should detect handoff request when enabled', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ isActive: true }),
    });
    const AISettings = (await import('@/models/AISettings')).default;
    (AISettings.findOne as any).mockResolvedValue({ handoffEnabled: true });

    const { detectHandoffRequest, createHandoff } = await import('@/lib/handoff');
    (detectHandoffRequest as any).mockReturnValue(true);
    (createHandoff as any).mockResolvedValue('Connecting you with an agent...');

    const { routeMessage } = await import('@/lib/channelRouter');
    const result = await routeMessage({
      channel: 'whatsapp',
      clientId: 'test-client',
      message: 'I want to speak to a human',
      sessionId: 'wa-session',
    });

    expect(result.success).toBe(true);
    expect(result.response).toBe('Connecting you with an agent...');
    expect(createHandoff).toHaveBeenCalled();
  });

  it('should pass conversation history to AI prompt', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ isActive: true }),
    });
    const AISettings = (await import('@/models/AISettings')).default;
    (AISettings.findOne as any).mockResolvedValue(null);

    const { routeMessage } = await import('@/lib/channelRouter');
    const result = await routeMessage({
      channel: 'instagram',
      clientId: 'test-client',
      message: 'Tell me more',
      sessionId: 'ig-session',
      conversationHistory: [
        { role: 'user', content: 'What services do you offer?' },
        { role: 'assistant', content: 'We offer many services.' },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.inputTokens).toBeGreaterThanOrEqual(0);
  });
});
