import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));

vi.mock('@/lib/orgAuth', () => ({
  checkPermission: vi.fn().mockReturnValue(true),
}));

const mockOrgToObject = vi.fn().mockReturnValue({
  _id: 'org1',
  name: 'Test Org',
  plan: 'enterprise',
  slug: 'test-org',
});

vi.mock('@/models/Organization', () => ({
  default: {
    findById: vi.fn().mockResolvedValue({
      _id: 'org1',
      name: 'Test Org',
      plan: 'enterprise',
      slug: 'test-org',
      toObject: mockOrgToObject,
    }),
    findByIdAndUpdate: vi.fn().mockResolvedValue({
      _id: 'org1',
      name: 'Updated Org',
      plan: 'enterprise',
    }),
  },
}));

vi.mock('@/models/OrgMember', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue([{ userId: 'u1', role: 'owner' }]),
    }),
  },
}));

vi.mock('@/models/SSOConfig', () => ({
  default: {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
  },
}));

vi.mock('@/lib/customDomainService', () => ({
  getDomains: vi.fn().mockResolvedValue([]),
  createDomain: vi.fn().mockResolvedValue({ _id: 'd1', domain: 'chat.example.com' }),
  verifyDomain: vi.fn().mockResolvedValue({ _id: 'd1', verified: true }),
  deleteDomain: vi.fn().mockResolvedValue(undefined),
}));

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

function mockAuthSuccess() {
  return {
    authenticated: true,
    userId: 'u1',
    organizationId: 'org1',
    orgRole: 'owner',
    user: { _id: 'u1', email: 'admin@test.com' },
  };
}

function mockAuthFailure() {
  return {
    authenticated: false,
    response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
    }),
  };
}

// ----------------------------------------------------------------
// GET /api/org
// ----------------------------------------------------------------
describe('API: GET /api/org', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { GET } = await import('@/app/api/org/route');
    const res = await GET(createRequest('GET', '/api/org'));
    expect(res.status).toBe(401);
  });

  it('should return 404 when user has no organization', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      userId: 'u1',
      organizationId: null,
      orgRole: null,
    });

    const { GET } = await import('@/app/api/org/route');
    const res = await GET(createRequest('GET', '/api/org'));
    expect(res.status).toBe(404);
  });

  it('should return organization data when authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Organization = (await import('@/models/Organization')).default;
    (Organization.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'org1',
      name: 'Test Org',
      plan: 'enterprise',
      slug: 'test-org',
      toObject: () => ({ _id: 'org1', name: 'Test Org', plan: 'enterprise', slug: 'test-org' }),
    });

    const OrgMember = (await import('@/models/OrgMember')).default;
    (OrgMember.find as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ userId: 'u1', role: 'owner' }]),
    });

    const { GET } = await import('@/app/api/org/route');
    const res = await GET(createRequest('GET', '/api/org'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.name).toBe('Test Org');
    expect(data.data.currentUserRole).toBe('owner');
  });
});

