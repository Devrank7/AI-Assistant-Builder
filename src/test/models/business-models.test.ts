import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

describe('ApiKey', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: ApiKey } = await import('@/models/ApiKey');
    const doc = new ApiKey({
      keyHash: 'hash1',
      keyPrefix: 'wbx_',
      name: 'My Key',
      userId: 'u1',
      organizationId: 'org1',
    });
    expect(doc.environment).toBe('live');
    expect(doc.scopes).toEqual(['read']);
    expect(doc.status).toBe('active');
    expect(doc.rateLimit).toBe(100);
    expect(doc.ipWhitelist).toEqual([]);
    expect(doc.expiresAt).toBeNull();
    expect(doc.lastUsedAt).toBeNull();
    expect(doc.totalRequests).toBe(0);
  });

  it('should require keyHash, keyPrefix, name, userId, organizationId', async () => {
    const { default: ApiKey } = await import('@/models/ApiKey');
    const doc = new ApiKey({});
    const err = doc.validateSync();
    expect(err?.errors.keyHash).toBeDefined();
    expect(err?.errors.keyPrefix).toBeDefined();
    expect(err?.errors.name).toBeDefined();
    expect(err?.errors.userId).toBeDefined();
    expect(err?.errors.organizationId).toBeDefined();
  });

  it('should validate environment enum', async () => {
    const { default: ApiKey } = await import('@/models/ApiKey');
    const doc = new ApiKey({
      keyHash: 'h',
      keyPrefix: 'p',
      name: 'n',
      userId: 'u',
      organizationId: 'o',
      environment: 'staging',
    });
    const err = doc.validateSync();
    expect(err?.errors.environment).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: ApiKey } = await import('@/models/ApiKey');
    const doc = new ApiKey({
      keyHash: 'h',
      keyPrefix: 'p',
      name: 'n',
      userId: 'u',
      organizationId: 'o',
      status: 'disabled',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('AuditLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: AuditLog } = await import('@/models/AuditLog');
    const doc = new AuditLog({ actor: 'admin', actorType: 'admin', action: 'client.create' });
    expect(doc.actor).toBe('admin');
    expect(doc.actorType).toBe('admin');
  });

  it('should require actor, actorType, and action', async () => {
    const { default: AuditLog } = await import('@/models/AuditLog');
    const doc = new AuditLog({});
    const err = doc.validateSync();
    expect(err?.errors.actor).toBeDefined();
    expect(err?.errors.actorType).toBeDefined();
    expect(err?.errors.action).toBeDefined();
  });

  it('should validate actorType enum', async () => {
    const { default: AuditLog } = await import('@/models/AuditLog');
    const doc = new AuditLog({ actor: 'admin', actorType: 'bot', action: 'client.create' });
    const err = doc.validateSync();
    expect(err?.errors.actorType).toBeDefined();
  });

  it('should accept all valid actorType values', async () => {
    const { default: AuditLog } = await import('@/models/AuditLog');
    for (const actorType of ['admin', 'client', 'system']) {
      const doc = new AuditLog({ actor: 'test', actorType, action: 'client.create' });
      const err = doc.validateSync();
      expect(err?.errors?.actorType).toBeUndefined();
    }
  });
});

describe('Webhook', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Webhook } = await import('@/models/Webhook');
    const doc = new Webhook({
      clientId: 'cl1',
      url: 'https://hook.test',
      events: ['new_chat'],
      secret: 'sec',
    });
    expect(doc.isActive).toBe(true);
    expect(doc.lastTriggered).toBeNull();
    expect(doc.failureCount).toBe(0);
  });

  it('should require clientId, url, events, and secret', async () => {
    const { default: Webhook } = await import('@/models/Webhook');
    const doc = new Webhook({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.url).toBeDefined();
    expect(err?.errors.secret).toBeDefined();
  });

  it('should validate that events array is not empty', async () => {
    const { default: Webhook } = await import('@/models/Webhook');
    const doc = new Webhook({ clientId: 'cl1', url: 'https://hook.test', events: [], secret: 'sec' });
    const err = doc.validateSync();
    expect(err?.errors.events).toBeDefined();
  });
});

