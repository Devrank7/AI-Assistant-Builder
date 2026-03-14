import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { comparePassword, hashPassword } from '@/lib/passwords';
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/jwt';
import { successResponse, Errors } from '@/lib/apiResponse';
import { applyRateLimit } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const rateLimitError = applyRateLimit(request, 'auth');
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Errors.badRequest('Email and password are required');
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return Errors.unauthorized('Invalid email or password');
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return Errors.unauthorized('Invalid email or password');
    }

    const accessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    const refreshTokenHash = await hashPassword(refreshToken);
    user.refreshTokens.push(refreshTokenHash);
    await user.save();

    await setAuthCookies(accessToken, refreshToken);

    return successResponse(
      {
        email: user.email,
        name: user.name,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
      },
      'Login successful'
    );
  } catch (error) {
    console.error('Login error:', error);
    return Errors.internal('Login failed');
  }
}
