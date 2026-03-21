import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { listAvatars, createAvatar } from '@/lib/videoAvatarService';
import { requirePlanFeature } from '@/lib/planLimits';
import type { Plan } from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const planErr = requirePlanFeature(auth.user.plan as Plan, 'voice_ai', 'Video Avatars');
    if (planErr) return Errors.forbidden(planErr);

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

    const planErrPost = requirePlanFeature(auth.user.plan as Plan, 'voice_ai', 'Video Avatars');
    if (planErrPost) return Errors.forbidden(planErrPost);

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
