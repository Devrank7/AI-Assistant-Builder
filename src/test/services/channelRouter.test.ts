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
vi.mock('@/lib/builder/webFetch', () => ({
  webFetch: vi.fn().mockResolvedValue({ content: '' }),
}));
vi.mock('@/lib/builder/webSearch', () => ({
  webSearch: vi.fn().mockResolvedValue([]),
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

// ─── buildContext + fetchWebFallback tests ──────────────────────────
describe('buildContext - web fetch fallback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns only RAG context when chunks have high similarity', async () => {
    const KnowledgeChunk = (await import('@/models/KnowledgeChunk')).default;
    (KnowledgeChunk.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ text: 'We are open 9-5', embedding: [0.1, 0.2] }]),
    });
    const { findSimilarChunks } = await import('@/lib/gemini');
    (findSimilarChunks as any).mockResolvedValue([{ text: 'We are open 9-5', similarity: 0.85 }]);

    const { webFetch } = await import('@/lib/builder/webFetch');
    const { webSearch } = await import('@/lib/builder/webSearch');

    const { buildContext } = await import('@/lib/channelRouter');
    const ctx = await buildContext('client1', 'What are your hours?', 3);

    expect(ctx).toContain('We are open 9-5');
    expect(ctx).not.toContain('[WEB CONTEXT');
    // Should NOT call web fallback when similarity is high
    expect(webFetch).not.toHaveBeenCalled();
    expect(webSearch).not.toHaveBeenCalled();
  });

  it('triggers web fallback when no knowledge chunks exist', async () => {
    const KnowledgeChunk = (await import('@/models/KnowledgeChunk')).default;
    (KnowledgeChunk.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'client1', website: 'https://example.com' }),
      }),
    });
    const { webFetch } = await import('@/lib/builder/webFetch');
    (webFetch as any).mockResolvedValue({
      content:
        'Welcome to Example Corp. We provide enterprise solutions for businesses worldwide. Contact us at info@example.com.',
    });

    const { buildContext } = await import('@/lib/channelRouter');
    const ctx = await buildContext('client1', 'What does this company do?', 3);

    expect(ctx).toContain('[WEB CONTEXT - from client website]');
    expect(ctx).toContain('Welcome to Example Corp');
    expect(webFetch).toHaveBeenCalledWith('https://example.com');
  });

  it('triggers web fallback when similarity is below 0.4', async () => {
    const KnowledgeChunk = (await import('@/models/KnowledgeChunk')).default;
    (KnowledgeChunk.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ text: 'Random unrelated chunk', embedding: [0.1, 0.2] }]),
    });
    const { findSimilarChunks } = await import('@/lib/gemini');
    (findSimilarChunks as any).mockResolvedValue([{ text: 'Random unrelated chunk', similarity: 0.32 }]);
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'client1', website: 'https://example.com' }),
      }),
    });
    const { webFetch } = await import('@/lib/builder/webFetch');
    (webFetch as any).mockResolvedValue({
      content: 'This is the homepage of Example Corp with lots of relevant content about their products and services.',
    });

    const { buildContext } = await import('@/lib/channelRouter');
    const ctx = await buildContext('client1', 'What is your refund policy?', 3);

    // Should have both RAG context AND web fallback
    expect(ctx).toContain('Random unrelated chunk');
    expect(ctx).toContain('[WEB CONTEXT - from client website]');
  });

  it('falls back to web search when client has no website', async () => {
    const KnowledgeChunk = (await import('@/models/KnowledgeChunk')).default;
    (KnowledgeChunk.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'client1' }),
      }),
    });
    const { webSearch } = await import('@/lib/builder/webSearch');
    (webSearch as any).mockResolvedValue([
      {
        title: 'Refund Policy Guide',
        url: 'https://guide.com/refund',
        description: 'How refund policies work in e-commerce',
      },
    ]);
    const { webFetch } = await import('@/lib/builder/webFetch');
    (webFetch as any).mockResolvedValue({
      content:
        'A comprehensive guide to refund policies. Most businesses offer 30-day refund windows. This is very important.',
    });

    const { buildContext } = await import('@/lib/channelRouter');
    const ctx = await buildContext('client1', 'What is your refund policy?', 3);

    expect(ctx).toContain('[WEB CONTEXT - from web search]');
    expect(ctx).toContain('Refund Policy Guide');
    expect(ctx).toContain('comprehensive guide');
    expect(webSearch).toHaveBeenCalledWith('What is your refund policy?', 3);
  });

  it('uses search descriptions when web fetch of search result fails', async () => {
    const KnowledgeChunk = (await import('@/models/KnowledgeChunk')).default;
    (KnowledgeChunk.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'client1' }),
      }),
    });
    const { webSearch } = await import('@/lib/builder/webSearch');
    (webSearch as any).mockResolvedValue([
      {
        title: 'Best Practices',
        url: 'https://bp.com',
        description: 'A thorough guide to best practices in business operations and management',
      },
    ]);
    const { webFetch } = await import('@/lib/builder/webFetch');
    (webFetch as any).mockResolvedValue({ error: 'HTTP 403' });

    const { buildContext } = await import('@/lib/channelRouter');
    const ctx = await buildContext('client1', 'best practices', 3);

    expect(ctx).toContain('[WEB CONTEXT - search summaries]');
    expect(ctx).toContain('Best Practices');
    expect(ctx).toContain('thorough guide');
  });

  it('returns empty when web fallback also fails completely', async () => {
    const KnowledgeChunk = (await import('@/models/KnowledgeChunk')).default;
    (KnowledgeChunk.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'client1' }),
      }),
    });
    const { webSearch } = await import('@/lib/builder/webSearch');
    (webSearch as any).mockResolvedValue([]);

    const { buildContext } = await import('@/lib/channelRouter');
    const ctx = await buildContext('client1', 'something obscure', 3);

    expect(ctx).toBe('');
  });

  it('includes corrections even when web fallback is used', async () => {
    const KnowledgeChunk = (await import('@/models/KnowledgeChunk')).default;
    (KnowledgeChunk.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });
    const Correction = (await import('@/models/Correction')).default;
    (Correction.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ userQuestion: 'What time?', correctedAnswer: 'We open at 8am' }]),
      }),
    });
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'client1', website: 'https://example.com' }),
      }),
    });
    const { webFetch } = await import('@/lib/builder/webFetch');
    (webFetch as any).mockResolvedValue({
      content:
        'Extra info from the website that supplements the knowledge base with additional details about operating hours.',
    });

    const { buildContext } = await import('@/lib/channelRouter');
    const ctx = await buildContext('client1', 'What time do you open?', 3);

    // Corrections should appear first
    expect(ctx.indexOf('[CORRECTION 1]')).toBeLessThan(ctx.indexOf('[WEB CONTEXT'));
    expect(ctx).toContain('We open at 8am');
    expect(ctx).toContain('[WEB CONTEXT - from client website]');
  });

  it('never breaks chat even if fetchWebFallback throws', async () => {
    const KnowledgeChunk = (await import('@/models/KnowledgeChunk')).default;
    (KnowledgeChunk.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });
    const Correction = (await import('@/models/Correction')).default;
    (Correction.find as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      }),
    });

    const { buildContext } = await import('@/lib/channelRouter');
    // Should NOT throw — web fallback is best-effort
    const ctx = await buildContext('client1', 'anything', 3);
    expect(ctx).toBe('');
  });
});

