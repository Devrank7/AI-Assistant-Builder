// src/app/api/user/playground/avatar/[clientId]/route.ts

import { NextRequest } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    await connectDB();
    const { clientId } = await params;

    const client = await Client.findOne({ clientId, userId: auth.userId }).lean();
    if (!client) return Errors.forbidden('Not your widget');

    const formData = await request.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) return Errors.badRequest('No avatar file provided');
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Errors.badRequest('File must be PNG, JPEG, or WebP');
    }
    if (file.size > MAX_SIZE) {
      return Errors.badRequest('File must be under 2MB');
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Resize to 128x128 and convert to PNG using sharp
    const sharp = (await import('sharp')).default;
    const resized = await sharp(buffer).resize(128, 128, { fit: 'cover' }).png().toBuffer();

    const avatarDir = path.join(process.cwd(), 'public', 'avatars');
    await mkdir(avatarDir, { recursive: true });
    const avatarPath = path.join(avatarDir, `${clientId}.png`);
    await writeFile(avatarPath, resized);

    return successResponse({ url: `/avatars/${clientId}.png` });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return Errors.internal('Failed to upload avatar');
  }
}
