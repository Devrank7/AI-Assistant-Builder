import { describe, it, expect, vi } from 'vitest';

// Mock mongoose and models before importing
vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/SSOConfig', () => {
  const mockModel: Record<string, unknown> = {
    findOne: vi.fn(),
    create: vi.fn(),
  };
  return { default: mockModel };
});
vi.mock('@/models/User', () => {
  const mockModel: Record<string, unknown> = {
    findOne: vi.fn(),
    create: vi.fn(),
  };
  return { default: mockModel };
});
vi.mock('@/models/OrgMember', () => {
  const mockModel: Record<string, unknown> = {
    findOne: vi.fn(),
    create: vi.fn(),
  };
  return { default: mockModel };
});

describe('SSO Service', () => {
  it('should build a SAML redirect URL with entryPoint and query parameters', async () => {
    const { buildSAMLRedirectUrl } = await import('@/lib/ssoService');

    const mockConfig = {
      entryPoint: 'https://idp.example.com/sso/saml',
      issuer: 'winbix-ai',
      protocol: 'saml' as const,
      allowedDomains: ['example.com'],
    } as Parameters<typeof buildSAMLRedirectUrl>[0];

    const url = buildSAMLRedirectUrl(mockConfig, 'https://winbixai.com/api/auth/sso/callback');

    expect(url).toContain('https://idp.example.com/sso/saml?');
    expect(url).toContain('SAMLRequest=');
    expect(url).toContain('RelayState=');
  });

  it('should build an OIDC redirect URL with correct query parameters', async () => {
    const { buildOIDCRedirectUrl } = await import('@/lib/ssoService');

    const mockConfig = {
      clientId: 'test-client-id',
      discoveryUrl: 'https://login.example.com/.well-known/openid-configuration',
      protocol: 'oidc' as const,
    } as Parameters<typeof buildOIDCRedirectUrl>[0];

    const url = buildOIDCRedirectUrl(mockConfig, 'https://winbixai.com/api/auth/sso/callback', 'random-state-value');

    expect(url).toContain('https://login.example.com/authorize?');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid+email+profile');
    expect(url).toContain('state=random-state-value');
    expect(url).toContain('nonce=');
  });

  it('should reject domains not in the allowedDomains list during provisioning', async () => {
    const { provisionSSOUser } = await import('@/lib/ssoService');

    const mockConfig = {
      allowedDomains: ['company.com'],
      autoProvision: true,
      defaultRole: 'viewer',
      organizationId: 'org-123',
      provider: 'okta',
    } as Parameters<typeof provisionSSOUser>[0];

    const result = await provisionSSOUser(mockConfig, 'hacker@evil.com', 'Evil User');
    expect(result).toBeNull();
  });
});
