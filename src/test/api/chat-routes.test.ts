import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/channelRouter', () => ({
  routeMessage: vi.fn(),
  routeMessageStream: vi.fn(),
}));

vi.mock('@/models/Client', () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock('@/models/User', () => ({
  default: {
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
  },
}));

vi.mock('@/lib/planLimits', () => ({
  checkMessageLimit: vi.fn().mockResolvedValue({ allowed: true, used: 10, limit: 1000 }),
}));

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

// ----------------------------------------------------------------
// POST /api/chat
// ----------------------------------------------------------------
describe('API: POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 400 when clientId is missing', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(createRequest('POST', '/api/chat', { message: 'Hello' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('should return 400 when message is missing', async () => {
    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(createRequest('POST', '/api/chat', { clientId: 'c1' }));
    expect(res.status).toBe(400);
  });

  it('should return 429 when routeMessage fails (rate limit)', async () => {
    const { routeMessage } = await import('@/lib/channelRouter');
    (routeMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: false,
      error: 'Rate limit exceeded',
    });

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(
      createRequest('POST', '/api/chat', {
        clientId: 'c1',
        message: 'Hello',
        sessionId: 's1',
      })
    );
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('should return successful chat response', async () => {
    const { routeMessage } = await import('@/lib/channelRouter');
    (routeMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      response: 'Hello! How can I help?',
      richBlocks: [],
      model: 'gemini-pro',
      inputTokens: 10,
      outputTokens: 20,
      costUsd: 0.001,
    });

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(
      createRequest('POST', '/api/chat', {
        clientId: 'c1',
        message: 'Hello',
        sessionId: 's1',
      })
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.response).toBe('Hello! How can I help?');
    expect(data.tokensUsed.total).toBe(30);
  });

  it('should return 500 on internal error', async () => {
    const { routeMessage } = await import('@/lib/channelRouter');
    (routeMessage as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('AI service down'));

    const { POST } = await import('@/app/api/chat/route');
    const res = await POST(createRequest('POST', '/api/chat', { clientId: 'c1', message: 'Hello' }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});

// ----------------------------------------------------------------
// POST /api/chat/stream
// ----------------------------------------------------------------
describe('API: POST /api/chat/stream', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 400 when clientId is missing', async () => {
    const { POST } = await import('@/app/api/chat/stream/route');
    const res = await POST(createRequest('POST', '/api/chat/stream', { message: 'Hello' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.success).toBe(false);
  });

  it('should return 400 when message is missing', async () => {
    const { POST } = await import('@/app/api/chat/stream/route');
    const res = await POST(createRequest('POST', '/api/chat/stream', { clientId: 'c1' }));
    expect(res.status).toBe(400);
  });

  it('should return 429 when message limit exceeded', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ clientId: 'c1', userId: 'u1' }),
    });

    const User = (await import('@/models/User')).default;
    (User.findById as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue({ _id: 'u1', plan: 'free' }),
    });

    const { checkMessageLimit } = await import('@/lib/planLimits');
    (checkMessageLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      used: 500,
      limit: 500,
    });

    const { POST } = await import('@/app/api/chat/stream/route');
    const res = await POST(createRequest('POST', '/api/chat/stream', { clientId: 'c1', message: 'Hello' }));
    expect(res.status).toBe(429);
    const data = await res.json();
    expect(data.error).toBe('MESSAGE_LIMIT_EXCEEDED');
  });

  it('should return stream response on success', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const { routeMessageStream } = await import('@/lib/channelRouter');
    const mockStream = new ReadableStream();
    (routeMessageStream as ReturnType<typeof vi.fn>).mockResolvedValue({
      stream: mockStream,
      error: null,
    });

    const { POST } = await import('@/app/api/chat/stream/route');
    const res = await POST(
      createRequest('POST', '/api/chat/stream', {
        clientId: 'c1',
        message: 'Hello',
        sessionId: 's1',
      })
    );
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
  });

  it('should return error when stream route fails', async () => {
    const Client = (await import('@/models/Client')).default;
    (Client.findOne as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    });

    const { routeMessageStream } = await import('@/lib/channelRouter');
    (routeMessageStream as ReturnType<typeof vi.fn>).mockResolvedValue({
      stream: null,
      error: 'Service unavailable',
      status: 503,
    });

    const { POST } = await import('@/app/api/chat/stream/route');
    const res = await POST(createRequest('POST', '/api/chat/stream', { clientId: 'c1', message: 'Hello' }));
    expect(res.status).toBe(503);
    const data = await res.json();
    expect(data.success).toBe(false);
  });
});