// ----------------------------------------------------------------
// PUT /api/org
// ----------------------------------------------------------------
describe('API: PUT /api/org', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { PUT } = await import('@/app/api/org/route');
    const res = await PUT(createRequest('PUT', '/api/org', { name: 'New' }));
    expect(res.status).toBe(401);
  });

  it('should return 403 when user lacks permissions', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      userId: 'u2',
      organizationId: 'org1',
      orgRole: 'viewer',
    });
    const { checkPermission } = await import('@/lib/orgAuth');
    (checkPermission as ReturnType<typeof vi.fn>).mockReturnValue(false);

    const { PUT } = await import('@/app/api/org/route');
    const res = await PUT(createRequest('PUT', '/api/org', { name: 'New' }));
    expect(res.status).toBe(403);
  });

  it('should return 400 when no valid fields to update', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const { checkPermission } = await import('@/lib/orgAuth');
    (checkPermission as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const { PUT } = await import('@/app/api/org/route');
    const res = await PUT(createRequest('PUT', '/api/org', { invalidField: 'x' }));
    expect(res.status).toBe(400);
  });

  it('should update organization name successfully', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const { checkPermission } = await import('@/lib/orgAuth');
    (checkPermission as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const Organization = (await import('@/models/Organization')).default;
    (Organization.findByIdAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'org1',
      name: 'Updated Org',
      plan: 'enterprise',
    });

    const { PUT } = await import('@/app/api/org/route');
    const res = await PUT(createRequest('PUT', '/api/org', { name: 'Updated Org' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ----------------------------------------------------------------
// GET /api/org/sso
// ----------------------------------------------------------------
describe('API: GET /api/org/sso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { GET } = await import('@/app/api/org/sso/route');
    const res = await GET(createRequest('GET', '/api/org/sso'));
    expect(res.status).toBe(401);
  });

  it('should return 403 when user is not owner/admin', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      userId: 'u1',
      organizationId: 'org1',
      orgRole: 'member',
    });

    const { GET } = await import('@/app/api/org/sso/route');
    const res = await GET(createRequest('GET', '/api/org/sso'));
    expect(res.status).toBe(403);
  });

  it('should return 403 when org is not on enterprise plan', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Organization = (await import('@/models/Organization')).default;
    (Organization.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'org1',
      plan: 'free',
    });

    const { GET } = await import('@/app/api/org/sso/route');
    const res = await GET(createRequest('GET', '/api/org/sso'));
    expect(res.status).toBe(403);
  });

  it('should return SSO config on enterprise plan', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Organization = (await import('@/models/Organization')).default;
    (Organization.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'org1',
      plan: 'enterprise',
    });

    const SSOConfig = (await import('@/models/SSOConfig')).default;
    (SSOConfig.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      protocol: 'saml',
      provider: 'okta',
      entryPoint: 'https://okta.example.com',
      issuer: 'okta-issuer',
      cert: 'some-cert',
      clientId: null,
      clientSecret: null,
      discoveryUrl: null,
      autoProvision: true,
      defaultRole: 'member',
      allowedDomains: ['example.com'],
      enforceSSO: false,
      enabled: true,
    });

    const { GET } = await import('@/app/api/org/sso/route');
    const res = await GET(createRequest('GET', '/api/org/sso'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.protocol).toBe('saml');
    expect(data.data.cert).toBe('***configured***');
  });
});

// ----------------------------------------------------------------
// PUT /api/org/sso
// ----------------------------------------------------------------
describe('API: PUT /api/org/sso', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 400 for invalid protocol', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Organization = (await import('@/models/Organization')).default;
    (Organization.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'org1',
      plan: 'enterprise',
    });

    const { PUT } = await import('@/app/api/org/sso/route');
    const res = await PUT(createRequest('PUT', '/api/org/sso', { protocol: 'invalid' }));
    expect(res.status).toBe(400);
  });

  it('should return 400 when SAML enabled without entryPoint', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Organization = (await import('@/models/Organization')).default;
    (Organization.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'org1',
      plan: 'enterprise',
    });

    const { PUT } = await import('@/app/api/org/sso/route');
    const res = await PUT(createRequest('PUT', '/api/org/sso', { protocol: 'saml', enabled: true }));
    expect(res.status).toBe(400);
  });

  it('should update SSO config successfully', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Organization = (await import('@/models/Organization')).default;
    (Organization.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'org1',
      plan: 'enterprise',
    });

    const SSOConfig = (await import('@/models/SSOConfig')).default;
    (SSOConfig.findOneAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({
      protocol: 'saml',
      provider: 'okta',
      enabled: true,
      enforceSSO: false,
      allowedDomains: ['example.com'],
    });

    const { PUT } = await import('@/app/api/org/sso/route');
    const res = await PUT(
      createRequest('PUT', '/api/org/sso', {
        protocol: 'saml',
        entryPoint: 'https://idp.example.com',
        issuer: 'my-issuer',
        enabled: true,
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.protocol).toBe('saml');
  });
});

