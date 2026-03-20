import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockProfile = {
  _id: 'profile-1',
  clientId: 'client-1',
  visitorId: 'visitor-1',
  name: 'John',
  email: 'john@example.com',
  phone: '+1234567890',
  visitCount: 5,
  messageCount: 20,
  totalRevenue: 150,
  facts: [{ key: 'preferred_service', value: 'teeth whitening', confidence: 0.9 }],
  tags: ['vip'],
  sentiment: { current: 'positive', score: 0.5 },
  buyingSignals: 50,
  save: vi.fn().mockResolvedValue(true),
};

vi.mock('@/models/CustomerProfile', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn().mockResolvedValue({}),
  },
}));
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify([
                { key: 'name', value: 'Alice', confidence: 0.95 },
                { key: 'preferred_service', value: 'massage', confidence: 0.8 },
              ]),
          },
        }),
      };
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

describe('customerMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new profile if none exists', async () => {
    const CustomerProfile = (await import('@/models/CustomerProfile')).default;
    (CustomerProfile.findOne as any).mockResolvedValue(null);
    (CustomerProfile.create as any).mockResolvedValue({ ...mockProfile, _id: 'new-profile' });

    const { getOrCreateProfile } = await import('@/lib/customerMemory');
    const profile = await getOrCreateProfile('client-1', 'new-visitor', 'website');

    expect(CustomerProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        visitorId: 'new-visitor',
      })
    );
  });

  it('should return existing profile if found', async () => {
    const CustomerProfile = (await import('@/models/CustomerProfile')).default;
    (CustomerProfile.findOne as any).mockResolvedValue(mockProfile);

    const { getOrCreateProfile } = await import('@/lib/customerMemory');
    const profile = await getOrCreateProfile('client-1', 'visitor-1', 'website');

    expect(CustomerProfile.create).not.toHaveBeenCalled();
    expect(profile.name).toBe('John');
  });

  it('should extract facts from conversation via Gemini', async () => {
    const { extractFacts } = await import('@/lib/customerMemory');
    const facts = await extractFacts([
      { role: 'user', content: 'My name is Alice and I want a massage' },
      { role: 'assistant', content: 'Great choice, Alice!' },
    ]);

    expect(facts.length).toBe(2);
    expect(facts[0].key).toBe('name');
    expect(facts[0].value).toBe('Alice');
    expect(facts[1].key).toBe('preferred_service');
  });

  it('should update profile facts with dedup (newer wins)', async () => {
    const CustomerProfile = (await import('@/models/CustomerProfile')).default;
    const existingProfile = {
      ...mockProfile,
      facts: [
        {
          key: 'preferred_service',
          value: 'old service',
          confidence: 0.7,
          source: 'conversation',
          extractedAt: new Date(),
        },
      ],
      save: vi.fn().mockResolvedValue(true),
    };
    (CustomerProfile.findOne as any).mockResolvedValue(existingProfile);

    const { updateProfileFacts } = await import('@/lib/customerMemory');
    await updateProfileFacts('client-1', 'visitor-1', [
      { key: 'preferred_service', value: 'new service', confidence: 0.9 },
      { key: 'budget', value: '$500', confidence: 0.8 },
    ]);

    expect(existingProfile.save).toHaveBeenCalled();
    const savedFacts = existingProfile.facts;
    expect(savedFacts.length).toBe(2);
  });

  it('should build customer context string for AI prompt', async () => {
    const CustomerProfile = (await import('@/models/CustomerProfile')).default;
    (CustomerProfile.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(mockProfile),
    });

    const { buildCustomerContext } = await import('@/lib/customerMemory');
    const context = await buildCustomerContext('client-1', 'visitor-1');

    expect(context).toContain('CUSTOMER PROFILE');
    expect(context).toContain('Name: John');
    expect(context).toContain('Email: john@example.com');
    expect(context).toContain('Visits: 5');
    expect(context).toContain('Total spent: $150.00');
    expect(context).toContain('preferred_service: teeth whitening');
    expect(context).toContain('Tags: vip');
    expect(context).toContain('Buying interest: 50%');
  });

  it('should return empty string when no profile exists', async () => {
    const CustomerProfile = (await import('@/models/CustomerProfile')).default;
    (CustomerProfile.findOne as any).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const { buildCustomerContext } = await import('@/lib/customerMemory');
    const context = await buildCustomerContext('client-1', 'unknown-visitor');

    expect(context).toBe('');
  });
});
