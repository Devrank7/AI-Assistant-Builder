import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/videoAvatarService', () => ({
  listAvatars: vi.fn(),
  createAvatar: vi.fn(),
  getAvatarById: vi.fn(),
  updateAvatar: vi.fn(),
  deleteAvatar: vi.fn(),
  generateVideoResponse: vi.fn(),
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
  listAvatars,
  createAvatar,
  getAvatarById,
  updateAvatar,
  deleteAvatar,
  generateVideoResponse,
} from '@/lib/videoAvatarService';

const mockVerifyUser = vi.mocked(verifyUser);
const mockListAvatars = vi.mocked(listAvatars);
const mockCreateAvatar = vi.mocked(createAvatar);
const mockGetAvatarById = vi.mocked(getAvatarById);
const mockDeleteAvatar = vi.mocked(deleteAvatar);
const mockGenerateVideo = vi.mocked(generateVideoResponse);

describe('GET /api/video-avatars', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/video-avatars/route');
    const res = await GET(createRequest('GET', '/api/video-avatars?clientId=c1'));
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { GET } = await import('@/app/api/video-avatars/route');
    const res = await GET(createRequest('GET', '/api/video-avatars'));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('clientId is required');
  });

  it('returns list of avatars', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const avatars = [{ _id: 'a1', name: 'Avatar 1' }];
    mockListAvatars.mockResolvedValue(avatars as never);

    const { GET } = await import('@/app/api/video-avatars/route');
    const res = await GET(createRequest('GET', '/api/video-avatars?clientId=c1'));
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(avatars);
    expect(mockListAvatars).toHaveBeenCalledWith('c1');
  });

  it('returns 500 on service failure', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockListAvatars.mockRejectedValue(new Error('fail'));

    const { GET } = await import('@/app/api/video-avatars/route');
    const res = await GET(createRequest('GET', '/api/video-avatars?clientId=c1'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/video-avatars', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/video-avatars/route');
    const res = await POST(createRequest('POST', '/api/video-avatars', { clientId: 'c1', name: 'Avatar' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when clientId or name missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/video-avatars/route');

    const res = await POST(createRequest('POST', '/api/video-avatars', { name: 'Avatar' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('clientId and name are required');
  });

  it('creates avatar with status 201', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const avatar = { _id: 'a1', name: 'Avatar', provider: 'heygen' };
    mockCreateAvatar.mockResolvedValue(avatar as never);

    const { POST } = await import('@/app/api/video-avatars/route');
    const res = await POST(createRequest('POST', '/api/video-avatars', { clientId: 'c1', name: 'Avatar' }));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.message).toBe('Avatar created');
    expect(json.data).toEqual(avatar);
  });

  it('uses default values for optional fields', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockCreateAvatar.mockResolvedValue({} as never);

    const { POST } = await import('@/app/api/video-avatars/route');
    await POST(createRequest('POST', '/api/video-avatars', { clientId: 'c1', name: 'Test' }));

    expect(mockCreateAvatar).toHaveBeenCalledWith(
      'c1',
      expect.objectContaining({
        name: 'Test',
        provider: 'heygen',
        style: 'professional',
        gender: 'neutral',
      })
    );
  });
});

describe('GET /api/video-avatars/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/video-avatars/[id]/route');
    const res = await GET(createRequest('GET', '/api/video-avatars/a1'), { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(401);
  });

  it('returns 404 when avatar not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockGetAvatarById.mockResolvedValue(null as never);

    const { GET } = await import('@/app/api/video-avatars/[id]/route');
    const res = await GET(createRequest('GET', '/api/video-avatars/a1'), { params: Promise.resolve({ id: 'a1' }) });
    expect(res.status).toBe(404);
  });

  it('returns avatar by id', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const avatar = { _id: 'a1', name: 'Avatar 1' };
    mockGetAvatarById.mockResolvedValue(avatar as never);

    const { GET } = await import('@/app/api/video-avatars/[id]/route');
    const res = await GET(createRequest('GET', '/api/video-avatars/a1'), { params: Promise.resolve({ id: 'a1' }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(avatar);
  });
});

describe('DELETE /api/video-avatars/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { DELETE } = await import('@/app/api/video-avatars/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/video-avatars/a1'), {
      params: Promise.resolve({ id: 'a1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when avatar not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockDeleteAvatar.mockResolvedValue(null as never);

    const { DELETE } = await import('@/app/api/video-avatars/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/video-avatars/a1'), {
      params: Promise.resolve({ id: 'a1' }),
    });
    expect(res.status).toBe(404);
  });

  it('deletes avatar successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockDeleteAvatar.mockResolvedValue({ _id: 'a1' } as never);

    const { DELETE } = await import('@/app/api/video-avatars/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/video-avatars/a1'), {
      params: Promise.resolve({ id: 'a1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Avatar deleted');
  });
});

describe('POST /api/video-avatars/generate', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/video-avatars/generate/route');
    const res = await POST(createRequest('POST', '/api/video-avatars/generate', { avatarId: 'a1', text: 'Hello' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when avatarId or text missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/video-avatars/generate/route');

    const res = await POST(createRequest('POST', '/api/video-avatars/generate', { avatarId: 'a1' }));
    const json = await res.json();
    expect(res.status).toBe(400);
    expect(json.error).toContain('avatarId and text are required');
  });

  it('generates video response', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const result = { videoUrl: 'https://example.com/video.mp4', duration: 12.5 };
    mockGenerateVideo.mockResolvedValue(result as never);

    const { POST } = await import('@/app/api/video-avatars/generate/route');
    const res = await POST(
      createRequest('POST', '/api/video-avatars/generate', { avatarId: 'a1', text: 'Hello world' })
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(result);
    expect(mockGenerateVideo).toHaveBeenCalledWith('a1', 'Hello world');
  });

  it('returns 500 on generation failure', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockGenerateVideo.mockRejectedValue(new Error('Generation failed'));

    const { POST } = await import('@/app/api/video-avatars/generate/route');
    const res = await POST(createRequest('POST', '/api/video-avatars/generate', { avatarId: 'a1', text: 'Hello' }));
    expect(res.status).toBe(500);
  });
});
