import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { verifyRefreshToken, clearAuthCookies } from '@/lib/jwt';
import { comparePassword } from '@/lib/passwords';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('refresh_token')?.value;

    if (refreshToken) {
      try {
        const payload = verifyRefreshToken(refreshToken);
        await connectDB();

        const user = await User.findById(payload.userId);
        if (user) {
          const updatedTokens: string[] = [];
          for (const tokenHash of user.refreshTokens) {
            const matches = await comparePassword(refreshToken, tokenHash);
            if (!matches) {
              updatedTokens.push(tokenHash);
            }
          }
          user.refreshTokens = updatedTokens;
          await user.save();
        }
      } catch {
        // Token invalid or expired — still clear cookies
      }
    }

    await clearAuthCookies();

    return successResponse(undefined, 'Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    return Errors.internal('Logout failed');
  }
}
