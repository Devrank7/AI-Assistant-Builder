// src/app/api/oauth/callback/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import OAuthState from '@/models/OAuthState';
import IntegrationConfig from '@/models/IntegrationConfig';
import { decrypt, encrypt } from '@/lib/encryption';

function htmlResponse(title: string, message: string, success: boolean): Response {
  const color = success ? '#22c55e' : '#ef4444';
  const icon = success ? '&#10004;' : '&#10006;';
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
  .card { text-align: center; padding: 48px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 400px; }
  .icon { font-size: 48px; color: ${color}; margin-bottom: 16px; }
  h1 { font-size: 24px; margin: 0 0 12px; color: #111827; }
  p { color: #6b7280; margin: 0; line-height: 1.5; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
  return new Response(html, {
    status: success ? 200 : 400,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    // Error path — provider denied access
    if (error) {
      if (state) {
        try {
          await connectDB();
          await OAuthState.deleteOne({ state });
        } catch {
          /* best effort */
        }
      }
      const safeDesc = (errorDescription || error).replace(/[<>"'&]/g, '');
      return htmlResponse(
        'Authorization Failed',
        `The provider denied access: ${safeDesc}. Return to the chat and try again.`,
        false
      );
    }

    if (!code || !state) {
      return htmlResponse('Invalid Request', 'Missing authorization code or state parameter.', false);
    }

    await connectDB();

    // 1. Look up OAuthState
    const oauthState = await OAuthState.findOne({ state });
    if (!oauthState) {
      return htmlResponse(
        'Link Expired',
        'This authorization link has expired. Return to the chat and request a new one.',
        false
      );
    }

    if (oauthState.expiresAt < new Date()) {
      await OAuthState.deleteOne({ state });
      return htmlResponse(
        'Link Expired',
        'This authorization link has expired. Return to the chat and request a new one.',
        false
      );
    }

    // 2. Load IntegrationConfig
    const config = await IntegrationConfig.findById(oauthState.configId);
    if (!config) {
      await OAuthState.deleteOne({ state });
      return htmlResponse('Configuration Error', 'Integration configuration not found. Return to the chat.', false);
    }

    // Verify userId matches
    if (config.userId !== oauthState.userId) {
      await OAuthState.deleteOne({ state });
      return htmlResponse('Authorization Failed', 'Session mismatch — this link belongs to a different user.', false);
    }

    // 3. Decrypt credentials
    let decrypted: Record<string, unknown>;
    try {
      decrypted = JSON.parse(decrypt(config.auth.credentials));
    } catch {
      await OAuthState.deleteOne({ state });
      return htmlResponse('Configuration Error', 'Failed to read integration credentials.', false);
    }

    const clientId = decrypted.client_id as string;
    const clientSecret = decrypted.client_secret as string;
    const tokenUrl = config.auth.tokenUrl;

    if (!tokenUrl) {
      await OAuthState.deleteOne({ state });
      return htmlResponse('Configuration Error', 'Missing token URL in integration config.', false);
    }

    // 4. Exchange code for tokens
    const redirectUri =
      process.env.NODE_ENV === 'production'
        ? 'https://winbixai.com/api/oauth/callback'
        : `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/oauth/callback`;

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
      code_verifier: oauthState.codeVerifier,
    });

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[oauth/callback] Token exchange failed:', tokenResponse.status, errorText);
      await OAuthState.deleteOne({ state });
      return htmlResponse(
        'Authorization Failed',
        'Failed to exchange authorization code for tokens. Please try again.',
        false
      );
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      token_type?: string;
    };

    if (tokenData.token_type && tokenData.token_type.toLowerCase() !== 'bearer') {
      console.warn(`[oauth/callback] Unexpected token_type: ${tokenData.token_type}`);
    }

    // 5. Update IntegrationConfig with tokens
    const updatedCreds = {
      ...decrypted,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || '',
      token_expiry: Date.now() + tokenData.expires_in * 1000,
    };
    config.auth.credentials = encrypt(JSON.stringify(updatedCreds));
    await config.save();

    // 6. Clean up OAuthState
    await OAuthState.deleteOne({ state });

    return htmlResponse(
      'Authorization Successful!',
      'You can close this tab and return to the chat. The integration is now connected.',
      true
    );
  } catch (error) {
    console.error('[oauth/callback] Unexpected error:', error);
    return htmlResponse('Error', 'An unexpected error occurred. Please return to the chat and try again.', false);
  }
}
