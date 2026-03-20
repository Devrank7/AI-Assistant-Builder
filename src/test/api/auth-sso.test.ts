import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/ssoService', () => ({
  getSSOConfigByDomain: vi.fn(),
  getSSOConfigByOrgSlug: vi.fn(),
  buildSAMLRedirectUrl: vi.fn(),
  buildOIDCRedirectUrl: vi.fn(),
  getSSOConfig: vi.fn(),
  validateSAMLResponse: vi.fn(),
  validateOIDCToken: vi.fn(),
  provisionSSOUser: vi.fn(),
}));

vi.mock('@/lib/jwt', () => ({
  signAccessToken: vi.fn().mockReturnValue('mock-access-token'),
  signRefreshToken: vi.fn().mockReturnValue('mock-refresh-token'),
}));

vi.mock('@/models/SSOConfig', () => ({
  default: {
    find: vi.fn().mockResolvedValue([]),
  },
}));

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

// ----------------------------------------------------------------
// POST /api/auth/sso
// ----------------------------------------------------------------
describe('API: POST /api/auth/sso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 400 when neither email nor orgSlug provided', async () => {
    const { POST } = await import('@/app/api/auth/sso/route');
    const res = await POST(createRequest('POST', '/api/auth/sso', {}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('should return 400 for invalid email format', async () => {
    const { POST } = await import('@/app/api/auth/sso/route');
    const res = await POST(createRequest('POST', '/api/auth/sso', { email: 'bademail' }));
    expect(res.status).toBe(400);
  });

  it('should return 404 when no SSO config found', async () => {
    const { getSSOConfigByDomain, getSSOConfigByOrgSlug } = await import('@/lib/ssoService');
    (getSSOConfigByDomain as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (getSSOConfigByOrgSlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/sso/route');
    const res = await POST(createRequest('POST', '/api/auth/sso', { email: 'user@example.com', orgSlug: 'no-org' }));
    expect(res.status).toBe(404);
  });

  it('should return SAML redirect URL for valid email domain', async () => {
    const { getSSOConfigByDomain, buildSAMLRedirectUrl } = await import('@/lib/ssoService');
    (getSSOConfigByDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
      protocol: 'saml',
      entryPoint: 'https://idp.example.com/sso',
    });
    (buildSAMLRedirectUrl as ReturnType<typeof vi.fn>).mockReturnValue('https://idp.example.com/sso?SAMLRequest=xxx');

    const { POST } = await import('@/app/api/auth/sso/route');
    const res = await POST(createRequest('POST', '/api/auth/sso', { email: 'user@example.com' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.protocol).toBe('saml');
    expect(data.data.redirectUrl).toContain('idp.example.com');
  });

  it('should return OIDC redirect URL when config is oidc', async () => {
    const { getSSOConfigByOrgSlug, buildOIDCRedirectUrl } = await import('@/lib/ssoService');
    (getSSOConfigByOrgSlug as ReturnType<typeof vi.fn>).mockResolvedValue({
      protocol: 'oidc',
      clientId: 'oidc-client',
    });
    (buildOIDCRedirectUrl as ReturnType<typeof vi.fn>).mockReturnValue(
      'https://auth.example.com/authorize?client_id=oidc-client'
    );

    const { POST } = await import('@/app/api/auth/sso/route');
    const res = await POST(createRequest('POST', '/api/auth/sso', { orgSlug: 'my-org' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.protocol).toBe('oidc');
    expect(data.data.state).toBeDefined();
  });
});

// ----------------------------------------------------------------
// POST /api/auth/sso/callback
// ----------------------------------------------------------------
describe('API: POST /api/auth/sso/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should redirect to login with error when no SAMLResponse or code', async () => {
    const { POST } = await import('@/app/api/auth/sso/callback/route');
    const res = await POST(createRequest('POST', '/api/auth/sso/callback', {}));
    // Redirects to /login?error=sso_failed
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('error=sso_failed');
  });

  it('should redirect to dashboard on successful SAML callback', async () => {
    const SSOConfig = (await import('@/models/SSOConfig')).default;
    const samlConfig = {
      protocol: 'saml',
      enabled: true,
      organizationId: 'org1',
    };
    (SSOConfig.find as ReturnType<typeof vi.fn>).mockResolvedValue([samlConfig]);

    const { validateSAMLResponse, provisionSSOUser } = await import('@/lib/ssoService');
    (validateSAMLResponse as ReturnType<typeof vi.fn>).mockResolvedValue({
      email: 'user@example.com',
      name: 'Test User',
    });
    (provisionSSOUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      userId: 'u1',
      email: 'user@example.com',
    });

    const { POST } = await import('@/app/api/auth/sso/callback/route');
    const res = await POST(createRequest('POST', '/api/auth/sso/callback', { SAMLResponse: 'base64-saml-data' }));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('/dashboard');
  });

  it('should redirect to login when OIDC token validation fails', async () => {
    const SSOConfig = (await import('@/models/SSOConfig')).default;
    (SSOConfig.find as ReturnType<typeof vi.fn>).mockResolvedValue([{ protocol: 'oidc', enabled: true }]);

    const { validateOIDCToken } = await import('@/lib/ssoService');
    (validateOIDCToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/sso/callback/route');
    const res = await POST(createRequest('POST', '/api/auth/sso/callback', { code: 'auth-code-123' }));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('error=sso_failed');
  });

  it('should redirect to login when provisioning is rejected (domain mismatch)', async () => {
    const SSOConfig = (await import('@/models/SSOConfig')).default;
    const samlConfig = { protocol: 'saml', enabled: true };
    (SSOConfig.find as ReturnType<typeof vi.fn>).mockResolvedValue([samlConfig]);

    const { validateSAMLResponse, provisionSSOUser } = await import('@/lib/ssoService');
    (validateSAMLResponse as ReturnType<typeof vi.fn>).mockResolvedValue({
      email: 'user@blocked.com',
      name: 'Blocked User',
    });
    (provisionSSOUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import('@/app/api/auth/sso/callback/route');
    const res = await POST(createRequest('POST', '/api/auth/sso/callback', { SAMLResponse: 'base64-data' }));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('error=sso_domain_rejected');
  });

  it('should handle GET callback with query params (OIDC redirect)', async () => {
    const SSOConfig = (await import('@/models/SSOConfig')).default;
    (SSOConfig.find as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const { GET } = await import('@/app/api/auth/sso/callback/route');
    const res = await GET(createRequest('GET', '/api/auth/sso/callback?code=xyz&state=abc'));
    expect(res.status).toBe(307);
    const location = res.headers.get('location') || '';
    expect(location).toContain('error=sso_failed');
  });
});