// ─── fetchWebFallback direct tests ──────────────────────────────────
describe('fetchWebFallback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fetches client website when available', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'c1', website: 'https://mysite.com' }),
      }),
    });
    const { webFetch } = await import('@/lib/builder/webFetch');
    (webFetch as any).mockResolvedValue({
      content: 'Welcome to MySite. We sell premium gadgets and tech accessories to customers worldwide.',
    });

    const { fetchWebFallback } = await import('@/lib/channelRouter');
    const result = await fetchWebFallback('c1', 'what do you sell?');

    expect(result).toContain('[WEB CONTEXT - from client website]');
    expect(result).toContain('premium gadgets');
    expect(webFetch).toHaveBeenCalledWith('https://mysite.com');
  });

  it('falls through to web search when website fetch returns too little content', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'c1', website: 'https://mysite.com' }),
      }),
    });
    const { webFetch } = await import('@/lib/builder/webFetch');
    // First call (website) returns too little, second call (search result) returns good content
    (webFetch as any)
      .mockResolvedValueOnce({ content: 'Short' })
      .mockResolvedValueOnce({
        content:
          'A detailed page about product offerings and pricing with plenty of useful information for the customer.',
      });
    const { webSearch } = await import('@/lib/builder/webSearch');
    (webSearch as any).mockResolvedValue([
      { title: 'MySite Products', url: 'https://mysite.com/products', description: 'Full product listing' },
    ]);

    const { fetchWebFallback } = await import('@/lib/channelRouter');
    const result = await fetchWebFallback('c1', 'products');

    expect(result).toContain('[WEB CONTEXT - from web search]');
    expect(webFetch).toHaveBeenCalledTimes(2);
  });

  it('returns empty string when everything fails gracefully', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    });
    const { webSearch } = await import('@/lib/builder/webSearch');
    (webSearch as any).mockResolvedValue([{ title: 'No search API configured', url: '', description: 'unavailable' }]);

    const { fetchWebFallback } = await import('@/lib/channelRouter');
    const result = await fetchWebFallback('c1', 'anything');

    expect(result).toBe('');
  });

  it('filters out "No search API configured" results', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'c1' }),
      }),
    });
    const { webSearch } = await import('@/lib/builder/webSearch');
    (webSearch as any).mockResolvedValue([
      { title: 'No search API configured', url: '', description: 'Web search unavailable' },
    ]);

    const { fetchWebFallback } = await import('@/lib/channelRouter');
    const result = await fetchWebFallback('c1', 'test');

    expect(result).toBe('');
  });
});
