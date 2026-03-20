import { NextRequest, NextResponse } from 'next/server';
import { Errors } from '@/lib/apiResponse';
import {
  getSSOConfigByDomain,
  getSSOConfig,
  validateSAMLResponse,
  validateOIDCToken,
  provisionSSOUser,
} from '@/lib/ssoService';
import { signAccessToken, signRefreshToken } from '@/lib/jwt';
import connectDB from '@/lib/mongodb';
import SSOConfig from '@/models/SSOConfig';

async function handleSSOCallback(request: NextRequest, body: Record<string, string>) {
  try {
    const samlResponse = body.SAMLResponse;
    const code = body.code;
    const state = body.state;
    const orgId = body.organizationId || body.RelayState;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://winbixai.com';
    const callbackUrl = `${baseUrl}/api/auth/sso/callback`;

    let email = '';
    let name = '';
    let config = null;

    await connectDB();

    if (samlResponse) {
      // SAML flow — find config by trying all enabled configs
      const allConfigs = await SSOConfig.find({ protocol: 'saml', enabled: true });
      for (const c of allConfigs) {
        const result = await validateSAMLResponse(c, samlResponse);
        if (result) {
          email = result.email;
          name = result.name;
          config = c;
          break;
        }
      }
    } else if (code) {
      // OIDC flow — need to find the right config
      if (orgId) {
        config = await getSSOConfig(orgId);
      }
      if (!config) {
        // Try all OIDC configs
        const allConfigs = await SSOConfig.find({ protocol: 'oidc', enabled: true });
        config = allConfigs[0] || null;
      }
      if (config) {
        const result = await validateOIDCToken(config, code, callbackUrl);
        if (result) {
          email = result.email;
          name = result.name;
        }
      }
    }

    if (!email || !config) {
      return NextResponse.redirect(`${baseUrl}/login?error=sso_failed`);
    }

    // Provision or find the user
    const provisioned = await provisionSSOUser(config, email, name);
    if (!provisioned) {
      return NextResponse.redirect(`${baseUrl}/login?error=sso_domain_rejected`);
    }

    // Create JWT tokens
    const accessToken = signAccessToken({ userId: provisioned.userId, email });
    const refreshToken = signRefreshToken({ userId: provisioned.userId });

    // Set cookies and redirect to dashboard
    const response = NextResponse.redirect(`${baseUrl}/dashboard`);
    response.cookies.set('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });
    response.cookies.set('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (err) {
    console.error('SSO callback error:', err);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://winbixai.com';
    return NextResponse.redirect(`${baseUrl}/login?error=sso_error`);
  }
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';
  let body: Record<string, string> = {};

  if (contentType.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    formData.forEach((value, key) => {
      body[key] = value.toString();
    });
  } else {
    body = await request.json();
  }

  return handleSSOCallback(request, body);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const body: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    body[key] = value;
  });

  return handleSSOCallback(request, body);
}
