import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock all external dependencies
vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/Conversation', () => {
  const mockConversation = {
    findOne: vi.fn(),
    create: vi.fn(),
  };
  return { default: mockConversation };
});
vi.mock('@/models/Contact', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('@/lib/events', () => ({
  emitEvent: vi.fn(),
}));

describe('Conversation Manager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create new conversation if none exists', async () => {
    const Conversation = (await import('@/models/Conversation')).default;
    const { emitEvent } = await import('@/lib/events');
    (Conversation.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (Conversation.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      conversationId: 'test-conv-1',
      contactId: 'contact-1',
      status: 'bot',
    });

    const { upsertConversation } = await import('@/lib/inbox/conversationManager');
    const result = await upsertConversation({
      clientId: 'client-1',
      sessionId: 'session-1',
      contactId: 'contact-1',
      channel: 'web',
      text: 'Hello',
      sender: 'visitor',
    });

    expect(Conversation.create).toHaveBeenCalled();
    expect(result).toBeDefined();
  });

  it('should update existing conversation', async () => {
    const Conversation = (await import('@/models/Conversation')).default;
    const mockConv = {
      conversationId: 'existing-conv',
      lastMessage: { text: '', sender: 'visitor', timestamp: new Date() },
      unreadCount: 0,
      save: vi.fn(),
    };
    (Conversation.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(mockConv);

    const { upsertConversation } = await import('@/lib/inbox/conversationManager');
    await upsertConversation({
      clientId: 'client-1',
      sessionId: 'session-1',
      contactId: 'contact-1',
      channel: 'web',
      text: 'New message',
      sender: 'visitor',
    });

    expect(mockConv.save).toHaveBeenCalled();
    expect(mockConv.lastMessage.text).toBe('New message');
  });
});
