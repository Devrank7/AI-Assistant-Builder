import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockApiKeyFindOne = vi.fn();
const mockApiKeySave = vi.fn();
const mockOrgFindById = vi.fn();

vi.mock('@/models/ApiKey', () => ({
  default: {
    findOne: (...args: unknown[]) => mockApiKeyFindOne(...args),
  },
}));

vi.mock('@/models/Organization', () => ({
  default: {
    findById: (...args: unknown[]) => ({ select: () => mockOrgFindById(...args) }),
  },
}));

describe('apiKeyAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects request with no API key header', async () => {
    const { verifyApiKey } = await import('@/lib/apiKeyAuth');
    const request = new Request('http://localhost/api/v1/widgets', { headers: {} });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(false);
  });

  it('rejects request with invalid API key', async () => {
    mockApiKeyFindOne.mockResolvedValue(null);
    const { verifyApiKey } = await import('@/lib/apiKeyAuth');
    const request = new Request('http://localhost/api/v1/widgets', {
      headers: { 'x-winbix-key': 'wbx_live_invalidkey123' },
    });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(false);
  });

  it('rejects expired API key', async () => {
    mockApiKeyFindOne.mockResolvedValue({
      status: 'active',
      expiresAt: new Date(Date.now() - 86400000),
      organizationId: 'org1',
      userId: 'user1',
      scopes: ['read'],
      rateLimit: 100,
      ipWhitelist: [],
      save: mockApiKeySave,
    });
    const { verifyApiKey } = await import('@/lib/apiKeyAuth');
    const request = new Request('http://localhost/api/v1/widgets', {
      headers: { 'x-winbix-key': 'wbx_live_testkey123456' },
    });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(false);
  });

  it('accepts valid API key and returns context', async () => {
    mockApiKeySave.mockResolvedValue(undefined);
    mockApiKeyFindOne.mockResolvedValue({
      _id: 'keyid1',
      status: 'active',
      expiresAt: new Date(Date.now() + 86400000),
      organizationId: 'org1',
      userId: 'user1',
      scopes: ['read', 'write'],
      rateLimit: 300,
      ipWhitelist: [],
      lastUsedAt: null,
      totalRequests: 0,
      save: mockApiKeySave,
    });
    mockOrgFindById.mockResolvedValue({ plan: 'pro' });
    const { verifyApiKey } = await import('@/lib/apiKeyAuth');
    const request = new Request('http://localhost/api/v1/widgets', {
      headers: { 'x-winbix-key': 'wbx_live_validkey12345' },
    });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(true);
    if (result.authenticated) {
      expect(result.organizationId).toBe('org1');
      expect(result.scopes).toContain('read');
    }
  });

  it('hashApiKey produces consistent SHA-256 hash', async () => {
    const { hashApiKey } = await import('@/lib/apiKeyAuth');
    const hash1 = hashApiKey('wbx_live_test123');
    const hash2 = hashApiKey('wbx_live_test123');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('rejects revoked API key', async () => {
    mockApiKeyFindOne.mockResolvedValue({
      status: 'revoked',
      expiresAt: new Date(Date.now() + 86400000),
      organizationId: 'org1',
      userId: 'user1',
      scopes: ['read'],
      rateLimit: 100,
      save: mockApiKeySave,
    });
    const { verifyApiKey } = await import('@/lib/apiKeyAuth');
    const request = new Request('http://localhost/api/v1/widgets', {
      headers: { 'x-winbix-key': 'wbx_live_revokedkey123' },
    });
    const result = await verifyApiKey(request as any);
    expect(result.authenticated).toBe(false);
  });
});
