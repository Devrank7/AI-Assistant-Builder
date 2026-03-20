import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

vi.mock('@/lib/mongodb', () => ({
  default: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));

vi.mock('@/models/Client', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn(),
  },
}));

vi.mock('@/models/Contact', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    findOne: vi.fn(),
    countDocuments: vi.fn().mockResolvedValue(0),
  },
}));

vi.mock('@/models/Conversation', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  },
}));

vi.mock('@/models/Event', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([]),
      }),
    }),
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
// GET /api/contacts
// ----------------------------------------------------------------
describe('API: GET /api/contacts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { GET } = await import('@/app/api/contacts/route');
    const res = await GET(createRequest('GET', '/api/contacts'));
    expect(res.status).toBe(401);
  });

  it('should return empty contacts when user has no clients', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Client = (await import('@/models/Client')).default;
    (Client.find as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    });

    const { GET } = await import('@/app/api/contacts/route');
    const res = await GET(createRequest('GET', '/api/contacts'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.contacts).toEqual([]);
    expect(data.data.total).toBe(0);
  });

  it('should return paginated contacts with filters', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Client = (await import('@/models/Client')).default;
    (Client.find as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ clientId: 'c1' }]),
    });

    const Contact = (await import('@/models/Contact')).default;
    (Contact.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (Contact.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ contactId: 'ct1', name: 'John', email: 'john@test.com', leadScore: 85 }]),
        }),
      }),
    });

    const { GET } = await import('@/app/api/contacts/route');
    const res = await GET(createRequest('GET', '/api/contacts?clientId=c1&minScore=50&page=1&limit=10'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.total).toBe(1);
    expect(data.data.page).toBe(1);
  });

  it('should support search parameter', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Client = (await import('@/models/Client')).default;
    (Client.find as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ clientId: 'c1' }]),
    });

    const Contact = (await import('@/models/Contact')).default;
    (Contact.countDocuments as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (Contact.find as ReturnType<typeof vi.fn>).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const { GET } = await import('@/app/api/contacts/route');
    const res = await GET(createRequest('GET', '/api/contacts?search=john'));
    expect(res.status).toBe(200);
  });
});

// ----------------------------------------------------------------
// GET /api/contacts/[id]
// ----------------------------------------------------------------
describe('API: GET /api/contacts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { GET } = await import('@/app/api/contacts/[id]/route');
    const res = await GET(createRequest('GET', '/api/contacts/ct1'), { params: Promise.resolve({ id: 'ct1' }) });
    expect(res.status).toBe(401);
  });

  it('should return 404 when contact not found', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Contact = (await import('@/models/Contact')).default;
    (Contact.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import('@/app/api/contacts/[id]/route');
    const res = await GET(createRequest('GET', '/api/contacts/ct1'), { params: Promise.resolve({ id: 'ct1' }) });
    expect(res.status).toBe(404);
  });

  it('should return 404 when user does not own the contact', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Contact = (await import('@/models/Contact')).default;
    (Contact.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      contactId: 'ct1',
      clientId: 'c1',
    });

    const Client = (await import('@/models/Client')).default;
    (Client.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { GET } = await import('@/app/api/contacts/[id]/route');
    const res = await GET(createRequest('GET', '/api/contacts/ct1'), { params: Promise.resolve({ id: 'ct1' }) });
    expect(res.status).toBe(404);
  });

  it('should return contact detail with timeline and conversations', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Contact = (await import('@/models/Contact')).default;
    (Contact.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      contactId: 'ct1',
      clientId: 'c1',
      name: 'John Doe',
      email: 'john@test.com',
    });

    const Client = (await import('@/models/Client')).default;
    (Client.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      clientId: 'c1',
      organizationId: 'org1',
    });

    const { GET } = await import('@/app/api/contacts/[id]/route');
    const res = await GET(createRequest('GET', '/api/contacts/ct1'), { params: Promise.resolve({ id: 'ct1' }) });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.contact.name).toBe('John Doe');
  });
});

// ----------------------------------------------------------------
// PATCH /api/contacts/[id]
// ----------------------------------------------------------------
describe('API: PATCH /api/contacts/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { PATCH } = await import('@/app/api/contacts/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/contacts/ct1', { name: 'New Name' }), {
      params: Promise.resolve({ id: 'ct1' }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 404 when contact not found', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Contact = (await import('@/models/Contact')).default;
    (Contact.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { PATCH } = await import('@/app/api/contacts/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/contacts/ct1', { name: 'New Name' }), {
      params: Promise.resolve({ id: 'ct1' }),
    });
    expect(res.status).toBe(404);
  });

  it('should update contact fields successfully', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const savedContact = {
      contactId: 'ct1',
      clientId: 'c1',
      name: 'Updated',
      tags: ['vip'],
      save: vi.fn().mockResolvedValue(undefined),
    };

    const Contact = (await import('@/models/Contact')).default;
    (Contact.findOne as ReturnType<typeof vi.fn>).mockResolvedValue(savedContact);

    const Client = (await import('@/models/Client')).default;
    (Client.findOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      clientId: 'c1',
      organizationId: 'org1',
    });

    const { PATCH } = await import('@/app/api/contacts/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/contacts/ct1', { name: 'Updated', tags: ['vip'] }), {
      params: Promise.resolve({ id: 'ct1' }),
    });
    expect(res.status).toBe(200);
    expect(savedContact.save).toHaveBeenCalled();
  });
});

// ----------------------------------------------------------------
// GET /api/contacts/stats
// ----------------------------------------------------------------
describe('API: GET /api/contacts/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 when not authenticated', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthFailure());

    const { GET } = await import('@/app/api/contacts/stats/route');
    const res = await GET(createRequest('GET', '/api/contacts/stats'));
    expect(res.status).toBe(401);
  });

  it('should return contact stats', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Client = (await import('@/models/Client')).default;
    (Client.find as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ clientId: 'c1' }]),
    });

    const Contact = (await import('@/models/Contact')).default;
    (Contact.countDocuments as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(100) // total
      .mockResolvedValueOnce(20) // hot
      .mockResolvedValueOnce(30) // warm
      .mockResolvedValueOnce(50) // cold
      .mockResolvedValueOnce(5); // newToday

    const { GET } = await import('@/app/api/contacts/stats/route');
    const res = await GET(createRequest('GET', '/api/contacts/stats'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.total).toBe(100);
    expect(data.data.hot).toBe(20);
    expect(data.data.warm).toBe(30);
    expect(data.data.cold).toBe(50);
    expect(data.data.newToday).toBe(5);
  });

  it('should filter stats by clientId', async () => {
    const { verifyUser } = await import('@/lib/auth');
    (verifyUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockAuthSuccess());

    const Client = (await import('@/models/Client')).default;
    (Client.find as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ clientId: 'c1' }, { clientId: 'c2' }]),
    });

    const Contact = (await import('@/models/Contact')).default;
    (Contact.countDocuments as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(1);

    const { GET } = await import('@/app/api/contacts/stats/route');
    const res = await GET(createRequest('GET', '/api/contacts/stats?clientId=c1'));
    expect(res.status).toBe(200);
  });
});
