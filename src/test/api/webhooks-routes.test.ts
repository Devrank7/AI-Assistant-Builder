import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/webhookService', () => ({
  generateWebhookSecret: vi.fn().mockReturnValue('whsec_test_secret_123'),
}));
vi.mock('@/lib/whatsappService', () => ({
  processWhatsAppWebhook: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/instagramService', () => ({
  processGlobalInstagramWebhook: vi.fn().mockResolvedValue(false),
  processInstagramWebhook: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/models/Webhook', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnValue({ sort: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    findOne: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
    deleteOne: vi.fn(),
  };
  return { default: mockModel };
});
vi.mock('@/models/Client', () => {
  const mockModel: Record<string, unknown> = {
    find: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue([]) }) }),
    findOne: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }) }),
  };
  return { default: mockModel };
});

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
import Webhook from '@/models/Webhook';
import Client from '@/models/Client';

const mockVerifyUser = vi.mocked(verifyUser);

// ─── GET /api/webhooks/manage ───────────────────────────────────────
describe('GET /api/webhooks/manage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/webhooks/manage/route');
    const res = await GET(createRequest('GET', '/api/webhooks/manage'));
    expect(res.status).toBe(401);
  });

  it('returns webhooks for user clients', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([{ clientId: 'c1' }]),
      }),
    } as never);
    const webhooks = [{ _id: 'wh1', clientId: 'c1', url: 'https://example.com/hook', events: ['message'] }];
    vi.mocked(Webhook.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(webhooks),
        }),
      }),
    } as never);

    const { GET } = await import('@/app/api/webhooks/manage/route');
    const res = await GET(createRequest('GET', '/api/webhooks/manage'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.webhooks).toEqual(webhooks);
    expect(json.data.total).toBe(1);
  });

  it('returns empty list when user has no clients', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    } as never);
    vi.mocked(Webhook.find).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as never);

    const { GET } = await import('@/app/api/webhooks/manage/route');
    const res = await GET(createRequest('GET', '/api/webhooks/manage'));
    const json = await res.json();
    expect(json.data.total).toBe(0);
  });
});

// ─── POST /api/webhooks/manage ──────────────────────────────────────
describe('POST /api/webhooks/manage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/webhooks/manage/route');
    const res = await POST(
      createRequest('POST', '/api/webhooks/manage', { clientId: 'c1', url: 'https://x.com', events: ['m'] })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when missing required fields', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/webhooks/manage/route');
    const res = await POST(createRequest('POST', '/api/webhooks/manage', { clientId: 'c1' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('required');
  });

  it('returns 400 for invalid URL format', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/webhooks/manage/route');
    const res = await POST(
      createRequest('POST', '/api/webhooks/manage', {
        clientId: 'c1',
        url: 'not-a-url',
        events: ['message'],
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 403 when client not owned by user', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    } as never);

    const { POST } = await import('@/app/api/webhooks/manage/route');
    const res = await POST(
      createRequest('POST', '/api/webhooks/manage', {
        clientId: 'c1',
        url: 'https://example.com/hook',
        events: ['message'],
      })
    );
    expect(res.status).toBe(403);
  });

  it('returns 400 when max 5 webhooks exceeded', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'c1' }),
      }),
    } as never);
    vi.mocked(Webhook.countDocuments).mockResolvedValue(5 as never);

    const { POST } = await import('@/app/api/webhooks/manage/route');
    const res = await POST(
      createRequest('POST', '/api/webhooks/manage', {
        clientId: 'c1',
        url: 'https://example.com/hook',
        events: ['message'],
      })
    );
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('Maximum 5');
  });

  it('creates webhook and returns secret (shown once)', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Client.findOne).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ clientId: 'c1' }),
      }),
    } as never);
    vi.mocked(Webhook.countDocuments).mockResolvedValue(0 as never);
    vi.mocked(Webhook.create).mockResolvedValue({
      _id: 'wh1',
      clientId: 'c1',
      url: 'https://example.com/hook',
      events: ['message'],
      secret: 'whsec_test_secret_123',
      isActive: true,
      toObject: () => ({
        _id: 'wh1',
        clientId: 'c1',
        url: 'https://example.com/hook',
        events: ['message'],
        secret: 'whsec_test_secret_123',
        isActive: true,
      }),
    } as never);

    const { POST } = await import('@/app/api/webhooks/manage/route');
    const res = await POST(
      createRequest('POST', '/api/webhooks/manage', {
        clientId: 'c1',
        url: 'https://example.com/hook',
        events: ['message'],
      })
    );
    const json = await res.json();
    expect(res.status).toBe(201);
    expect(json.data.secret).toBe('whsec_test_secret_123');
    expect(json.data.webhook._id).toBe('wh1');
  });
});