describe('Integration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Integration } = await import('@/models/Integration');
    const doc = new Integration({ userId: 'u1', provider: 'hubspot' });
    expect(doc.isActive).toBe(true);
    expect(doc.status).toBe('connected');
    expect(doc.lastError).toBeNull();
    expect(doc.aiDiagnostic).toBeNull();
  });

  it('should require userId and provider', async () => {
    const { default: Integration } = await import('@/models/Integration');
    const doc = new Integration({});
    const err = doc.validateSync();
    expect(err?.errors.userId).toBeDefined();
    expect(err?.errors.provider).toBeDefined();
  });

  it('should validate provider enum', async () => {
    const { default: Integration } = await import('@/models/Integration');
    const doc = new Integration({ userId: 'u1', provider: 'slack' });
    const err = doc.validateSync();
    expect(err?.errors.provider).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: Integration } = await import('@/models/Integration');
    const doc = new Integration({ userId: 'u1', provider: 'hubspot', status: 'pending' });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('MarketplaceTemplate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: MarketplaceTemplate } = await import('@/models/MarketplaceTemplate');
    const doc = new MarketplaceTemplate({
      name: 'T1',
      slug: 't1',
      description: 'desc',
      shortDescription: 'short',
      niche: 'dental',
      authorId: 'a1',
      authorName: 'Author',
      tier: 'official',
      themeJson: {},
      configJson: {},
    });
    expect(doc.widgetType).toBe('ai_chat');
    expect(doc.status).toBe('draft');
    expect(doc.rating).toBe(0);
    expect(doc.reviewCount).toBe(0);
    expect(doc.installCount).toBe(0);
    expect(doc.knowledgeSample).toBe('');
    expect(doc.tags).toEqual([]);
    expect(doc.screenshots).toEqual([]);
    expect(doc.previewConfig?.primaryColor).toBe('#5bbad5');
    expect(doc.previewConfig?.isDark).toBe(true);
  });

  it('should require name, slug, description, shortDescription, niche, authorId, authorName, tier, themeJson, configJson', async () => {
    const { default: MarketplaceTemplate } = await import('@/models/MarketplaceTemplate');
    const doc = new MarketplaceTemplate({});
    const err = doc.validateSync();
    expect(err?.errors.name).toBeDefined();
    expect(err?.errors.slug).toBeDefined();
    expect(err?.errors.description).toBeDefined();
    expect(err?.errors.shortDescription).toBeDefined();
    expect(err?.errors.niche).toBeDefined();
    expect(err?.errors.authorId).toBeDefined();
    expect(err?.errors.authorName).toBeDefined();
    expect(err?.errors.tier).toBeDefined();
    expect(err?.errors.themeJson).toBeDefined();
    expect(err?.errors.configJson).toBeDefined();
  });

  it('should validate niche enum', async () => {
    const { default: MarketplaceTemplate } = await import('@/models/MarketplaceTemplate');
    const doc = new MarketplaceTemplate({
      name: 'T1',
      slug: 't1',
      description: 'desc',
      shortDescription: 'short',
      niche: 'plumbing',
      authorId: 'a1',
      authorName: 'A',
      tier: 'official',
      themeJson: {},
      configJson: {},
    });
    const err = doc.validateSync();
    expect(err?.errors.niche).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: MarketplaceTemplate } = await import('@/models/MarketplaceTemplate');
    const doc = new MarketplaceTemplate({
      name: 'T1',
      slug: 't1',
      description: 'desc',
      shortDescription: 'short',
      niche: 'dental',
      authorId: 'a1',
      authorName: 'A',
      tier: 'official',
      themeJson: {},
      configJson: {},
      status: 'active',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('MarketplaceReview', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should require templateId, userId, userName, and rating', async () => {
    const { default: MarketplaceReview } = await import('@/models/MarketplaceReview');
    const doc = new MarketplaceReview({});
    const err = doc.validateSync();
    expect(err?.errors.templateId).toBeDefined();
    expect(err?.errors.userId).toBeDefined();
    expect(err?.errors.userName).toBeDefined();
    expect(err?.errors.rating).toBeDefined();
  });

  it('should default comment to empty string', async () => {
    const { default: MarketplaceReview } = await import('@/models/MarketplaceReview');
    const doc = new MarketplaceReview({ templateId: 't1', userId: 'u1', userName: 'User', rating: 4 });
    expect(doc.comment).toBe('');
  });

  it('should validate rating min/max', async () => {
    const { default: MarketplaceReview } = await import('@/models/MarketplaceReview');
    const docLow = new MarketplaceReview({ templateId: 't1', userId: 'u1', userName: 'U', rating: 0 });
    const errLow = docLow.validateSync();
    expect(errLow?.errors.rating).toBeDefined();

    const docHigh = new MarketplaceReview({ templateId: 't1', userId: 'u1', userName: 'U', rating: 6 });
    const errHigh = docHigh.validateSync();
    expect(errHigh?.errors.rating).toBeDefined();
  });
});
