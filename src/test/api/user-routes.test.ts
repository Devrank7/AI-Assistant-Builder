import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));

vi.mock('@/models/User', () => ({
  default: {
    findByIdAndUpdate: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        email: 'test@example.com',
        name: 'Test User',
        plan: 'free',
        subscriptionStatus: 'active',
        emailVerified: true,
      }),
    }),
    findById: vi.fn(),
    find: vi.fn(),
  },
}));

vi.mock('@/models/Client', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([]),
        lean: vi.fn().mockResolvedValue([]),
      }),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn(),
    deleteOne: vi.fn(),
  },
}));

vi.mock('@/models/ChatLog', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue([]),
    }),
  },
}));

vi.mock('@/models/Notification', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
    updateMany: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
    updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
  },
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
    user: { _id: 'u1', email: 'test@example.com' },
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
// PUT /api/user/profile
// ----------------------------------------------------------------
describe('API: PUT /api/user/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { PUT } = await import('@/app/api/user/profile/route');
    const res = await PUT(createRequest('PUT', '/api/user/profile', { name: 'New' }));
    expect(res.status).toBe(401);
  });

  it('should return 400 when name is missing', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const { PUT } = await import('@/app/api/user/profile/route');
    const res = await PUT(createRequest('PUT', '/api/user/profile', {}));
    expect(res.status).toBe(400);
  });

  it('should return 400 when name is too long', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const { PUT } = await import('@/app/api/user/profile/route');
    const res = await PUT(createRequest('PUT', '/api/user/profile', { name: 'A'.repeat(101) }));
    expect(res.status).toBe(400);
  });

  it('should update profile successfully', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const { PUT } = await import('@/app/api/user/profile/route');
    const res = await PUT(createRequest('PUT', '/api/user/profile', { name: 'Updated Name' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.email).toBe('test@example.com');
  });

  it('should return 404 when user not found', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const User = (await import('@/models/User')).default;
    (User.findByIdAndUpdate as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    });

    const { PUT } = await import('@/app/api/user/profile/route');
    const res = await PUT(createRequest('PUT', '/api/user/profile', { name: 'Test' }));
    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// GET /api/user/widgets
// ----------------------------------------------------------------
describe('API: GET /api/user/widgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { GET } = await import('@/app/api/user/widgets/route');
    const res = await GET(createRequest('GET', '/api/user/widgets'));
    expect(res.status).toBe(401);
  });

  it('should return widgets list when authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Client = (await import('@/models/Client')).default;
    (Client.find as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue([
          {
            clientId: 'c1',
            username: 'Widget 1',
            clientType: 'quick',
            widgetType: 'ai_chat',
            website: 'https://example.com',
            createdAt: new Date(),
          },
        ]),
      }),
    });

    const { GET } = await import('@/app/api/user/widgets/route');
    const res = await GET(createRequest('GET', '/api/user/widgets'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].clientId).toBe('c1');
  });
});

// ----------------------------------------------------------------
// DELETE /api/user/widgets
// ----------------------------------------------------------------
describe('API: DELETE /api/user/widgets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 400 when clientId is missing', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const { DELETE } = await import('@/app/api/user/widgets/route');
    const res = await DELETE(createRequest('DELETE', '/api/user/widgets', {}));
    expect(res.status).toBe(400);
  });

  it('should return 404 when widget not found', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Client = (await import('@/models/Client')).default;
    (Client.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { DELETE } = await import('@/app/api/user/widgets/route');
    const res = await DELETE(createRequest('DELETE', '/api/user/widgets', { clientId: 'nonexistent' }));
    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// POST /api/user/activate-free
// ----------------------------------------------------------------
describe('API: POST /api/user/activate-free', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { POST } = await import('@/app/api/user/activate-free/route');
    const res = await POST(createRequest('POST', '/api/user/activate-free'));
    expect(res.status).toBe(401);
  });

  it('should activate free plan when user has no plan', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const User = (await import('@/models/User')).default;
    (User.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'u1',
      plan: 'none',
      save: vi.fn().mockResolvedValue(undefined),
    });

    const { POST } = await import('@/app/api/user/activate-free/route');
    const res = await POST(createRequest('POST', '/api/user/activate-free'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.plan).toBe('free');
  });

  it('should return success with current plan if user already has a plan', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const User = (await import('@/models/User')).default;
    (User.findById as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'u1',
      plan: 'pro',
    });

    const { POST } = await import('@/app/api/user/activate-free/route');
    const res = await POST(createRequest('POST', '/api/user/activate-free'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.plan).toBe('pro');
  });

  it('should return 404 when user not found', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const User = (await import('@/models/User')).default;
    (User.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { POST } = await import('@/app/api/user/activate-free/route');
    const res = await POST(createRequest('POST', '/api/user/activate-free'));
    expect(res.status).toBe(404);
  });
});