// ─── PATCH /api/webhooks/manage/[id] ────────────────────────────────
describe('PATCH /api/webhooks/manage/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { PATCH } = await import('@/app/api/webhooks/manage/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/webhooks/manage/wh1', { isActive: false }), {
      params: Promise.resolve({ id: 'wh1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when webhook not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Webhook.findOne).mockResolvedValue(null as never);

    const { PATCH } = await import('@/app/api/webhooks/manage/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/webhooks/manage/wh1', { isActive: false }), {
      params: Promise.resolve({ id: 'wh1' }),
    });
    expect(res.status).toBe(404);
  });

  it('updates webhook URL and events', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const webhook = {
      _id: 'wh1',
      url: 'https://old.com',
      events: ['message'],
      isActive: true,
      userId: 'u1',
      save: vi.fn().mockResolvedValue(true),
      toObject: () => ({ _id: 'wh1', url: 'https://new.com', events: ['message', 'lead'], isActive: true }),
    };
    vi.mocked(Webhook.findOne).mockResolvedValue(webhook as never);

    const { PATCH } = await import('@/app/api/webhooks/manage/[id]/route');
    const res = await PATCH(
      createRequest('PATCH', '/api/webhooks/manage/wh1', { url: 'https://new.com', events: ['message', 'lead'] }),
      { params: Promise.resolve({ id: 'wh1' }) }
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toContain('updated');
    expect(webhook.save).toHaveBeenCalled();
  });

  it('returns 400 for invalid URL in update', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const webhook = { _id: 'wh1', userId: 'u1', save: vi.fn() };
    vi.mocked(Webhook.findOne).mockResolvedValue(webhook as never);

    const { PATCH } = await import('@/app/api/webhooks/manage/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/webhooks/manage/wh1', { url: 'bad-url' }), {
      params: Promise.resolve({ id: 'wh1' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 for empty events array', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const webhook = { _id: 'wh1', userId: 'u1', save: vi.fn() };
    vi.mocked(Webhook.findOne).mockResolvedValue(webhook as never);

    const { PATCH } = await import('@/app/api/webhooks/manage/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/webhooks/manage/wh1', { events: [] }), {
      params: Promise.resolve({ id: 'wh1' }),
    });
    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/webhooks/manage/[id] ───────────────────────────────
describe('DELETE /api/webhooks/manage/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { DELETE } = await import('@/app/api/webhooks/manage/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/webhooks/manage/wh1'), {
      params: Promise.resolve({ id: 'wh1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when webhook not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Webhook.deleteOne).mockResolvedValue({ deletedCount: 0 } as never);

    const { DELETE } = await import('@/app/api/webhooks/manage/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/webhooks/manage/wh1'), {
      params: Promise.resolve({ id: 'wh1' }),
    });
    expect(res.status).toBe(404);
  });

  it('deletes webhook successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(Webhook.deleteOne).mockResolvedValue({ deletedCount: 1 } as never);

    const { DELETE } = await import('@/app/api/webhooks/manage/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/webhooks/manage/wh1'), {
      params: Promise.resolve({ id: 'wh1' }),
    });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.message).toContain('deleted');
  });
});

// ─── POST /api/webhooks/whatsapp ────────────────────────────────────
describe('POST /api/webhooks/whatsapp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always returns 200 for incoming messages (Meta requirement)', async () => {
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const res = await POST(
      createRequest('POST', '/api/webhooks/whatsapp', {
        entry: [{ changes: [{ value: { messages: [{ from: '123', text: { body: 'Hello' } }] } }] }],
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });

  it('returns 200 even on processing errors', async () => {
    const { POST } = await import('@/app/api/webhooks/whatsapp/route');
    const res = await POST(createRequest('POST', '/api/webhooks/whatsapp', {}));
    expect(res.status).toBe(200);
  });
});

// ─── GET /api/webhooks/whatsapp (verification) ─────────────────────
describe('GET /api/webhooks/whatsapp', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifies webhook with correct token', async () => {
    const { GET } = await import('@/app/api/webhooks/whatsapp/route');
    const res = await GET(
      createRequest(
        'GET',
        '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=winbix_whatsapp_verify&hub.challenge=challenge123'
      )
    );
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toBe('challenge123');
  });

  it('returns 403 for invalid verify token', async () => {
    const { GET } = await import('@/app/api/webhooks/whatsapp/route');
    const res = await GET(
      createRequest('GET', '/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token')
    );
    expect(res.status).toBe(403);
  });
});

// ─── POST /api/webhooks/instagram ───────────────────────────────────
describe('POST /api/webhooks/instagram', () => {
  beforeEach(() => vi.clearAllMocks());

  it('always returns 200 for incoming messages', async () => {
    const { POST } = await import('@/app/api/webhooks/instagram/route');
    const res = await POST(
      createRequest('POST', '/api/webhooks/instagram', {
        entry: [{ messaging: [{ sender: { id: '123' }, message: { text: 'Hi' } }] }],
      })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
  });
});

// ─── GET /api/webhooks/instagram (verification) ────────────────────
describe('GET /api/webhooks/instagram', () => {
  beforeEach(() => vi.clearAllMocks());

  it('verifies webhook with correct token', async () => {
    const { GET } = await import('@/app/api/webhooks/instagram/route');
    const res = await GET(
      createRequest(
        'GET',
        '/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=winbix_instagram_verify&hub.challenge=test_challenge'
      )
    );
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toBe('test_challenge');
  });

  it('returns 403 for invalid verify token', async () => {
    const { GET } = await import('@/app/api/webhooks/instagram/route');
    const res = await GET(
      createRequest('GET', '/api/webhooks/instagram?hub.mode=subscribe&hub.verify_token=bad_token')
    );
    expect(res.status).toBe(403);
  });
});
