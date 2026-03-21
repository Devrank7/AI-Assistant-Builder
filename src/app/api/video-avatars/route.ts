import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { listAvatars, createAvatar } from '@/lib/videoAvatarService';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const clientId = request.nextUrl.searchParams.get('clientId');
    if (!clientId) return successResponse([]);

    const avatars = await listAvatars(clientId);
    return successResponse(avatars);
  } catch (error) {
    console.error('Get video avatars error:', error);
    return Errors.internal('Failed to fetch video avatars');
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { clientId, name, provider, style, gender, language, voiceId, avatarUrl, apiConfig } = body;

    if (!clientId || !name) {
      return Errors.badRequest('clientId and name are required');
    }

    const avatar = await createAvatar(clientId, {
      name,
      provider: provider || 'heygen',
      style: style || 'professional',
      gender: gender || 'neutral',
      language,
      voiceId,
      avatarUrl,
      apiConfig,
    });

    return successResponse(avatar, 'Avatar created', 201);
  } catch (error) {
    console.error('Create video avatar error:', error);
    return Errors.internal('Failed to create avatar');
  }
}
