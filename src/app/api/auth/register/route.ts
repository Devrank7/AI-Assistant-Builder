import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword, validatePassword } from '@/lib/passwords';
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/jwt';
import { successResponse, Errors } from '@/lib/apiResponse';
import { applyRateLimit } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const rateLimitError = applyRateLimit(request, 'auth');
    if (rateLimitError) return rateLimitError;

    const body = await request.json();
    const { email, password, name } = body;

    if (!email || !name || !password) {
      return Errors.badRequest('Email, password, and name are required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Errors.badRequest('Invalid email format');
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return Errors.badRequest(passwordError);
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return Errors.badRequest('User already exists');
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash,
      name,
      plan: 'none',
      subscriptionStatus: 'trial',
      stripeCustomerId: `cus_temp_${Date.now()}`,
    });

    const accessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    const refreshTokenHash = await hashPassword(refreshToken);
    user.refreshTokens.push(refreshTokenHash);
    await user.save();

    await setAuthCookies(accessToken, refreshToken);

    return successResponse(
      { userId: user._id.toString(), email: user.email, name: user.name },
      'Registration successful',
      201
    );
  } catch (error) {
    console.error('Register error:', error);
    return Errors.internal('Registration failed');
  }
}
