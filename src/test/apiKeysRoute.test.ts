import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockApiKeyFind = vi.fn();
const mockApiKeyCreate = vi.fn();
const mockApiKeyCountDocuments = vi.fn();
const mockOrgFindById = vi.fn();

vi.mock('@/models/ApiKey', () => ({
  default: {
    find: (...args: unknown[]) => ({ select: () => ({ sort: () => mockApiKeyFind(...args) }) }),
    create: (...args: unknown[]) => mockApiKeyCreate(...args),
    countDocuments: (...args: unknown[]) => mockApiKeyCountDocuments(...args),
  },
}));

vi.mock('@/models/Organization', () => ({
  default: {
    findById: (...args: unknown[]) => ({ select: () => mockOrgFindById(...args) }),
  },
}));

vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'user1',
    organizationId: 'org1',
    orgRole: 'owner',
    user: { email: 'test@test.com', plan: 'pro', subscriptionStatus: 'active' },
  }),
}));

vi.mock('@/lib/apiKeyAuth', () => ({
  hashApiKey: vi.fn().mockReturnValue('hashed_key_123'),
  generateApiKey: vi.fn().mockReturnValue('wbx_live_generated_key_value'),
}));

describe('API Key Management Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists API keys for the authenticated user', async () => {
    const keys = [
      {
        _id: 'key1',
        name: 'Test Key',
        keyPrefix: 'wbx_live_ab12...',
        scopes: ['read'],
        status: 'active',
        createdAt: new Date(),
      },
    ];
    mockApiKeyFind.mockResolvedValue(keys);

    const { GET } = await import('@/app/api/developer/keys/route');
    const request = new Request('http://localhost/api/developer/keys');
    (request as any).cookies = { get: () => ({ value: 'token' }) };

    const response = await GET(request as any);
    const data = await response.json();
    expect(data.data.keys).toHaveLength(1);
  });

  it('creates a new API key for pro plan', async () => {
    mockOrgFindById.mockResolvedValue({ plan: 'pro' });
    mockApiKeyCountDocuments.mockResolvedValue(0);
    mockApiKeyCreate.mockResolvedValue({
      _id: 'newkey1',
      name: 'My Key',
      keyPrefix: 'wbx_live_generat...',
      environment: 'live',
      scopes: ['read'],
      rateLimit: 300,
      expiresAt: null,
      createdAt: new Date(),
    });

    const { POST } = await import('@/app/api/developer/keys/route');
    const request = new Request('http://localhost/api/developer/keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Key' }),
      headers: { 'content-type': 'application/json' },
    });
    (request as any).cookies = { get: () => ({ value: 'token' }) };

    const response = await POST(request as any);
    const data = await response.json();
    expect(data.data.key.rawKey).toBeDefined();
    expect(data.data.key.name).toBe('My Key');
  });

  it('rejects key creation for free plan', async () => {
    mockOrgFindById.mockResolvedValue({ plan: 'free' });

    const { POST } = await import('@/app/api/developer/keys/route');
    const request = new Request('http://localhost/api/developer/keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'My Key' }),
      headers: { 'content-type': 'application/json' },
    });
    (request as any).cookies = { get: () => ({ value: 'token' }) };

    const response = await POST(request as any);
    expect(response.status).toBe(403);
  });
});
