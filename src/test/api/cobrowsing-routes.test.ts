import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/coBrowsingService', () => ({
  getActiveSessions: vi.fn(),
  createSession: vi.fn(),
  getSessionById: vi.fn(),
  addHighlight: vi.fn(),
  updateScroll: vi.fn(),
  endSession: vi.fn(),
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
  getActiveSessions,
  createSession,
  getSessionById,
  addHighlight,
  updateScroll,
  endSession,
} from '@/lib/coBrowsingService';

const mockVerifyUser = vi.mocked(verifyUser);
const mockGetSessions = vi.mocked(getActiveSessions);
const mockCreateSession = vi.mocked(createSession);
const mockGetSessionById = vi.mocked(getSessionById);
const mockAddHighlight = vi.mocked(addHighlight);
const mockUpdateScroll = vi.mocked(updateScroll);
const mockEndSession = vi.mocked(endSession);

describe('GET /api/cobrowsing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/cobrowsing/route');
    const res = await GET(createRequest('GET', '/api/cobrowsing'));
    expect(res.status).toBe(401);
  });

  it('returns active sessions', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const sessions = [{ _id: 's1', status: 'active' }];
    mockGetSessions.mockResolvedValue(sessions as never);

    const { GET } = await import('@/app/api/cobrowsing/route');
    const res = await GET(createRequest('GET', '/api/cobrowsing'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(sessions);
    expect(mockGetSessions).toHaveBeenCalledWith('u1');
  });

  it('returns 500 on service failure', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockGetSessions.mockRejectedValue(new Error('fail'));

    const { GET } = await import('@/app/api/cobrowsing/route');
    const res = await GET(createRequest('GET', '/api/cobrowsing'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/cobrowsing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/cobrowsing/route');
    const res = await POST(createRequest('POST', '/api/cobrowsing', { clientId: 'c1', visitorId: 'v1' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId or visitorId missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/cobrowsing/route');

    const res = await POST(createRequest('POST', '/api/cobrowsing', { clientId: 'c1' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('clientId and visitorId are required');
  });

  it('creates co-browsing session with status 201', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const session = { _id: 's1', clientId: 'c1', visitorId: 'v1', status: 'active' };
    mockCreateSession.mockResolvedValue(session as never);

    const { POST } = await import('@/app/api/cobrowsing/route');
    const res = await POST(createRequest('POST', '/api/cobrowsing', { clientId: 'c1', visitorId: 'v1' }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.message).toBe('Co-browsing session created');
    expect(mockCreateSession).toHaveBeenCalledWith('c1', 'v1', 'u1');
  });

  it('returns 500 on service failure', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockCreateSession.mockRejectedValue(new Error('fail'));

    const { POST } = await import('@/app/api/cobrowsing/route');
    const res = await POST(createRequest('POST', '/api/cobrowsing', { clientId: 'c1', visitorId: 'v1' }));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/cobrowsing/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await GET(createRequest('GET', '/api/cobrowsing/s1'), { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when session not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockGetSessionById.mockResolvedValue(null as never);

    const { GET } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await GET(createRequest('GET', '/api/cobrowsing/s1'), { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(404);
  });

  it('returns session by id', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const session = { _id: 's1', status: 'active', highlights: [] };
    mockGetSessionById.mockResolvedValue(session as never);

    const { GET } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await GET(createRequest('GET', '/api/cobrowsing/s1'), { params: Promise.resolve({ id: 's1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(session);
  });
});

describe('PATCH /api/cobrowsing/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { PATCH } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/cobrowsing/s1', { highlight: { selector: '.btn' } }), {
      params: Promise.resolve({ id: 's1' }),
    });
    expect(res.status).toBe(401);
  });

  it('adds highlight to session', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const highlight = { selector: '.btn', label: 'Click here', color: '#FFEB3B' };
    mockAddHighlight.mockResolvedValue({ highlights: [highlight] } as never);

    const { PATCH } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await PATCH(
      createRequest('PATCH', '/api/cobrowsing/s1', { highlight: { selector: '.btn', label: 'Click here' } }),
      { params: Promise.resolve({ id: 's1' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(mockAddHighlight).toHaveBeenCalledWith('s1', '.btn', 'Click here', '#FFEB3B');
  });

  it('returns 404 when adding highlight to ended session', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockAddHighlight.mockResolvedValue(null as never);

    const { PATCH } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/cobrowsing/s1', { highlight: { selector: '.btn' } }), {
      params: Promise.resolve({ id: 's1' }),
    });
    expect(res.status).toBe(404);
  });

  it('updates scroll position', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockUpdateScroll.mockResolvedValue(undefined as never);

    const { PATCH } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/cobrowsing/s1', { scrollPosition: { x: 0, y: 500 } }), {
      params: Promise.resolve({ id: 's1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Scroll position updated');
    expect(mockUpdateScroll).toHaveBeenCalledWith('s1', 0, 500);
  });

  it('returns 400 when neither highlight nor scrollPosition provided', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);

    const { PATCH } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/cobrowsing/s1', { foo: 'bar' }), {
      params: Promise.resolve({ id: 's1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Provide highlight or scrollPosition');
  });
});

describe('DELETE /api/cobrowsing/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { DELETE } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/cobrowsing/s1'), { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when session not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockEndSession.mockResolvedValue(null as never);

    const { DELETE } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/cobrowsing/s1'), { params: Promise.resolve({ id: 's1' }) });
    expect(res.status).toBe(404);
  });

  it('ends session successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockEndSession.mockResolvedValue({ _id: 's1', status: 'ended' } as never);

    const { DELETE } = await import('@/app/api/cobrowsing/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/cobrowsing/s1'), { params: Promise.resolve({ id: 's1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Session ended');
  });
});
