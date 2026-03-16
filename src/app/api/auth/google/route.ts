import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword } from '@/lib/passwords';
import { signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/jwt';
import { successResponse, Errors } from '@/lib/apiResponse';
import { applyRateLimit } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const rateLimitError = applyRateLimit(request, 'auth');
    if (rateLimitError) return rateLimitError;

    const { credential } = await request.json();

    if (!credential) {
      return Errors.badRequest('Google credential is required');
    }

    // Verify Google ID token
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return Errors.badRequest('Invalid Google token');
    }

    const { sub: googleId, email, name, email_verified } = payload;

    await connectDB();

    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        if (email_verified) user.emailVerified = true;
        await user.save();
      }
    } else {
      user = await User.create({
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        googleId,
        authProvider: 'google',
        emailVerified: email_verified ?? false,
        plan: 'none',
        subscriptionStatus: 'trial',
        stripeCustomerId: `cus_temp_${Date.now()}`,
      });
    }

    const accessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    const refreshTokenHash = await hashPassword(refreshToken);
    user.refreshTokens.push(refreshTokenHash);
    await user.save();

    await setAuthCookies(accessToken, refreshToken);

    return successResponse(
      { userId: user._id.toString(), email: user.email, name: user.name },
      'Google authentication successful'
    );
  } catch (error) {
    console.error('Google auth error:', error);
    return Errors.internal('Google authentication failed');
  }
}
