import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { hashPassword } from '@/lib/passwords';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://winbixai.com';

  try {
    const code = request.nextUrl.searchParams.get('code');
    const error = request.nextUrl.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL('/?auth_error=cancelled', baseUrl));
    }

    if (!code) {
      return NextResponse.redirect(new URL('/?auth_error=no_code', baseUrl));
    }

    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXTAUTH_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.id_token) {
      console.error('Google token exchange failed:', tokenData);
      return NextResponse.redirect(new URL('/?auth_error=token_exchange', baseUrl));
    }

    // Decode ID token to get user info
    console.log('[Google OAuth] Step 1: Verifying ID token...');
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: tokenData.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return NextResponse.redirect(new URL('/?auth_error=invalid_token', baseUrl));
    }

    const { sub: googleId, email, name, email_verified } = payload;
    console.log(
      '[Google OAuth] Step 2: Token verified, email:',
      email,
      'name:',
      name,
      'email_verified:',
      email_verified
    );

    await connectDB();
    console.log('[Google OAuth] Step 3: DB connected');

    let user = await User.findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }],
    });

    if (user) {
      console.log('[Google OAuth] Step 4: Existing user found');
      let needsSave = false;
      if (!user.googleId) {
        user.googleId = googleId;
        user.authProvider = 'google';
        needsSave = true;
      }
      if (email_verified && !user.emailVerified) {
        user.emailVerified = true;
        needsSave = true;
      }
      if (!user.name && name) {
        user.name = name;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
        console.log('[Google OAuth] Step 4a: Updated user - name:', user.name, 'emailVerified:', user.emailVerified);
      } else {
        console.log(
          '[Google OAuth] Step 4a: No updates needed - name:',
          user.name,
          'emailVerified:',
          user.emailVerified
        );
      }
    } else {
      console.log('[Google OAuth] Step 4: Creating new user...');
      user = await User.create({
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        googleId,
        authProvider: 'google',
        emailVerified: email_verified ?? false,
        plan: 'free',
        subscriptionStatus: 'trial',
        stripeCustomerId: `cus_temp_${Date.now()}`,
      });
      console.log('[Google OAuth] Step 4b: User created');

      // Auto-create organization for new user
      const Organization = (await import('@/models/Organization')).default;
      const OrgMember = (await import('@/models/OrgMember')).default;
      const { PLAN_LIMITS } = await import('@/models/Organization');

      const org = await Organization.create({
        name: `${user.name}'s Organization`,
        ownerId: user._id.toString(),
        plan: 'free',
        stripeCustomerId: user.stripeCustomerId,
        limits: PLAN_LIMITS.free,
      });

      await OrgMember.create({
        organizationId: org._id.toString(),
        userId: user._id.toString(),
        role: 'owner',
      });

      user.organizationId = org._id.toString();
      await user.save();
    }

    console.log('[Google OAuth] Step 5: Signing tokens...');
    const accessToken = signAccessToken({ userId: user._id.toString(), email: user.email });
    const refreshToken = signRefreshToken({ userId: user._id.toString() });

    const refreshTokenHash = await hashPassword(refreshToken);
    user.refreshTokens.push(refreshTokenHash);
    await user.save();
    console.log('[Google OAuth] Step 6: Tokens saved, redirecting to dashboard');

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    const redirectResponse = NextResponse.redirect(new URL('/dashboard', baseUrl));
    redirectResponse.cookies.set('access_token', accessToken, { ...cookieOptions, maxAge: 15 * 60 });
    redirectResponse.cookies.set('refresh_token', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 });

    return redirectResponse;
  } catch (err) {
    console.error('Google callback error:', err);
    return NextResponse.redirect(new URL('/?auth_error=server_error', baseUrl));
  }
}
