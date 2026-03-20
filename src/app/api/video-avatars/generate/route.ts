import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { generateVideoResponse } from '@/lib/videoAvatarService';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { avatarId, text } = await request.json();
    if (!avatarId || !text) {
      return Errors.badRequest('avatarId and text are required');
    }

    const result = await generateVideoResponse(avatarId, text);
    return successResponse(result);
  } catch (error) {
    console.error('Generate video error:', error);
    return Errors.internal('Failed to generate video');
  }
}
