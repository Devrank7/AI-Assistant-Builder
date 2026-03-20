import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

describe('AgentPersona', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: AgentPersona } = await import('@/models/AgentPersona');
    const doc = new AgentPersona({ clientId: 'cl1', name: 'Sales Bot' });
    expect(doc.role).toBe('general');
    expect(doc.tone).toBe('friendly');
    expect(doc.systemPromptOverlay).toBe('');
    expect(doc.isDefault).toBe(false);
    expect(doc.isActive).toBe(true);
    expect(doc.modelPreference).toBe('auto');
    expect(doc.memoryEnabled).toBe(false);
    expect(doc.maxMemoryFacts).toBe(20);
  });

  it('should require clientId and name', async () => {
    const { default: AgentPersona } = await import('@/models/AgentPersona');
    const doc = new AgentPersona({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.name).toBeDefined();
  });

  it('should validate modelPreference enum', async () => {
    const { default: AgentPersona } = await import('@/models/AgentPersona');
    const doc = new AgentPersona({ clientId: 'cl1', name: 'Bot', modelPreference: 'gpt5' });
    const err = doc.validateSync();
    expect(err?.errors.modelPreference).toBeDefined();
  });

  it('should validate maxMemoryFacts min/max', async () => {
    const { default: AgentPersona } = await import('@/models/AgentPersona');
    const docLow = new AgentPersona({ clientId: 'cl1', name: 'Bot', maxMemoryFacts: 0 });
    const errLow = docLow.validateSync();
    expect(errLow?.errors.maxMemoryFacts).toBeDefined();

    const docHigh = new AgentPersona({ clientId: 'cl1', name: 'Bot', maxMemoryFacts: 101 });
    const errHigh = docHigh.validateSync();
    expect(errHigh?.errors.maxMemoryFacts).toBeDefined();
  });
});

describe('AgentMemory', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: AgentMemory } = await import('@/models/AgentMemory');
    const doc = new AgentMemory({ clientId: 'cl1', visitorId: 'v1' });
    expect(doc.personaId).toBe('default');
    expect(doc.sessionId).toBe('');
    expect(doc.facts).toEqual([]);
    expect(doc.conversationSummary).toBe('');
    expect(doc.interactionCount).toBe(0);
    expect(doc.lastInteraction).toBeInstanceOf(Date);
  });

  it('should require clientId and visitorId', async () => {
    const { default: AgentMemory } = await import('@/models/AgentMemory');
    const doc = new AgentMemory({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.visitorId).toBeDefined();
  });

  it('should default fact confidence to 0.8', async () => {
    const { default: AgentMemory } = await import('@/models/AgentMemory');
    const doc = new AgentMemory({
      clientId: 'cl1',
      visitorId: 'v1',
      facts: [{ key: 'name', value: 'John' }],
    });
    expect(doc.facts[0].confidence).toBe(0.8);
  });

  it('should validate fact confidence min/max', async () => {
    const { default: AgentMemory } = await import('@/models/AgentMemory');
    const doc = new AgentMemory({
      clientId: 'cl1',
      visitorId: 'v1',
      facts: [{ key: 'name', value: 'John', confidence: 1.5 }],
    });
    const err = doc.validateSync();
    expect(err?.errors['facts.0.confidence']).toBeDefined();
  });
});

describe('AgentRoutingRule', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: AgentRoutingRule } = await import('@/models/AgentRoutingRule');
    const doc = new AgentRoutingRule({ clientId: 'cl1', name: 'Rule1', toPersonaId: 'p2' });
    expect(doc.priority).toBe(0);
    expect(doc.fromPersonaId).toBe('*');
    expect(doc.matchMode).toBe('any');
    expect(doc.isActive).toBe(true);
    expect(doc.handoffMessage).toBe('');
    expect(doc.conditions).toEqual([]);
  });

  it('should require clientId, name, toPersonaId', async () => {
    const { default: AgentRoutingRule } = await import('@/models/AgentRoutingRule');
    const doc = new AgentRoutingRule({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.name).toBeDefined();
    expect(err?.errors.toPersonaId).toBeDefined();
  });

  it('should validate matchMode enum', async () => {
    const { default: AgentRoutingRule } = await import('@/models/AgentRoutingRule');
    const doc = new AgentRoutingRule({ clientId: 'cl1', name: 'R', toPersonaId: 'p2', matchMode: 'first' });
    const err = doc.validateSync();
    expect(err?.errors.matchMode).toBeDefined();
  });
});

describe('AgentStoreItem', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: AgentStoreItem } = await import('@/models/AgentStoreItem');
    const doc = new AgentStoreItem({
      name: 'Bot',
      description: 'desc',
      niche: 'dental',
      authorId: 'a1',
      systemPrompt: 'prompt',
    });
    expect(doc.category).toBe('custom');
    expect(doc.authorName).toBe('');
    expect(doc.rating).toBe(0);
    expect(doc.reviewCount).toBe(0);
    expect(doc.installs).toBe(0);
    expect(doc.status).toBe('pending');
  });

  it('should require name, description, niche, authorId, systemPrompt', async () => {
    const { default: AgentStoreItem } = await import('@/models/AgentStoreItem');
    const doc = new AgentStoreItem({});
    const err = doc.validateSync();
    expect(err?.errors.name).toBeDefined();
    expect(err?.errors.description).toBeDefined();
    expect(err?.errors.niche).toBeDefined();
    expect(err?.errors.authorId).toBeDefined();
    expect(err?.errors.systemPrompt).toBeDefined();
  });

  it('should validate category enum', async () => {
    const { default: AgentStoreItem } = await import('@/models/AgentStoreItem');
    const doc = new AgentStoreItem({
      name: 'Bot',
      description: 'desc',
      niche: 'dental',
      authorId: 'a1',
      systemPrompt: 'p',
      category: 'invalid',
    });
    const err = doc.validateSync();
    expect(err?.errors.category).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: AgentStoreItem } = await import('@/models/AgentStoreItem');
    const doc = new AgentStoreItem({
      name: 'Bot',
      description: 'desc',
      niche: 'dental',
      authorId: 'a1',
      systemPrompt: 'p',
      status: 'invalid',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('BotState', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: BotState } = await import('@/models/BotState');
    const doc = new BotState({});
    expect(doc.orchestratorRunning).toBe(false);
    expect(doc.sessionId).toBe('');
    expect(doc.lastUpdate).toBeInstanceOf(Date);
  });

  it('should accept empty document without validation errors', async () => {
    const { default: BotState } = await import('@/models/BotState');
    const doc = new BotState({});
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });
});
