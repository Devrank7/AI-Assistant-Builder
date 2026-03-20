import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/trainingStudio', () => ({
  addTrainingExample: vi.fn(),
  applyTrainingExamples: vi.fn(),
  importFromCorrections: vi.fn(),
  getTrainingStats: vi.fn(),
}));
vi.mock('@/models/TrainingExample', () => {
  const mock: Record<string, unknown> = {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndDelete: vi.fn(),
    countDocuments: vi.fn(),
  };
  return { default: mock };
});
vi.mock('@/models/Client', () => {
  const mock: Record<string, unknown> = {
    findOne: vi.fn(),
  };
  return { default: mock };
});

import { verifyUser } from '@/lib/auth';
import {
  addTrainingExample,
  applyTrainingExamples,
  importFromCorrections,
  getTrainingStats,
} from '@/lib/trainingStudio';
import TrainingExample from '@/models/TrainingExample';
import Client from '@/models/Client';

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

const mockAuth = {
  authenticated: true as const,
  userId: 'u1',
  user: { email: 'test@test.com', plan: 'pro', subscriptionStatus: 'active' },
  organizationId: 'org1',
  orgRole: 'owner',
};

const mockUnauth = {
  authenticated: false as const,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ========== GET /api/training ==========
describe('GET /api/training', () => {
  let GET: typeof import('@/app/api/training/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/training/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('GET', '/api/training?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('GET', '/api/training');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when user does not own client', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockResolvedValue(null);
    const req = createRequest('GET', '/api/training?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 200 with paginated training examples', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockResolvedValue({ _id: 'x' } as never);
    const examples = [{ _id: 't1', userMessage: 'Hi', idealResponse: 'Hello' }];
    vi.mocked(TrainingExample.find).mockReturnValue({
      sort: vi
        .fn()
        .mockReturnValue({
          skip: vi
            .fn()
            .mockReturnValue({ limit: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(examples) }) }),
        }),
    } as never);
    vi.mocked(TrainingExample.countDocuments).mockResolvedValue(1 as never);
    const req = createRequest('GET', '/api/training?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.examples).toHaveLength(1);
    expect(json.data.total).toBe(1);
  });
});

// ========== POST /api/training ==========
describe('POST /api/training', () => {
  let POST: typeof import('@/app/api/training/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/training/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('POST', '/api/training', { clientId: 'c1', userMessage: 'Hi', idealResponse: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields are missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/training', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when user does not own client', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockResolvedValue(null);
    const req = createRequest('POST', '/api/training', { clientId: 'c1', userMessage: 'Hi', idealResponse: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful creation', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockResolvedValue({ _id: 'x' } as never);
    vi.mocked(addTrainingExample).mockResolvedValue({ _id: 't1', userMessage: 'Hi', idealResponse: 'Hello' } as never);
    const req = createRequest('POST', '/api/training', { clientId: 'c1', userMessage: 'Hi', idealResponse: 'Hello' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });
});

// ========== PATCH /api/training/[id] ==========
describe('PATCH /api/training/[id]', () => {
  let PATCH: typeof import('@/app/api/training/[id]/route').PATCH;

  beforeEach(async () => {
    ({ PATCH } = await import('@/app/api/training/[id]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('PATCH', '/api/training/t1', { status: 'approved' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when example not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(TrainingExample.findById).mockResolvedValue(null);
    const req = createRequest('PATCH', '/api/training/t1', { status: 'approved' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 403 when user does not own client', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(TrainingExample.findById).mockResolvedValue({ _id: 't1', clientId: 'c1' } as never);
    vi.mocked(Client.findOne).mockResolvedValue(null);
    const req = createRequest('PATCH', '/api/training/t1', { status: 'approved' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful update and sets reviewedBy for approved status', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const example = { _id: 't1', clientId: 'c1', reviewedBy: null, save: vi.fn() };
    vi.mocked(TrainingExample.findById).mockResolvedValue(example as never);
    vi.mocked(Client.findOne).mockResolvedValue({ _id: 'x' } as never);
    const req = createRequest('PATCH', '/api/training/t1', { status: 'approved' });
    const res = await PATCH(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(200);
    expect(example.reviewedBy).toBe('u1');
    expect(example.save).toHaveBeenCalled();
  });
});

// ========== DELETE /api/training/[id] ==========
describe('DELETE /api/training/[id]', () => {
  let DELETE: typeof import('@/app/api/training/[id]/route').DELETE;

  beforeEach(async () => {
    ({ DELETE } = await import('@/app/api/training/[id]/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('DELETE', '/api/training/t1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when example not found', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(TrainingExample.findById).mockResolvedValue(null);
    const req = createRequest('DELETE', '/api/training/t1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(404);
  });

  it('returns 200 on successful deletion', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(TrainingExample.findById).mockResolvedValue({ _id: 't1', clientId: 'c1' } as never);
    vi.mocked(Client.findOne).mockResolvedValue({ _id: 'x' } as never);
    vi.mocked(TrainingExample.findByIdAndDelete).mockResolvedValue({ _id: 't1' } as never);
    const req = createRequest('DELETE', '/api/training/t1');
    const res = await DELETE(req, { params: Promise.resolve({ id: 't1' }) });
    expect(res.status).toBe(200);
    expect(TrainingExample.findByIdAndDelete).toHaveBeenCalledWith('t1');
  });
});

// ========== POST /api/training/apply ==========
describe('POST /api/training/apply', () => {
  let POST: typeof import('@/app/api/training/apply/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/training/apply/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('POST', '/api/training/apply', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/training/apply', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when user does not own client', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockResolvedValue(null);
    const req = createRequest('POST', '/api/training/apply', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns 200 on successful apply', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockResolvedValue({ _id: 'x' } as never);
    vi.mocked(applyTrainingExamples).mockResolvedValue({ applied: 5, skipped: 2 } as never);
    const req = createRequest('POST', '/api/training/apply', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('Applied 5');
  });
});

// ========== POST /api/training/import ==========
describe('POST /api/training/import', () => {
  let POST: typeof import('@/app/api/training/import/route').POST;

  beforeEach(async () => {
    ({ POST } = await import('@/app/api/training/import/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('POST', '/api/training/import', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('POST', '/api/training/import', {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 200 on successful import', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockResolvedValue({ _id: 'x' } as never);
    vi.mocked(importFromCorrections).mockResolvedValue({ imported: 3, duplicates: 1 } as never);
    const req = createRequest('POST', '/api/training/import', { clientId: 'c1' });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('Imported 3');
  });
});

// ========== GET /api/training/stats ==========
describe('GET /api/training/stats', () => {
  let GET: typeof import('@/app/api/training/stats/route').GET;

  beforeEach(async () => {
    ({ GET } = await import('@/app/api/training/stats/route'));
  });

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockUnauth);
    const req = createRequest('GET', '/api/training/stats?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId is missing', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    const req = createRequest('GET', '/api/training/stats');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns 403 when user does not own client', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockResolvedValue(null);
    const req = createRequest('GET', '/api/training/stats?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('returns 200 with stats data', async () => {
    vi.mocked(verifyUser).mockResolvedValue(mockAuth);
    vi.mocked(Client.findOne).mockResolvedValue({ _id: 'x' } as never);
    vi.mocked(getTrainingStats).mockResolvedValue({ total: 20, approved: 15, pending: 5 } as never);
    const req = createRequest('GET', '/api/training/stats?clientId=c1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.total).toBe(20);
  });
});