// Helper to setup domain test mocks (checkPermission + Organization must be re-mocked after clearAllMocks)
async function setupDomainMocks() {
  const { checkPermission } = await import('@/lib/orgAuth');
  (checkPermission as ReturnType<typeof vi.fn>).mockReturnValue(true);

  const Organization = (await import('@/models/Organization')).default;
  (Organization.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
    _id: 'org1',
    plan: 'enterprise',
  });
}

// ----------------------------------------------------------------
// GET /api/org/domains
// ----------------------------------------------------------------
describe('API: GET /api/org/domains', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { GET } = await import('@/app/api/org/domains/route');
    const res = await GET(createRequest('GET', '/api/org/domains'));
    expect(res.status).toBe(401);
  });

  it('should return 403 when org not on enterprise plan', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const { checkPermission } = await import('@/lib/orgAuth');
    (checkPermission as ReturnType<typeof vi.fn>).mockReturnValue(true);

    const Organization = (await import('@/models/Organization')).default;
    (Organization.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'org1',
      plan: 'pro',
    });

    const { GET } = await import('@/app/api/org/domains/route');
    const res = await GET(createRequest('GET', '/api/org/domains'));
    expect(res.status).toBe(403);
  });

  it('should return domains list on enterprise plan', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    await setupDomainMocks();

    const { getDomains } = await import('@/lib/customDomainService');
    (getDomains as ReturnType<typeof vi.fn>).mockResolvedValue([{ domain: 'chat.example.com', verified: true }]);

    const { GET } = await import('@/app/api/org/domains/route');
    const res = await GET(createRequest('GET', '/api/org/domains'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ----------------------------------------------------------------
// POST /api/org/domains
// ----------------------------------------------------------------
describe('API: POST /api/org/domains', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 400 when domain or clientId missing', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    await setupDomainMocks();

    const { POST } = await import('@/app/api/org/domains/route');
    const res = await POST(createRequest('POST', '/api/org/domains', { domain: 'chat.example.com' }));
    expect(res.status).toBe(400);
  });

  it('should create domain successfully', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    await setupDomainMocks();

    const { POST } = await import('@/app/api/org/domains/route');
    const res = await POST(
      createRequest('POST', '/api/org/domains', {
        domain: 'chat.example.com',
        clientId: 'client-1',
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ----------------------------------------------------------------
// POST /api/org/domains/[id]/verify
// ----------------------------------------------------------------
describe('API: POST /api/org/domains/[id]/verify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { POST } = await import('@/app/api/org/domains/[id]/verify/route');
    const res = await POST(createRequest('POST', '/api/org/domains/d1/verify'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(401);
  });

  it('should verify domain successfully', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    await setupDomainMocks();

    const { verifyDomain } = await import('@/lib/customDomainService');
    (verifyDomain as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'd1',
      domain: 'chat.example.com',
      verified: true,
    });

    const { POST } = await import('@/app/api/org/domains/[id]/verify/route');
    const res = await POST(createRequest('POST', '/api/org/domains/d1/verify'), {
      params: Promise.resolve({ id: 'd1' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });
});

// ----------------------------------------------------------------
// DELETE /api/org/domains/[id]
// ----------------------------------------------------------------
describe('API: DELETE /api/org/domains/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { DELETE } = await import('@/app/api/org/domains/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/org/domains/d1'), { params: Promise.resolve({ id: 'd1' }) });
    expect(res.status).toBe(401);
  });

  it('should delete domain successfully', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    await setupDomainMocks();

    const { DELETE } = await import('@/app/api/org/domains/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/org/domains/d1'), { params: Promise.resolve({ id: 'd1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it('should return 400 when delete fails', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    await setupDomainMocks();

    const { deleteDomain } = await import('@/lib/customDomainService');
    (deleteDomain as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Domain not found'));

    const { DELETE } = await import('@/app/api/org/domains/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/org/domains/d1'), { params: Promise.resolve({ id: 'd1' }) });
    expect(res.status).toBe(400);
  });
});
