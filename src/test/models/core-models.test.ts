import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

describe('Contact', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Contact } = await import('@/models/Contact');
    const doc = new Contact({ contactId: 'c1', clientId: 'cl1', channel: 'web' });
    expect(doc.name).toBeNull();
    expect(doc.email).toBeNull();
    expect(doc.phone).toBeNull();
    expect(doc.leadScore).toBe(0);
    expect(doc.leadTemp).toBe('cold');
    expect(doc.totalConversations).toBe(1);
    expect(doc.totalMessages).toBe(0);
    expect(doc.tags).toEqual([]);
    expect(doc.scoreBreakdown).toEqual([]);
  });

  it('should require contactId, clientId, and channel', async () => {
    const { default: Contact } = await import('@/models/Contact');
    const doc = new Contact({});
    const err = doc.validateSync();
    expect(err?.errors.contactId).toBeDefined();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.channel).toBeDefined();
  });

  it('should validate leadTemp enum values', async () => {
    const { default: Contact } = await import('@/models/Contact');
    const doc = new Contact({ contactId: 'c1', clientId: 'cl1', channel: 'web', leadTemp: 'scorching' });
    const err = doc.validateSync();
    expect(err?.errors.leadTemp).toBeDefined();
  });

  it('should accept valid leadTemp enum values', async () => {
    const { default: Contact } = await import('@/models/Contact');
    for (const temp of ['cold', 'warm', 'hot']) {
      const doc = new Contact({ contactId: 'c1', clientId: 'cl1', channel: 'web', leadTemp: temp });
      const err = doc.validateSync();
      expect(err?.errors?.leadTemp).toBeUndefined();
    }
  });

  it('should set lastSeenAt and firstSeenAt defaults', async () => {
    const { default: Contact } = await import('@/models/Contact');
    const before = Date.now();
    const doc = new Contact({ contactId: 'c1', clientId: 'cl1', channel: 'web' });
    expect(doc.lastSeenAt).toBeInstanceOf(Date);
    expect(doc.firstSeenAt).toBeInstanceOf(Date);
    expect(doc.lastSeenAt.getTime()).toBeGreaterThanOrEqual(before);
  });
});

describe('Conversation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Conversation } = await import('@/models/Conversation');
    const doc = new Conversation({
      conversationId: 'cv1',
      clientId: 'cl1',
      contactId: 'co1',
      sessionId: 's1',
      channel: 'web',
    });
    expect(doc.status).toBe('bot');
    expect(doc.assignedTo).toBeNull();
    expect(doc.handoffReason).toBeNull();
    expect(doc.unreadCount).toBe(0);
    expect(doc.aiSuggestedReply).toBeNull();
  });

  it('should require conversationId, clientId, contactId, sessionId, channel', async () => {
    const { default: Conversation } = await import('@/models/Conversation');
    const doc = new Conversation({});
    const err = doc.validateSync();
    expect(err?.errors.conversationId).toBeDefined();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.contactId).toBeDefined();
    expect(err?.errors.sessionId).toBeDefined();
    expect(err?.errors.channel).toBeDefined();
  });

  it('should validate channel enum', async () => {
    const { default: Conversation } = await import('@/models/Conversation');
    const doc = new Conversation({
      conversationId: 'cv1',
      clientId: 'cl1',
      contactId: 'co1',
      sessionId: 's1',
      channel: 'sms',
    });
    const err = doc.validateSync();
    expect(err?.errors.channel).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: Conversation } = await import('@/models/Conversation');
    const doc = new Conversation({
      conversationId: 'cv1',
      clientId: 'cl1',
      contactId: 'co1',
      sessionId: 's1',
      channel: 'web',
      status: 'unknown',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });

  it('should validate handoffReason enum', async () => {
    const { default: Conversation } = await import('@/models/Conversation');
    const doc = new Conversation({
      conversationId: 'cv1',
      clientId: 'cl1',
      contactId: 'co1',
      sessionId: 's1',
      channel: 'web',
      handoffReason: 'bad_reason',
    });
    const err = doc.validateSync();
    expect(err?.errors.handoffReason).toBeDefined();
  });

  it('should set lastMessage defaults', async () => {
    const { default: Conversation } = await import('@/models/Conversation');
    const doc = new Conversation({
      conversationId: 'cv1',
      clientId: 'cl1',
      contactId: 'co1',
      sessionId: 's1',
      channel: 'web',
    });
    expect(doc.lastMessage?.text).toBe('');
    expect(doc.lastMessage?.sender).toBe('visitor');
  });
});

