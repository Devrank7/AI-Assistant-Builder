import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyRefreshToken, signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/jwt';
import { comparePassword, hashPassword } from '@/lib/passwords';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      return Errors.unauthorized('No refresh token provided');
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return Errors.unauthorized('Invalid or expired refresh token');
    }

    await connectDB();

    const user = await User.findById(payload.userId);
    if (!user) {
      return Errors.unauthorized('User not found');
    }

    // Find and remove old token
    let tokenFound = false;
    const updatedTokens: string[] = [];
    for (const tokenHash of user.refreshTokens) {
      const matches = await comparePassword(refreshToken, tokenHash);
      if (matches) {
        tokenFound = true;
        // Skip — removing old token
      } else {
        updatedTokens.push(tokenHash);
      }
    }

    if (!tokenFound) {
      return Errors.unauthorized('Refresh token not recognized');
    }

    // Issue new tokens (rotation)
    const newAccessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const newRefreshToken = signRefreshToken({ userId: user._id.toString() });

    const newRefreshTokenHash = await hashPassword(newRefreshToken);
    updatedTokens.push(newRefreshTokenHash);
    user.refreshTokens = updatedTokens;
    await user.save();

    await setAuthCookies(newAccessToken, newRefreshToken);

    return successResponse(undefined, 'Token refreshed successfully');
  } catch (error) {
    console.error('Refresh error:', error);
    return Errors.internal('Token refresh failed');
  }
}
