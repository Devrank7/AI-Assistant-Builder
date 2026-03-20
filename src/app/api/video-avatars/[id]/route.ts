import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { getAvatarById, updateAvatar, deleteAvatar } from '@/lib/videoAvatarService';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const avatar = await getAvatarById(id);
    if (!avatar) return Errors.notFound('Avatar not found');

    return successResponse(avatar);
  } catch (error) {
    console.error('Get video avatar error:', error);
    return Errors.internal('Failed to fetch avatar');
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const body = await request.json();

    const avatar = await updateAvatar(id, body);
    if (!avatar) return Errors.notFound('Avatar not found');

    return successResponse(avatar, 'Avatar updated');
  } catch (error) {
    console.error('Update video avatar error:', error);
    return Errors.internal('Failed to update avatar');
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const { id } = await params;
    const avatar = await deleteAvatar(id);
    if (!avatar) return Errors.notFound('Avatar not found');

    return successResponse(null, 'Avatar deleted');
  } catch (error) {
    console.error('Delete video avatar error:', error);
    return Errors.internal('Failed to delete avatar');
  }
}
