import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/AgentPersona', () => {
  const m = {
    find: vi.fn().mockReturnThis(),
    lean: vi.fn(),
  };
  return { default: m };
});

describe('personaRouter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return null persona when no personas exist', async () => {
    const AgentPersona = (await import('@/models/AgentPersona')).default;
    (AgentPersona.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    });

    const { selectPersona } = await import('@/lib/personaRouter');
    const result = await selectPersona('client-1', 'Hello');

    expect(result.persona).toBeNull();
    expect(result.overlay).toBe('');
  });

  it('should match persona by trigger keyword', async () => {
    const salesPersona = {
      _id: 'p1',
      name: 'Sales Bot',
      role: 'sales',
      tone: 'friendly',
      isActive: true,
      isDefault: false,
      triggerKeywords: ['pricing', 'buy', 'cost'],
      triggerIntents: [],
      systemPromptOverlay: 'Focus on closing deals.',
    };
    const AgentPersona = (await import('@/models/AgentPersona')).default;
    (AgentPersona.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([salesPersona]),
    });

    const { selectPersona } = await import('@/lib/personaRouter');
    const result = await selectPersona('client-1', 'What is the pricing for your service?');

    expect(result.persona).not.toBeNull();
    expect(result.persona!.name).toBe('Sales Bot');
    expect(result.overlay).toContain('ACTIVE PERSONA: Sales Bot');
    expect(result.overlay).toContain('Tone: friendly');
  });

  it('should match persona by intent trigger', async () => {
    const supportPersona = {
      _id: 'p2',
      name: 'Support Agent',
      role: 'support',
      tone: 'empathetic',
      isActive: true,
      isDefault: false,
      triggerKeywords: [],
      triggerIntents: ['complaint', 'bug_report'],
      systemPromptOverlay: 'Be helpful and empathetic.',
    };
    const AgentPersona = (await import('@/models/AgentPersona')).default;
    (AgentPersona.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([supportPersona]),
    });

    const { selectPersona } = await import('@/lib/personaRouter');
    const result = await selectPersona('client-1', 'Something is broken', ['complaint']);

    expect(result.persona!.name).toBe('Support Agent');
    expect(result.overlay).toContain('Support Agent');
  });

  it('should fall back to default persona when no keywords match', async () => {
    const defaultPersona = {
      _id: 'p3',
      name: 'General Assistant',
      role: 'general',
      tone: 'professional',
      isActive: true,
      isDefault: true,
      triggerKeywords: [],
      triggerIntents: [],
      systemPromptOverlay: 'Be general purpose.',
    };
    const salesPersona = {
      _id: 'p4',
      name: 'Sales Bot',
      role: 'sales',
      tone: 'persuasive',
      isActive: true,
      isDefault: false,
      triggerKeywords: ['pricing'],
      triggerIntents: [],
      systemPromptOverlay: 'Sell hard.',
    };
    const AgentPersona = (await import('@/models/AgentPersona')).default;
    (AgentPersona.find as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue([defaultPersona, salesPersona]),
    });

    const { selectPersona } = await import('@/lib/personaRouter');
    const result = await selectPersona('client-1', 'Good morning');

    expect(result.persona!.name).toBe('General Assistant');
  });

  it('should build persona context string correctly', async () => {
    const { buildPersonaContext } = await import('@/lib/personaRouter');

    const persona = {
      name: 'Billing Expert',
      role: 'billing',
      tone: 'formal',
      language: 'English',
      systemPromptOverlay: 'Handle payment questions.',
    } as any;

    const context = buildPersonaContext(persona);
    expect(context).toContain('You are "Billing Expert"');
    expect(context).toContain('billing specialist');
    expect(context).toContain('Tone: formal');
    expect(context).toContain('Respond in English');
    expect(context).toContain('Handle payment questions');
  });
});
