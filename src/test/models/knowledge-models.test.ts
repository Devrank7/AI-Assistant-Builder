import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

describe('KnowledgeChunk', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should require clientId and text', async () => {
    const { default: KnowledgeChunk } = await import('@/models/KnowledgeChunk');
    const doc = new KnowledgeChunk({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.text).toBeDefined();
  });

  it('should default source to manual', async () => {
    const { default: KnowledgeChunk } = await import('@/models/KnowledgeChunk');
    const doc = new KnowledgeChunk({ clientId: 'cl1', text: 'hello', embedding: [0.1, 0.2] });
    expect(doc.source).toBe('manual');
  });

  it('should accept valid document without errors', async () => {
    const { default: KnowledgeChunk } = await import('@/models/KnowledgeChunk');
    const doc = new KnowledgeChunk({ clientId: 'cl1', text: 'hello', embedding: [0.1], source: 'crawl' });
    const err = doc.validateSync();
    expect(err).toBeUndefined();
  });
});

describe('KnowledgeEvolution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: KnowledgeEvolution } = await import('@/models/KnowledgeEvolution');
    const doc = new KnowledgeEvolution({ clientId: 'cl1', crawlUrl: 'https://test.com' });
    expect(doc.status).toBe('pending');
    expect(doc.pagesScanned).toBe(0);
    expect(doc.diffs).toEqual([]);
    expect(doc.addedChunks).toBe(0);
    expect(doc.removedChunks).toBe(0);
    expect(doc.modifiedChunks).toBe(0);
    expect(doc.autoApplied).toBe(false);
    expect(doc.error).toBeNull();
    expect(doc.completedAt).toBeNull();
    expect(doc.startedAt).toBeInstanceOf(Date);
  });

  it('should require clientId and crawlUrl', async () => {
    const { default: KnowledgeEvolution } = await import('@/models/KnowledgeEvolution');
    const doc = new KnowledgeEvolution({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.crawlUrl).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: KnowledgeEvolution } = await import('@/models/KnowledgeEvolution');
    const doc = new KnowledgeEvolution({ clientId: 'cl1', crawlUrl: 'https://test.com', status: 'running' });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });

  it('should accept all valid status values', async () => {
    const { default: KnowledgeEvolution } = await import('@/models/KnowledgeEvolution');
    for (const status of ['pending', 'crawling', 'diffing', 'applying', 'completed', 'failed']) {
      const doc = new KnowledgeEvolution({ clientId: 'cl1', crawlUrl: 'https://test.com', status });
      const err = doc.validateSync();
      expect(err?.errors?.status).toBeUndefined();
    }
  });
});

describe('Flow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: Flow } = await import('@/models/Flow');
    const doc = new Flow({
      flowId: 'f1',
      clientId: 'cl1',
      userId: 'u1',
      name: 'Flow 1',
      trigger: { type: 'new_chat' },
    });
    expect(doc.status).toBe('draft');
    expect(doc.templateId).toBeNull();
    expect(doc.stats?.timesTriggered).toBe(0);
    expect(doc.stats?.lastTriggeredAt).toBeNull();
  });

  it('should require flowId, clientId, userId, name', async () => {
    const { default: Flow } = await import('@/models/Flow');
    const doc = new Flow({});
    const err = doc.validateSync();
    expect(err?.errors.flowId).toBeDefined();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.userId).toBeDefined();
    expect(err?.errors.name).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: Flow } = await import('@/models/Flow');
    const doc = new Flow({
      flowId: 'f1',
      clientId: 'cl1',
      userId: 'u1',
      name: 'Flow 1',
      trigger: { type: 'new_chat' },
      status: 'running',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('FlowExecution', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: FlowExecution } = await import('@/models/FlowExecution');
    const doc = new FlowExecution({
      executionId: 'e1',
      flowId: 'f1',
      contactId: 'co1',
      trigger: { type: 'new_chat' },
    });
    expect(doc.status).toBe('pending');
    expect(doc.conversationId).toBeNull();
    expect(doc.scheduledAt).toBeNull();
  });

  it('should require executionId, flowId, contactId', async () => {
    const { default: FlowExecution } = await import('@/models/FlowExecution');
    const doc = new FlowExecution({});
    const err = doc.validateSync();
    expect(err?.errors.executionId).toBeDefined();
    expect(err?.errors.flowId).toBeDefined();
    expect(err?.errors.contactId).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: FlowExecution } = await import('@/models/FlowExecution');
    const doc = new FlowExecution({
      executionId: 'e1',
      flowId: 'f1',
      contactId: 'co1',
      trigger: { type: 'new_chat' },
      status: 'running',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });
});

describe('TrainingExample', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should have correct schema defaults', async () => {
    const { default: TrainingExample } = await import('@/models/TrainingExample');
    const doc = new TrainingExample({
      clientId: 'cl1',
      userId: 'u1',
      userMessage: 'Hi',
      idealResponse: 'Hello!',
    });
    expect(doc.source).toBe('manual');
    expect(doc.status).toBe('pending');
    expect(doc.qualityScore).toBe(50);
    expect(doc.tags).toEqual([]);
  });

  it('should require clientId, userId, userMessage, idealResponse', async () => {
    const { default: TrainingExample } = await import('@/models/TrainingExample');
    const doc = new TrainingExample({});
    const err = doc.validateSync();
    expect(err?.errors.clientId).toBeDefined();
    expect(err?.errors.userId).toBeDefined();
    expect(err?.errors.userMessage).toBeDefined();
    expect(err?.errors.idealResponse).toBeDefined();
  });

  it('should validate source enum', async () => {
    const { default: TrainingExample } = await import('@/models/TrainingExample');
    const doc = new TrainingExample({
      clientId: 'cl1',
      userId: 'u1',
      userMessage: 'Hi',
      idealResponse: 'Hello!',
      source: 'ai',
    });
    const err = doc.validateSync();
    expect(err?.errors.source).toBeDefined();
  });

  it('should validate status enum', async () => {
    const { default: TrainingExample } = await import('@/models/TrainingExample');
    const doc = new TrainingExample({
      clientId: 'cl1',
      userId: 'u1',
      userMessage: 'Hi',
      idealResponse: 'Hello!',
      status: 'active',
    });
    const err = doc.validateSync();
    expect(err?.errors.status).toBeDefined();
  });

  it('should validate qualityScore min/max', async () => {
    const { default: TrainingExample } = await import('@/models/TrainingExample');
    const docLow = new TrainingExample({
      clientId: 'cl1',
      userId: 'u1',
      userMessage: 'Hi',
      idealResponse: 'Hello!',
      qualityScore: -1,
    });
    const errLow = docLow.validateSync();
    expect(errLow?.errors.qualityScore).toBeDefined();

    const docHigh = new TrainingExample({
      clientId: 'cl1',
      userId: 'u1',
      userMessage: 'Hi',
      idealResponse: 'Hello!',
      qualityScore: 101,
    });
    const errHigh = docHigh.validateSync();
    expect(errHigh?.errors.qualityScore).toBeDefined();
  });
});