// ----------------------------------------------------------------
// GET /api/user/analytics
// ----------------------------------------------------------------
describe('API: GET /api/user/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { GET } = await import('@/app/api/user/analytics/route');
    const res = await GET(createRequest('GET', '/api/user/analytics'));
    expect(res.status).toBe(401);
  });

  it('should return empty analytics when user has no widgets', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Client = (await import('@/models/Client')).default;
    (Client.find as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([]),
      }),
    });

    const { GET } = await import('@/app/api/user/analytics/route');
    const res = await GET(createRequest('GET', '/api/user/analytics'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.totalWidgets).toBe(0);
    expect(data.data.totalChats).toBe(0);
  });

  it('should return analytics data with chat logs', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Client = (await import('@/models/Client')).default;
    (Client.find as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi
          .fn()
          .mockResolvedValue([{ clientId: 'c1', username: 'Widget 1', clientType: 'quick', createdAt: new Date() }]),
      }),
    });

    const ChatLog = (await import('@/models/ChatLog')).default;
    (ChatLog.find as ReturnType<typeof vi.fn>).mockReturnValue({
      lean: vi.fn().mockResolvedValue([
        {
          clientId: 'c1',
          createdAt: new Date(),
          messages: [
            { role: 'user', content: 'Hello', timestamp: new Date() },
            { role: 'assistant', content: 'Hi!', timestamp: new Date() },
          ],
          metadata: { channel: 'website' },
        },
      ]),
    });

    const { GET } = await import('@/app/api/user/analytics/route');
    const res = await GET(createRequest('GET', '/api/user/analytics'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.totalWidgets).toBe(1);
    expect(data.data.totalChats).toBe(1);
    expect(data.data.totalMessages).toBe(2);
  });
});

// ----------------------------------------------------------------
// GET /api/user/notifications
// ----------------------------------------------------------------
describe('API: GET /api/user/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { GET } = await import('@/app/api/user/notifications/route');
    const res = await GET(createRequest('GET', '/api/user/notifications'));
    expect(res.status).toBe(401);
  });

  it('should return notifications when authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Notification = (await import('@/models/Notification')).default;
    (Notification.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ _id: 'n1', type: 'info', message: 'Test notification', isRead: false }]),
      }),
    });

    const { GET } = await import('@/app/api/user/notifications/route');
    const res = await GET(createRequest('GET', '/api/user/notifications'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
  });
});

// ----------------------------------------------------------------
// PATCH /api/user/notifications
// ----------------------------------------------------------------
describe('API: PATCH /api/user/notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should mark all notifications as read', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const { PATCH } = await import('@/app/api/user/notifications/route');
    const res = await PATCH(createRequest('PATCH', '/api/user/notifications', { action: 'mark_all_read' }));
    expect(res.status).toBe(200);
  });

  it('should mark single notification as read', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const { PATCH } = await import('@/app/api/user/notifications/route');
    const res = await PATCH(
      createRequest('PATCH', '/api/user/notifications', {
        action: 'mark_read',
        notificationId: 'n1',
      })
    );
    expect(res.status).toBe(200);
  });
});

// ----------------------------------------------------------------
// POST /api/user/onboarding
// ----------------------------------------------------------------
describe('API: POST /api/user/onboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { POST } = await import('@/app/api/user/onboarding/route');
    const res = await POST(createRequest('POST', '/api/user/onboarding', { niche: 'dental' }));
    expect(res.status).toBe(401);
  });

  it('should complete onboarding successfully', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const User = (await import('@/models/User')).default;
    (User.findByIdAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'u1',
      onboardingCompleted: true,
    });

    const { POST } = await import('@/app/api/user/onboarding/route');
    const res = await POST(createRequest('POST', '/api/user/onboarding', { niche: 'dental' }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.onboardingCompleted).toBe(true);
  });

  it('should complete onboarding without niche', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const User = (await import('@/models/User')).default;
    (User.findByIdAndUpdate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _id: 'u1',
      onboardingCompleted: true,
    });

    const { POST } = await import('@/app/api/user/onboarding/route');
    const res = await POST(createRequest('POST', '/api/user/onboarding', {}));
    expect(res.status).toBe(200);
  });
});
