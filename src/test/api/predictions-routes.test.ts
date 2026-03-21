import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/predictiveEngagement', () => ({
  calculateExitProbability: vi.fn(),
  generateNudgeMessage: vi.fn(),
  recordPrediction: vi.fn(),
  listPredictions: vi.fn(),
  getAccuracyStats: vi.fn(),
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
  calculateExitProbability,
  generateNudgeMessage,
  recordPrediction,
  listPredictions,
  getAccuracyStats,
} from '@/lib/predictiveEngagement';

const mockVerifyUser = vi.mocked(verifyUser);
const mockCalcExit = vi.mocked(calculateExitProbability);
const mockGenNudge = vi.mocked(generateNudgeMessage);
const mockRecord = vi.mocked(recordPrediction);
const mockList = vi.mocked(listPredictions);
const mockAccuracy = vi.mocked(getAccuracyStats);

describe('GET /api/predictions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/predictions/route');
    const res = await GET(createRequest('GET', '/api/predictions?clientId=c1'));
    expect(res.status).toBe(401);
  });

  it('returns empty array when clientId missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { GET } = await import('@/app/api/predictions/route');
    const res = await GET(createRequest('GET', '/api/predictions'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it('returns list of predictions', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const predictions = [{ _id: 'p1', exitProbability: 0.75, recommendedAction: 'nudge' }];
    mockList.mockResolvedValue(predictions as never);

    const { GET } = await import('@/app/api/predictions/route');
    const res = await GET(createRequest('GET', '/api/predictions?clientId=c1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(predictions);
    expect(mockList).toHaveBeenCalledWith('c1');
  });

  it('returns 500 on service failure', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockList.mockRejectedValue(new Error('fail'));

    const { GET } = await import('@/app/api/predictions/route');
    const res = await GET(createRequest('GET', '/api/predictions?clientId=c1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/predictions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/predictions/route');
    const res = await POST(
      createRequest('POST', '/api/predictions', {
        clientId: 'c1',
        visitorId: 'v1',
        sessionId: 's1',
        signals: {},
      })
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when required fields missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/predictions/route');

    const res = await POST(createRequest('POST', '/api/predictions', { clientId: 'c1', visitorId: 'v1' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('clientId, visitorId, sessionId, and signals are required');
  });

  it('records prediction with nudge message when action is not none', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const prediction = { exitProbability: 0.85, engagementScore: 20, recommendedAction: 'nudge' };
    mockCalcExit.mockReturnValue(prediction as never);
    mockGenNudge.mockReturnValue('Hey, need help?' as never);
    const saved = { _id: 'p1', ...prediction, nudgeMessage: 'Hey, need help?' };
    mockRecord.mockResolvedValue(saved as never);

    const { POST } = await import('@/app/api/predictions/route');
    const res = await POST(
      createRequest('POST', '/api/predictions', {
        clientId: 'c1',
        visitorId: 'v1',
        sessionId: 's1',
        signals: { mouseSpeed: 100 },
        pageContext: '/pricing',
      })
    );
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.message).toBe('Prediction recorded');
    expect(mockGenNudge).toHaveBeenCalledWith('c1', 20, '/pricing');
  });

  it('records prediction without nudge when action is none', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const prediction = { exitProbability: 0.1, engagementScore: 80, recommendedAction: 'none' };
    mockCalcExit.mockReturnValue(prediction as never);
    mockRecord.mockResolvedValue({ _id: 'p1', ...prediction } as never);

    const { POST } = await import('@/app/api/predictions/route');
    const res = await POST(
      createRequest('POST', '/api/predictions', {
        clientId: 'c1',
        visitorId: 'v1',
        sessionId: 's1',
        signals: { mouseSpeed: 10 },
      })
    );

    expect(res.status).toBe(201);
    expect(mockGenNudge).not.toHaveBeenCalled();
  });

  it('returns 500 on service failure', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockCalcExit.mockImplementation(() => {
      throw new Error('fail');
    });

    const { POST } = await import('@/app/api/predictions/route');
    const res = await POST(
      createRequest('POST', '/api/predictions', {
        clientId: 'c1',
        visitorId: 'v1',
        sessionId: 's1',
        signals: {},
      })
    );
    expect(res.status).toBe(500);
  });
});

describe('GET /api/predictions/accuracy', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/predictions/accuracy/route');
    const res = await GET(createRequest('GET', '/api/predictions/accuracy?clientId=c1'));
    expect(res.status).toBe(401);
  });

  it('returns defaults when clientId missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { GET } = await import('@/app/api/predictions/accuracy/route');
    const res = await GET(createRequest('GET', '/api/predictions/accuracy'));
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual({ avgEngagement: 0, interventions: 0, accuracy: 0 });
  });

  it('returns accuracy stats', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const stats = { accuracy: 0.82, totalPredictions: 150, correctPredictions: 123 };
    mockAccuracy.mockResolvedValue(stats as never);

    const { GET } = await import('@/app/api/predictions/accuracy/route');
    const res = await GET(createRequest('GET', '/api/predictions/accuracy?clientId=c1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(stats);
  });

  it('returns 500 on service failure', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockAccuracy.mockRejectedValue(new Error('fail'));

    const { GET } = await import('@/app/api/predictions/accuracy/route');
    const res = await GET(createRequest('GET', '/api/predictions/accuracy?clientId=c1'));
    expect(res.status).toBe(500);
  });
});
