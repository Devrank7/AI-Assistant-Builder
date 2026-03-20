import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

describe('SSOConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: SSOConfig } = await import('@/models/SSOConfig');
    const doc = new SSOConfig({ organizationId: 'org1', protocol: 'saml' });
    expect(doc.provider).toBe('custom');
    expect(doc.entryPoint).toBeNull();
    expect(doc.issuer).toBeNull();
    expect(doc.cert).toBeNull();
    expect(doc.clientId).toBeNull();
    expect(doc.clientSecret).toBeNull();
    expect(doc.discoveryUrl).toBeNull();
    expect(doc.autoProvision).toBe(true);
    expect(doc.defaultRole).toBe('viewer');
    expect(doc.allowedDomains).toEqual([]);
    expect(doc.enforceSSO).toBe(false);
    expect(doc.enabled).toBe(false);
  });

  it('should require organizationId and protocol', async () => {
    const { default: SSOConfig } = await import('@/models/SSOConfig');
    const doc = new SSOConfig({});
    const err = doc.validateSync();
    expect(err?.errors.organizationId).toBeDefined();
  });

  it('should validate protocol enum', async () => {
    const { default: SSOConfig } = await import('@/models/SSOConfig');
    const doc = new SSOConfig({ organizationId: 'org1', protocol: 'ldap' });
    const err = doc.validateSync();
    expect(err?.errors.protocol).toBeDefined();
  });
});

describe('CustomDomain', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: CustomDomain } = await import('@/models/CustomDomain');
    const doc = new CustomDomain({
      organizationId: 'org1',
      clientId: 'cl1',
      domain: 'chat.example.com',
      verificationToken: 'tok1',
    });
    expect(doc.cnameTarget).toBe('proxy.winbixai.com');
    expect(doc.status).toBe('pending_verification');
  });

  it('should require organizationId, clientId, domain, verificationToken', async () => {
    const { default: CustomDomain } = await import('@/models/CustomDomain');
    const doc = new CustomDomain({});
    const err = doc.validateSync();
    expect(err?.errors.organizationId).toBeDefined();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.domain).toBeDefined();
    expect(err?.errors.verificationToken).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: CustomDomain } = await import('@/models/CustomDomain');
    const doc = new CustomDomain({
      organizationId: 'org1',
      clientId: 'cl1',
      domain: 'test.com',
      verificationToken: 'tok',
      status: 'invalid',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('ComplianceConfig', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: ComplianceConfig } = await import('@/models/ComplianceConfig');
    const doc = new ComplianceConfig({ organizationId: 'org1' });
    expect(doc.hipaaMode).toBe(false);
    expect(doc.soc2AuditEnabled).toBe(false);
    expect(doc.gdprDpaGenerated).toBe(false);
    expect(doc.dataResidency).toBe('auto');
    expect(doc.retentionDays).toBe(365);
    expect(doc.piiFields).toEqual(['email', 'phone', 'name', 'address']);
  });

  it('should require organizationId', async () => {
    const { default: ComplianceConfig } = await import('@/models/ComplianceConfig');
    const doc = new ComplianceConfig({});
    const err = doc.validateSync();
    expect(err?.errors.organizationId).toBeDefined();
  });

  it('should validate dataResidency enum', async () => {
    const { default: ComplianceConfig } = await import('@/models/ComplianceConfig');
    const doc = new ComplianceConfig({ organizationId: 'org1', dataResidency: 'asia' });
    const err = doc.validateSync();
    expect(err?.errors.dataResidency).toBeDefined();
  });
});

describe('Brand', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Brand } = await import('@/models/Brand');
    const doc = new Brand({ organizationId: 'org1', name: 'Brand1', slug: 'brand1' });
    expect(doc.logo).toBe('');
    expect(doc.primaryColor).toBe('#3B82F6');
    expect(doc.secondaryColor).toBe('#1E40AF');
    expect(doc.description).toBe('');
    expect(doc.widgetIds).toEqual([]);
    expect(doc.isDefault).toBe(false);
  });

  it('should require organizationId, name, and slug', async () => {
    const { default: Brand } = await import('@/models/Brand');
    const doc = new Brand({});
    const err = doc.validateSync();
    expect(err?.errors.organizationId).toBeDefined();
    expect(err?.errors.name).toBeDefined();
    expect(err?.errors.slug).toBeDefined();
  });
});

