import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    const adminToken = process.env.ADMIN_SECRET_TOKEN;

    if (!adminToken) {
      return NextResponse.json({ success: false, error: 'Admin token not configured' }, { status: 500 });
    }

    if (token.length === adminToken.length && timingSafeEqual(Buffer.from(token), Buffer.from(adminToken))) {
      // Create response with success
      const response = NextResponse.json({
        success: true,
        message: 'Admin authenticated successfully',
      });

      // Set httpOnly cookie for admin session
      response.cookies.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return response;
    } else {
      return NextResponse.json({ success: false, error: 'Invalid admin token' }, { status: 401 });
    }
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ success: false, error: 'Authentication failed' }, { status: 500 });
  }
}
