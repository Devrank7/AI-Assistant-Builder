import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

describe('User', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: User } = await import('@/models/User');
    const doc = new User({ email: 'test@test.com', name: 'Test', stripeCustomerId: 'cus_123' });
    expect(doc.authProvider).toBe('email');
    expect(doc.emailVerified).toBe(false);
    expect(doc.plan).toBe('none');
    expect(doc.billingPeriod).toBe('monthly');
    expect(doc.subscriptionStatus).toBe('trial');
    expect(doc.trialEndsAt).toBeNull();
    expect(doc.stripeSubscriptionId).toBeNull();
    expect(doc.refreshTokens).toEqual([]);
    expect(doc.passwordResetToken).toBeNull();
    expect(doc.passwordResetExpires).toBeNull();
    expect(doc.emailVerificationToken).toBeNull();
    expect(doc.organizationId).toBeNull();
    expect(doc.onboardingCompleted).toBe(false);
    expect(doc.niche).toBeNull();
    expect(doc.referralCode).toBeNull();
    expect(doc.referredBy).toBeNull();
    expect(doc.emailSequencesSent).toEqual([]);
    expect(doc.passwordHash).toBeNull();
    expect(doc.googleId).toBeNull();
  });

  it('should require email, name, and stripeCustomerId', async () => {
    const { default: User } = await import('@/models/User');
    const doc = new User({});
    const err = doc.validateSync();
    expect(err?.errors.email).toBeDefined();
    expect(err?.errors.name).toBeDefined();
    expect(err?.errors.stripeCustomerId).toBeDefined();
  });

  it('should validate plan enum', async () => {
    const { default: User } = await import('@/models/User');
    const doc = new User({ email: 'test@test.com', name: 'Test', stripeCustomerId: 'cus_1', plan: 'ultimate' });
    const err = doc.validateSync();
    expect(err?.errors.plan).toBeDefined();
  });

  it('should validate authProvider enum', async () => {
    const { default: User } = await import('@/models/User');
    const doc = new User({ email: 'test@test.com', name: 'Test', stripeCustomerId: 'cus_1', authProvider: 'github' });
    const err = doc.validateSync();
    expect(err?.errors.authProvider).toBeDefined();
  });

  it('should validate billingPeriod enum', async () => {
    const { default: User } = await import('@/models/User');
    const doc = new User({ email: 'test@test.com', name: 'Test', stripeCustomerId: 'cus_1', billingPeriod: 'weekly' });
    const err = doc.validateSync();
    expect(err?.errors.billingPeriod).toBeDefined();
  });

  it('should validate subscriptionStatus enum', async () => {
    const { default: User } = await import('@/models/User');
    const doc = new User({
      email: 'test@test.com',
      name: 'Test',
      stripeCustomerId: 'cus_1',
      subscriptionStatus: 'suspended',
    });
    const err = doc.validateSync();
    expect(err?.errors.subscriptionStatus).toBeDefined();
  });
});

describe('Notification', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Notification } = await import('@/models/Notification');
    const doc = new Notification({ type: 'new_client', title: 'New Client', message: 'A new client joined' });
    expect(doc.isRead).toBe(false);
    expect(doc.userId).toBeNull();
  });

  it('should require type, title, and message', async () => {
    const { default: Notification } = await import('@/models/Notification');
    const doc = new Notification({});
    const err = doc.validateSync();
    expect(err?.errors.type).toBeDefined();
    expect(err?.errors.title).toBeDefined();
    expect(err?.errors.message).toBeDefined();
  });
});

describe('Referral', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Referral } = await import('@/models/Referral');
    const doc = new Referral({ referrerId: 'u1', refereeId: 'u2', code: 'ABC123' });
    expect(doc.rewardApplied).toBe(false);
    expect(doc.rewardType).toBe('none');
  });

  it('should require referrerId, refereeId, and code', async () => {
    const { default: Referral } = await import('@/models/Referral');
    const doc = new Referral({});
    const err = doc.validateSync();
    expect(err?.errors.referrerId).toBeDefined();
    expect(err?.errors.refereeId).toBeDefined();
    expect(err?.errors.code).toBeDefined();
  });

  it('should validate rewardType enum', async () => {
    const { default: Referral } = await import('@/models/Referral');
    const doc = new Referral({ referrerId: 'u1', refereeId: 'u2', code: 'ABC', rewardType: 'cash' });
    const err = doc.validateSync();
    expect(err?.errors.rewardType).toBeDefined();
  });
});

describe('InboxMessage (InboxThread)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: InboxThread } = await import('@/models/InboxMessage');
    const doc = new InboxThread({ clientId: 'cl1', sessionId: 's1', channel: 'website' });
    expect(doc.status).toBe('open');
    expect(doc.priority).toBe('normal');
    expect(doc.lastMessage).toBe('');
    expect(doc.lastMessageRole).toBe('user');
    expect(doc.messageCount).toBe(0);
    expect(doc.unreadCount).toBe(0);
    expect(doc.lastMessageAt).toBeInstanceOf(Date);
  });

  it('should require clientId, sessionId, and channel', async () => {
    const { default: InboxThread } = await import('@/models/InboxMessage');
    const doc = new InboxThread({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.sessionId).toBeDefined();
    expect(err?.errors.channel).toBeDefined();
  });

  it('should validate channel enum', async () => {
    const { default: InboxThread } = await import('@/models/InboxMessage');
    const doc = new InboxThread({ clientId: 'cl1', sessionId: 's1', channel: 'sms' });
    const err = doc.validateSync();
    expect(err?.errors.channel).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: InboxThread } = await import('@/models/InboxMessage');
    const doc = new InboxThread({ clientId: 'cl1', sessionId: 's1', channel: 'website', status: 'archived' });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });

  it('should validate priority enum', async () => {
    const { default: InboxThread } = await import('@/models/InboxMessage');
    const doc = new InboxThread({ clientId: 'cl1', sessionId: 's1', channel: 'website', priority: 'critical' });
    const err = doc.validateSync();
    expect(err?.errors.priority).toBeDefined();
  });

  it('should validate lastMessageRole enum', async () => {
    const { default: InboxThread } = await import('@/models/InboxMessage');
    const doc = new InboxThread({ clientId: 'cl1', sessionId: 's1', channel: 'website', lastMessageRole: 'system' });
    const err = doc.validateSync();
    expect(err?.errors.lastMessageRole).toBeDefined();
  });
});

describe('Handoff', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Handoff } = await import('@/models/Handoff');
    const doc = new Handoff({ clientId: 'cl1', sessionId: 's1', channel: 'website' });
    expect(doc.status).toBe('pending');
    expect(doc.requestedAt).toBeInstanceOf(Date);
  });

  it('should require clientId, sessionId, and channel', async () => {
    const { default: Handoff } = await import('@/models/Handoff');
    const doc = new Handoff({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.sessionId).toBeDefined();
    expect(err?.errors.channel).toBeDefined();
  });

  it('should validate channel enum', async () => {
    const { default: Handoff } = await import('@/models/Handoff');
    const doc = new Handoff({ clientId: 'cl1', sessionId: 's1', channel: 'sms' });
    const err = doc.validateSync();
    expect(err?.errors.channel).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: Handoff } = await import('@/models/Handoff');
    const doc = new Handoff({ clientId: 'cl1', sessionId: 's1', channel: 'website', status: 'closed' });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});