describe('ResellerAccount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: ResellerAccount } = await import('@/models/ResellerAccount');
    const doc = new ResellerAccount({
      organizationId: 'org1',
      name: 'Reseller',
      email: 'r@test.com',
      company: 'Co',
    });
    expect(doc.maxSubAccounts).toBe(50);
    expect(doc.totalRevenue).toBe(0);
    expect(doc.status).toBe('active');
    expect(doc.billingOverride?.markupPercent).toBe(20);
  });

  it('should require organizationId, name, email, company', async () => {
    const { default: ResellerAccount } = await import('@/models/ResellerAccount');
    const doc = new ResellerAccount({});
    const err = doc.validateSync();
    expect(err?.errors.organizationId).toBeDefined();
    expect(err?.errors.name).toBeDefined();
    expect(err?.errors.email).toBeDefined();
    expect(err?.errors.company).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: ResellerAccount } = await import('@/models/ResellerAccount');
    const doc = new ResellerAccount({
      organizationId: 'org1',
      name: 'R',
      email: 'r@t.com',
      company: 'C',
      status: 'inactive',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('VideoAvatar', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: VideoAvatar } = await import('@/models/VideoAvatar');
    const doc = new VideoAvatar({ clientId: 'cl1', name: 'Avatar' });
    expect(doc.avatarUrl).toBe('');
    expect(doc.voiceId).toBe('');
    expect(doc.provider).toBe('heygen');
    expect(doc.style).toBe('professional');
    expect(doc.gender).toBe('neutral');
    expect(doc.language).toBe('en');
    expect(doc.isActive).toBe(true);
  });

  it('should require clientId and name', async () => {
    const { default: VideoAvatar } = await import('@/models/VideoAvatar');
    const doc = new VideoAvatar({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.name).toBeDefined();
  });

  it('should validate provider enum', async () => {
    const { default: VideoAvatar } = await import('@/models/VideoAvatar');
    const doc = new VideoAvatar({ clientId: 'cl1', name: 'A', provider: 'synthesia' });
    const err = doc.validateSync();
    expect(err?.errors.provider).toBeDefined();
  });

  it('should validate style enum', async () => {
    const { default: VideoAvatar } = await import('@/models/VideoAvatar');
    const doc = new VideoAvatar({ clientId: 'cl1', name: 'A', style: 'robotic' });
    const err = doc.validateSync();
    expect(err?.errors.style).toBeDefined();
  });

  it('should validate gender enum', async () => {
    const { default: VideoAvatar } = await import('@/models/VideoAvatar');
    const doc = new VideoAvatar({ clientId: 'cl1', name: 'A', gender: 'other' });
    const err = doc.validateSync();
    expect(err?.errors.gender).toBeDefined();
  });
});

describe('PremiumTemplate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: PremiumTemplate } = await import('@/models/PremiumTemplate');
    const doc = new PremiumTemplate({
      authorId: 'a1',
      authorName: 'Author',
      title: 'T',
      description: 'D',
      niche: 'dental',
      themeConfig: {},
    });
    expect(doc.longDescription).toBe('');
    expect(doc.price).toBe(0);
    expect(doc.currency).toBe('usd');
    expect(doc.downloads).toBe(0);
    expect(doc.rating).toBe(0);
    expect(doc.reviewCount).toBe(0);
    expect(doc.revenue).toBe(0);
    expect(doc.status).toBe('draft');
    expect(doc.revenueShare).toBe(0.7);
    expect(doc.tags).toEqual([]);
    expect(doc.previewImages).toEqual([]);
  });

  it('should require authorId, authorName, title, description, niche, themeConfig', async () => {
    const { default: PremiumTemplate } = await import('@/models/PremiumTemplate');
    const doc = new PremiumTemplate({});
    const err = doc.validateSync();
    expect(err?.errors.authorId).toBeDefined();
    expect(err?.errors.authorName).toBeDefined();
    expect(err?.errors.title).toBeDefined();
    expect(err?.errors.description).toBeDefined();
    expect(err?.errors.niche).toBeDefined();
    expect(err?.errors.themeConfig).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: PremiumTemplate } = await import('@/models/PremiumTemplate');
    const doc = new PremiumTemplate({
      authorId: 'a1',
      authorName: 'A',
      title: 'T',
      description: 'D',
      niche: 'dental',
      themeConfig: {},
      status: 'active',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });

  it('should validate price min', async () => {
    const { default: PremiumTemplate } = await import('@/models/PremiumTemplate');
    const doc = new PremiumTemplate({
      authorId: 'a1',
      authorName: 'A',
      title: 'T',
      description: 'D',
      niche: 'dental',
      themeConfig: {},
      price: -1,
    });
    const err = doc.validateSync();
    expect(err?.errors.price).toBeDefined();
  });
});

