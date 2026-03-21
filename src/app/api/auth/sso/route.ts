import { NextRequest, NextResponse } from 'next/server';
import { successResponse, Errors } from '@/lib/apiResponse';
import {
  getSSOConfigByDomain,
  getSSOConfigByOrgSlug,
  buildSAMLRedirectUrl,
  buildOIDCRedirectUrl,
} from '@/lib/ssoService';
import { randomBytes } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, orgSlug } = body;

    if (!email && !orgSlug) {
      return Errors.badRequest('Either email or orgSlug is required');
    }

    let config = null;

    // Find SSO config by email domain or org slug
    if (email) {
      const domain = email.split('@')[1];
      if (!domain) return Errors.badRequest('Invalid email format');
      config = await getSSOConfigByDomain(domain);
    }

    if (!config && orgSlug) {
      config = await getSSOConfigByOrgSlug(orgSlug);
    }

    if (!config) {
      return Errors.notFound('No SSO configuration found for this email domain or organization');
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://winbixai.com';
    const callbackUrl = `${baseUrl}/api/auth/sso/callback`;

    if (config.protocol === 'saml') {
      const redirectUrl = buildSAMLRedirectUrl(config, callbackUrl);
      return successResponse({ redirectUrl, protocol: 'saml' });
    }

    if (config.protocol === 'oidc') {
      const state = randomBytes(16).toString('hex');
      const redirectUrl = buildOIDCRedirectUrl(config, callbackUrl, state);
      // Store state server-side in a secure httpOnly cookie for CSRF verification in the callback
      const response = NextResponse.json({ success: true, data: { redirectUrl, protocol: 'oidc' } });
      response.cookies.set('sso_oidc_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10, // 10 minutes — long enough to complete the OIDC flow
      });
      return response;
    }

    return Errors.badRequest('Unsupported SSO protocol');
  } catch (err) {
    console.error('SSO initiation error:', err);
    return Errors.internal('Failed to initiate SSO');
  }
}
