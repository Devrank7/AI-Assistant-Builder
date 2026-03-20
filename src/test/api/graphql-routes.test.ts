import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/apiKeyAuth', () => ({
  verifyApiKey: vi.fn(),
}));
vi.mock('@/lib/graphql/executor', () => ({
  executeQuery: vi.fn(),
}));

function createRequest(method: string, url: string, body?: unknown, headers?: Record<string, string>) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...headers } }
      : { headers }),
  });
}

const mockAuthOk = { authenticated: true, userId: 'u1', organizationId: 'org1' };
const mockAuthFail = {
  authenticated: false,
  response: new Response(JSON.stringify({ success: false, error: 'Invalid API key' }), { status: 401 }),
};

import { verifyApiKey } from '@/lib/apiKeyAuth';
import { executeQuery } from '@/lib/graphql/executor';

const mockVerifyApiKey = vi.mocked(verifyApiKey);
const mockExecuteQuery = vi.mocked(executeQuery);

describe('POST /api/v2/graphql', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when API key is invalid', async () => {
    mockVerifyApiKey.mockResolvedValue(mockAuthFail as never);
    const { POST } = await import('@/app/api/v2/graphql/route');
    const res = await POST(createRequest('POST', '/api/v2/graphql', { query: '{ clients { id } }' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when query field is missing', async () => {
    mockVerifyApiKey.mockResolvedValue(mockAuthOk as never);
    const { POST } = await import('@/app/api/v2/graphql/route');
    const res = await POST(createRequest('POST', '/api/v2/graphql', { variables: {} }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Missing or invalid "query" field');
  });

  it('returns 400 when query is not a string', async () => {
    mockVerifyApiKey.mockResolvedValue(mockAuthOk as never);
    const { POST } = await import('@/app/api/v2/graphql/route');
    const res = await POST(createRequest('POST', '/api/v2/graphql', { query: 123 }));
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Missing or invalid "query" field');
  });

  it('executes valid GraphQL query', async () => {
    mockVerifyApiKey.mockResolvedValue(mockAuthOk as never);
    const result = { data: { clients: [{ id: 'c1', name: 'Client 1' }] } };
    mockExecuteQuery.mockResolvedValue(result as never);

    const { POST } = await import('@/app/api/v2/graphql/route');
    const res = await POST(
      createRequest('POST', '/api/v2/graphql', {
        query: '{ clients { id name } }',
        variables: { limit: 10 },
      })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toEqual(result);
    expect(mockExecuteQuery).toHaveBeenCalledWith(
      '{ clients { id name } }',
      { limit: 10 },
      { userId: 'u1', organizationId: 'org1' }
    );
  });

  it('passes empty variables when not provided', async () => {
    mockVerifyApiKey.mockResolvedValue(mockAuthOk as never);
    mockExecuteQuery.mockResolvedValue({ data: {} } as never);

    const { POST } = await import('@/app/api/v2/graphql/route');
    await POST(createRequest('POST', '/api/v2/graphql', { query: '{ me { id } }' }));

    expect(mockExecuteQuery).toHaveBeenCalledWith('{ me { id } }', {}, { userId: 'u1', organizationId: 'org1' });
  });

  it('returns 500 when executor throws', async () => {
    mockVerifyApiKey.mockResolvedValue(mockAuthOk as never);
    mockExecuteQuery.mockRejectedValue(new Error('Syntax error in query'));

    const { POST } = await import('@/app/api/v2/graphql/route');
    const res = await POST(createRequest('POST', '/api/v2/graphql', { query: '{ invalid' }));
    const json = await res.json();

    expect(res.status).toBe(500);
    expect(json.error).toBe('Syntax error in query');
  });
});