describe('TemplatePurchase', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should default status to completed', async () => {
    const { default: TemplatePurchase } = await import('@/models/TemplatePurchase');
    const doc = new TemplatePurchase({
      buyerId: 'b1',
      templateId: 't1',
      authorId: 'a1',
      price: 999,
      authorEarnings: 699,
      platformFee: 300,
    });
    expect(doc.status).toBe('completed');
  });

  it('should require buyerId, templateId, authorId, price, authorEarnings, platformFee', async () => {
    const { default: TemplatePurchase } = await import('@/models/TemplatePurchase');
    const doc = new TemplatePurchase({});
    const err = doc.validateSync();
    expect(err?.errors.buyerId).toBeDefined();
    expect(err?.errors.templateId).toBeDefined();
    expect(err?.errors.authorId).toBeDefined();
    expect(err?.errors.price).toBeDefined();
    expect(err?.errors.authorEarnings).toBeDefined();
    expect(err?.errors.platformFee).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: TemplatePurchase } = await import('@/models/TemplatePurchase');
    const doc = new TemplatePurchase({
      buyerId: 'b1',
      templateId: 't1',
      authorId: 'a1',
      price: 999,
      authorEarnings: 699,
      platformFee: 300,
      status: 'pending',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('WidgetComponent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: WidgetComponent } = await import('@/models/WidgetComponent');
    const doc = new WidgetComponent({
      clientId: 'cl1',
      widgetId: 'w1',
      type: 'header',
      name: 'Header',
    });
    expect(doc.order).toBe(0);
    expect(doc.isVisible).toBe(true);
  });

  it('should require clientId, widgetId, type, name', async () => {
    const { default: WidgetComponent } = await import('@/models/WidgetComponent');
    const doc = new WidgetComponent({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.widgetId).toBeDefined();
    expect(err?.errors.type).toBeDefined();
    expect(err?.errors.name).toBeDefined();
  });

  it('should validate type enum', async () => {
    const { default: WidgetComponent } = await import('@/models/WidgetComponent');
    const doc = new WidgetComponent({
      clientId: 'cl1',
      widgetId: 'w1',
      type: 'sidebar',
      name: 'Sidebar',
    });
    const err = doc.validateSync();
    expect(err?.errors.type).toBeDefined();
  });
});

describe('CoBrowsingSession', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: CoBrowsingSession } = await import('@/models/CoBrowsingSession');
    const doc = new CoBrowsingSession({
      sessionId: 's1',
      clientId: 'cl1',
      visitorId: 'v1',
      agentUserId: 'a1',
    });
    expect(doc.status).toBe('waiting');
    expect(doc.pageUrl).toBe('');
    expect(doc.pageTitle).toBe('');
    expect(doc.highlights).toEqual([]);
    expect(doc.scrollPosition?.x).toBe(0);
    expect(doc.scrollPosition?.y).toBe(0);
    expect(doc.startedAt).toBeInstanceOf(Date);
  });

  it('should require sessionId, clientId, visitorId, agentUserId', async () => {
    const { default: CoBrowsingSession } = await import('@/models/CoBrowsingSession');
    const doc = new CoBrowsingSession({});
    const err = doc.validateSync();
    expect(err?.errors.sessionId).toBeDefined();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.visitorId).toBeDefined();
    expect(err?.errors.agentUserId).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: CoBrowsingSession } = await import('@/models/CoBrowsingSession');
    const doc = new CoBrowsingSession({
      sessionId: 's1',
      clientId: 'cl1',
      visitorId: 'v1',
      agentUserId: 'a1',
      status: 'paused',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('EngagementPrediction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: EngagementPrediction } = await import('@/models/EngagementPrediction');
    const doc = new EngagementPrediction({
      clientId: 'cl1',
      visitorId: 'v1',
      sessionId: 's1',
      exitProbability: 0.5,
      engagementScore: 70,
    });
    expect(doc.recommendedAction).toBe('none');
    expect(doc.signals).toEqual([]);
    expect(doc.predictedAt).toBeInstanceOf(Date);
  });

  it('should require clientId, visitorId, sessionId, exitProbability, engagementScore', async () => {
    const { default: EngagementPrediction } = await import('@/models/EngagementPrediction');
    const doc = new EngagementPrediction({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.visitorId).toBeDefined();
    expect(err?.errors.sessionId).toBeDefined();
    expect(err?.errors.exitProbability).toBeDefined();
    expect(err?.errors.engagementScore).toBeDefined();
  });

  it('should validate recommendedAction enum', async () => {
    const { default: EngagementPrediction } = await import('@/models/EngagementPrediction');
    const doc = new EngagementPrediction({
      clientId: 'cl1',
      visitorId: 'v1',
      sessionId: 's1',
      exitProbability: 0.5,
      engagementScore: 70,
      recommendedAction: 'alert',
    });
    const err = doc.validateSync();
    expect(err?.errors.recommendedAction).toBeDefined();
  });

  it('should validate exitProbability min/max', async () => {
    const { default: EngagementPrediction } = await import('@/models/EngagementPrediction');
    const docHigh = new EngagementPrediction({
      clientId: 'cl1',
      visitorId: 'v1',
      sessionId: 's1',
      exitProbability: 1.5,
      engagementScore: 70,
    });
    const errHigh = docHigh.validateSync();
    expect(errHigh?.errors.exitProbability).toBeDefined();
  });

  it('should validate engagementScore min/max', async () => {
    const { default: EngagementPrediction } = await import('@/models/EngagementPrediction');
    const doc = new EngagementPrediction({
      clientId: 'cl1',
      visitorId: 'v1',
      sessionId: 's1',
      exitProbability: 0.5,
      engagementScore: 101,
    });
    const err = doc.validateSync();
    expect(err?.errors.engagementScore).toBeDefined();
  });
});
