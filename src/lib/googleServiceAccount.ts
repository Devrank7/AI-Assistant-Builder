// src/lib/googleServiceAccount.ts
import { createSign } from 'crypto';

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

interface TokenResult {
  accessToken: string;
  expiresAt: number; // Unix timestamp
}

// Simple in-memory cache: one token per service account email + scope combo
const tokenCache = new Map<string, TokenResult>();

function base64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function parseServiceAccountJSON(raw: string): ServiceAccountKey {
  const parsed = JSON.parse(raw);
  if (parsed.type !== 'service_account') {
    throw new Error('Not a service account JSON file (type must be "service_account")');
  }
  if (!parsed.private_key || !parsed.client_email || !parsed.token_uri) {
    throw new Error('Service account JSON missing required fields (private_key, client_email, token_uri)');
  }
  return parsed as ServiceAccountKey;
}

export async function getAccessTokenFromServiceAccount(serviceAccountJSON: string, scopes: string[]): Promise<string> {
  const sa = parseServiceAccountJSON(serviceAccountJSON);
  const scopeStr = scopes.join(' ');
  const cacheKey = `${sa.client_email}:${scopeStr}`;

  // Check cache - return if valid for at least 5 more minutes
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() / 1000 + 300) {
    return cached.accessToken;
  }

  // Build JWT
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: sa.client_email,
    scope: scopeStr,
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600, // 1 hour
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signInput = `${headerB64}.${payloadB64}`;

  const sign = createSign('RSA-SHA256');
  sign.update(signInput);
  const signature = sign.sign(sa.private_key);
  const signatureB64 = base64url(signature);

  const jwt = `${signInput}.${signatureB64}`;

  // Exchange JWT for access token
  const res = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google token exchange failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const result: TokenResult = {
    accessToken: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };

  tokenCache.set(cacheKey, result);
  return result.accessToken;
}

// Detect whether a credential string is a service account JSON or a plain token
export function isServiceAccountJSON(credential: string): boolean {
  if (!credential.startsWith('{')) return false;
  try {
    const parsed = JSON.parse(credential);
    return parsed.type === 'service_account' && !!parsed.private_key;
  } catch {
    return false;
  }
}
