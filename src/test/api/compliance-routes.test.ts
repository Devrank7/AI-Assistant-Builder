import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/complianceService', () => ({
  getComplianceConfig: vi.fn(),
  updateComplianceConfig: vi.fn(),
  generateSOC2AuditReport: vi.fn(),
  generateGDPRDPA: vi.fn(),
}));

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

const mockAuth = {
  authenticated: true,
  userId: 'u1',
  organizationId: 'org1',
  orgRole: 'owner',
  user: { email: 'test@test.com' },
};
const mockUnauth = {
  authenticated: false,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

import { verifyUser } from '@/lib/auth';
import {
  getComplianceConfig,
  updateComplianceConfig,
  generateSOC2AuditReport,
  generateGDPRDPA,
} from '@/lib/complianceService';

const mockVerifyUser = vi.mocked(verifyUser);
const mockGetConfig = vi.mocked(getComplianceConfig);
const mockUpdateConfig = vi.mocked(updateComplianceConfig);
const mockGenerateSOC2 = vi.mocked(generateSOC2AuditReport);
const mockGenerateDPA = vi.mocked(generateGDPRDPA);

describe('GET /api/compliance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/compliance/route');
    const res = await GET(createRequest('GET', '/api/compliance'));
    expect(res.status).toBe(401);
  });

  it('returns compliance config for authenticated user', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const config = { gdprEnabled: true, soc2Enabled: false, dataRetentionDays: 90 };
    mockGetConfig.mockResolvedValue(config as never);

    const { GET } = await import('@/app/api/compliance/route');
    const res = await GET(createRequest('GET', '/api/compliance'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(config);
    expect(mockGetConfig).toHaveBeenCalledWith('org1');
  });

  it('uses userId as fallback when organizationId is missing', async () => {
    mockVerifyUser.mockResolvedValue({ ...mockAuth, organizationId: undefined } as never);
    mockGetConfig.mockResolvedValue({} as never);

    const { GET } = await import('@/app/api/compliance/route');
    await GET(createRequest('GET', '/api/compliance'));
    expect(mockGetConfig).toHaveBeenCalledWith('u1');
  });

  it('returns 500 when service throws', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockGetConfig.mockRejectedValue(new Error('DB error'));

    const { GET } = await import('@/app/api/compliance/route');
    const res = await GET(createRequest('GET', '/api/compliance'));
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/compliance', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { PUT } = await import('@/app/api/compliance/route');
    const res = await PUT(createRequest('PUT', '/api/compliance', { gdprEnabled: true }));
    expect(res.status).toBe(401);
  });

  it('updates compliance config', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const updated = { gdprEnabled: true, soc2Enabled: true };
    mockUpdateConfig.mockResolvedValue(updated as never);

    const { PUT } = await import('@/app/api/compliance/route');
    const res = await PUT(createRequest('PUT', '/api/compliance', { gdprEnabled: true, soc2Enabled: true }));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(updated);
    expect(json.message).toBe('Compliance config updated');
  });

  it('returns 500 when update throws', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockUpdateConfig.mockRejectedValue(new Error('fail'));

    const { PUT } = await import('@/app/api/compliance/route');
    const res = await PUT(createRequest('PUT', '/api/compliance', {}));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/compliance/audit-export', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/compliance/audit-export/route');
    const res = await POST(createRequest('POST', '/api/compliance/audit-export'));
    expect(res.status).toBe(401);
  });

  it('generates SOC2 audit report', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const report = { reportId: 'rpt1', url: 'https://example.com/report.pdf', generatedAt: '2024-01-01' };
    mockGenerateSOC2.mockResolvedValue(report as never);

    const { POST } = await import('@/app/api/compliance/audit-export/route');
    const res = await POST(createRequest('POST', '/api/compliance/audit-export'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(report);
    expect(mockGenerateSOC2).toHaveBeenCalledWith('org1');
  });

  it('returns 500 on service failure', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockGenerateSOC2.mockRejectedValue(new Error('fail'));

    const { POST } = await import('@/app/api/compliance/audit-export/route');
    const res = await POST(createRequest('POST', '/api/compliance/audit-export'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/compliance/dpa', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/compliance/dpa/route');
    const res = await POST(
      createRequest('POST', '/api/compliance/dpa', { companyName: 'Test', address: '123 St', dpoEmail: 'dpo@test.com' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/compliance/dpa/route');

    const res = await POST(createRequest('POST', '/api/compliance/dpa', { companyName: 'Test' }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.success).toBe(false);
    expect(json.error).toContain('companyName, address, and dpoEmail are required');
  });

  it('generates GDPR DPA document', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const dpa = { documentId: 'dpa1', url: 'https://example.com/dpa.pdf' };
    mockGenerateDPA.mockResolvedValue(dpa as never);

    const { POST } = await import('@/app/api/compliance/dpa/route');
    const body = { companyName: 'Acme', address: '123 Main St', dpoEmail: 'dpo@acme.com' };
    const res = await POST(createRequest('POST', '/api/compliance/dpa', body));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(dpa);
    expect(mockGenerateDPA).toHaveBeenCalledWith('org1', body);
  });

  it('returns 400 when companyName is empty string', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/compliance/dpa/route');
    const res = await POST(
      createRequest('POST', '/api/compliance/dpa', { companyName: '', address: '123 St', dpoEmail: 'dpo@test.com' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 500 on service failure', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockGenerateDPA.mockRejectedValue(new Error('fail'));

    const { POST } = await import('@/app/api/compliance/dpa/route');
    const body = { companyName: 'Acme', address: '123 Main St', dpoEmail: 'dpo@acme.com' };
    const res = await POST(createRequest('POST', '/api/compliance/dpa', body));
    expect(res.status).toBe(500);
  });
});