describe('ChatLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should require clientId and sessionId', async () => {
    const { default: ChatLog } = await import('@/models/ChatLog');
    const doc = new ChatLog({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.sessionId).toBeDefined();
  });

  it('should default variantId to null and metadata.channel to website', async () => {
    const { default: ChatLog } = await import('@/models/ChatLog');
    const doc = new ChatLog({ clientId: 'cl1', sessionId: 's1' });
    expect(doc.variantId).toBeNull();
    expect(doc.metadata?.channel).toBe('website');
  });

  it('should validate metadata.channel enum', async () => {
    const { default: ChatLog } = await import('@/models/ChatLog');
    const doc = new ChatLog({ clientId: 'cl1', sessionId: 's1', metadata: { channel: 'sms' } });
    const err = doc.validateSync();
    expect(err?.errors['metadata.channel']).toBeDefined();
  });
});

describe('Client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Client } = await import('@/models/Client');
    const doc = new Client({ clientId: 'cl1', username: 'test', website: 'https://test.com', folderPath: '/tmp' });
    expect(doc.clientType).toBe('full');
    expect(doc.widgetType).toBe('ai_chat');
    expect(doc.requests).toBe(0);
    expect(doc.tokens).toBe(0);
    expect(doc.costUsd).toBe(0);
    expect(doc.monthlyTokensInput).toBe(0);
    expect(doc.monthlyTokensOutput).toBe(0);
    expect(doc.monthlyCostUsd).toBe(0);
    expect(doc.isActive).toBe(true);
    expect(doc.subscriptionStatus).toBe('pending');
    expect(doc.paymentMethod).toBeNull();
    expect(doc.paymentFailedCount).toBe(0);
    expect(doc.prepaidMonths).toBe(1);
    expect(doc.subscriptionTier).toBe('monthly');
    expect(doc.extraCreditsUsd).toBe(0);
    expect(doc.emailNotifications).toBe(true);
    expect(doc.costWarningNotified).toBe(false);
    expect(doc.clientToken).toBe('');
    expect(doc.email).toBe('');
  });

  it('should require clientId, username, website, folderPath', async () => {
    const { default: Client } = await import('@/models/Client');
    const doc = new Client({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.username).toBeDefined();
    expect(err?.errors.website).toBeDefined();
    expect(err?.errors.folderPath).toBeDefined();
  });

  it('should validate subscriptionStatus enum', async () => {
    const { default: Client } = await import('@/models/Client');
    const doc = new Client({
      clientId: 'cl1',
      username: 'test',
      website: 'https://test.com',
      folderPath: '/tmp',
      subscriptionStatus: 'invalid',
    });
    const err = doc.validateSync();
    expect(err?.errors.subscriptionStatus).toBeDefined();
  });

  it('should validate clientType enum', async () => {
    const { default: Client } = await import('@/models/Client');
    const doc = new Client({
      clientId: 'cl1',
      username: 'test',
      website: 'https://test.com',
      folderPath: '/tmp',
      clientType: 'invalid',
    });
    const err = doc.validateSync();
    expect(err?.errors.clientType).toBeDefined();
  });

  it('should validate widgetType enum', async () => {
    const { default: Client } = await import('@/models/Client');
    const doc = new Client({
      clientId: 'cl1',
      username: 'test',
      website: 'https://test.com',
      folderPath: '/tmp',
      widgetType: 'invalid',
    });
    const err = doc.validateSync();
    expect(err?.errors.widgetType).toBeDefined();
  });

  it('should validate subscriptionTier enum', async () => {
    const { default: Client } = await import('@/models/Client');
    const doc = new Client({
      clientId: 'cl1',
      username: 'test',
      website: 'https://test.com',
      folderPath: '/tmp',
      subscriptionTier: 'weekly',
    });
    const err = doc.validateSync();
    expect(err?.errors.subscriptionTier).toBeDefined();
  });
});

describe('Feedback', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should require clientId, sessionId, messageIndex, and rating', async () => {
    const { default: Feedback } = await import('@/models/Feedback');
    const doc = new Feedback({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.sessionId).toBeDefined();
    expect(err?.errors.messageIndex).toBeDefined();
    expect(err?.errors.rating).toBeDefined();
  });

  it('should validate rating enum', async () => {
    const { default: Feedback } = await import('@/models/Feedback');
    const doc = new Feedback({ clientId: 'cl1', sessionId: 's1', messageIndex: 0, rating: 'neutral' });
    const err = doc.validateSync();
    expect(err?.errors.rating).toBeDefined();
  });

  it('should accept valid rating values', async () => {
    const { default: Feedback } = await import('@/models/Feedback');
    for (const rating of ['up', 'down']) {
      const doc = new Feedback({ clientId: 'cl1', sessionId: 's1', messageIndex: 0, rating });
      const err = doc.validateSync();
      expect(err).toBeUndefined();
    }
  });
});
