import connectDB from './mongodb';
import SSOConfig, { type ISSOConfig, type SSOProtocol } from '@/models/SSOConfig';
import User from '@/models/User';
import OrgMember from '@/models/OrgMember';
import { randomBytes, createHash } from 'crypto';

// ── Fetch SSO config for an organization ──
export async function getSSOConfig(organizationId: string): Promise<ISSOConfig | null> {
  await connectDB();
  return SSOConfig.findOne({ organizationId, enabled: true });
}

// ── Find SSO config by email domain ──
export async function getSSOConfigByDomain(emailDomain: string): Promise<ISSOConfig | null> {
  await connectDB();
  return SSOConfig.findOne({
    allowedDomains: emailDomain,
    enabled: true,
  });
}

// ── Find SSO config by org slug (organizationId) ──
export async function getSSOConfigByOrgSlug(orgSlug: string): Promise<ISSOConfig | null> {
  await connectDB();
  return SSOConfig.findOne({ organizationId: orgSlug, enabled: true });
}

// ── Build SAML redirect URL ──
export function buildSAMLRedirectUrl(config: ISSOConfig, callbackUrl: string): string {
  if (!config.entryPoint) {
    throw new Error('SAML entryPoint is not configured');
  }
  const params = new URLSearchParams({
    SAMLRequest: buildSAMLAuthnRequest(config.issuer || '', callbackUrl),
    RelayState: callbackUrl,
  });
  const separator = config.entryPoint.includes('?') ? '&' : '?';
  return `${config.entryPoint}${separator}${params.toString()}`;
}

// ── Build OIDC redirect URL ──
export function buildOIDCRedirectUrl(config: ISSOConfig, callbackUrl: string, state: string): string {
  if (!config.clientId) {
    throw new Error('OIDC clientId is not configured');
  }
  // Standard OIDC authorization endpoint construction
  const discoveryBase = config.discoveryUrl?.replace('/.well-known/openid-configuration', '') || '';
  const authEndpoint = `${discoveryBase}/authorize`;
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce: randomBytes(16).toString('hex'),
  });
  return `${authEndpoint}?${params.toString()}`;
}

// ── Validate SAML response ──
export async function validateSAMLResponse(
  config: ISSOConfig,
  samlResponse: string
): Promise<{ email: string; name: string; nameId: string } | null> {
  try {
    // Decode the base64 SAML response
    const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');

    // Extract email from NameID or attribute
    const nameIdMatch = decoded.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
    const emailAttrMatch = decoded.match(
      /<saml:Attribute[^>]*Name="[^"]*email[^"]*"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/i
    );
    const nameAttrMatch = decoded.match(
      /<saml:Attribute[^>]*Name="[^"]*(?:displayName|name)[^"]*"[^>]*>[\s\S]*?<saml:AttributeValue[^>]*>([^<]+)<\/saml:AttributeValue>/i
    );

    const email = emailAttrMatch?.[1] || nameIdMatch?.[1] || '';
    const name = nameAttrMatch?.[1] || email.split('@')[0] || '';
    const nameId = nameIdMatch?.[1] || email;

    if (!email || !email.includes('@')) return null;

    // Verify certificate fingerprint if cert is configured
    if (config.cert) {
      const certFingerprint = createHash('sha256').update(config.cert).digest('hex');
      const responseCertMatch = decoded.match(/<ds:X509Certificate>([^<]+)<\/ds:X509Certificate>/);
      if (responseCertMatch) {
        const responseCert = responseCertMatch[1].replace(/\s/g, '');
        const responseFingerprint = createHash('sha256').update(responseCert).digest('hex');
        if (certFingerprint !== responseFingerprint) {
          console.warn('SSO: Certificate fingerprint mismatch — rejecting authentication');
          return null;
        }
      }
    }

    return { email, name, nameId };
  } catch (err) {
    console.error('SSO SAML validation error:', err);
    return null;
  }
}

// ── Validate OIDC token (exchange code for token, then validate) ──
export async function validateOIDCToken(
  config: ISSOConfig,
  code: string,
  callbackUrl: string
): Promise<{ email: string; name: string; sub: string } | null> {
  try {
    if (!config.clientId || !config.clientSecret || !config.discoveryUrl) {
      return null;
    }

    // Fetch discovery document to find token endpoint
    const discoveryRes = await fetch(config.discoveryUrl);
    if (!discoveryRes.ok) return null;
    const discovery = await discoveryRes.json();

    // Exchange authorization code for tokens
    const tokenRes = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: callbackUrl,
        client_id: config.clientId,
        client_secret: config.clientSecret,
      }),
    });

    if (!tokenRes.ok) return null;
    const tokens = await tokenRes.json();

    // Fetch user info from userinfo endpoint
    const userinfoRes = await fetch(discovery.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    if (!userinfoRes.ok) return null;
    const userinfo = await userinfoRes.json();

    const email = userinfo.email;
    const name = userinfo.name || userinfo.preferred_username || email?.split('@')[0] || '';
    const sub = userinfo.sub;

    if (!email) return null;

    return { email, name, sub };
  } catch (err) {
    console.error('SSO OIDC validation error:', err);
    return null;
  }
}

// ── Provision or find SSO user ──
export async function provisionSSOUser(
  config: ISSOConfig,
  email: string,
  name: string
): Promise<{ userId: string; isNew: boolean } | null> {
  await connectDB();

  // Check domain is allowed
  const domain = email.split('@')[1];
  if (config.allowedDomains.length > 0 && !config.allowedDomains.includes(domain)) {
    return null;
  }

  // Find existing user
  let user = await User.findOne({ email });
  let isNew = false;

  if (!user) {
    if (!config.autoProvision) return null;

    // Create new user
    user = await User.create({
      email,
      name,
      passwordHash: randomBytes(32).toString('hex'), // random hash for SSO users
      emailVerified: true,
      plan: 'free',
      subscriptionStatus: 'active',
      organizationId: config.organizationId,
      onboardingCompleted: false,
    });
    isNew = true;
  }

  // Ensure user is member of the organization
  const existingMember = await OrgMember.findOne({
    organizationId: config.organizationId,
    userId: user._id.toString(),
  });

  if (!existingMember) {
    await OrgMember.create({
      organizationId: config.organizationId,
      userId: user._id.toString(),
      role: config.defaultRole || 'viewer',
    });

    // Update user's organizationId
    if (!user.organizationId) {
      user.organizationId = config.organizationId;
      await user.save();
    }
  }

  return { userId: user._id.toString(), isNew };
}

// ── Helper: Build minimal SAML AuthnRequest ──
function buildSAMLAuthnRequest(issuer: string, callbackUrl: string): string {
  const id = '_' + randomBytes(16).toString('hex');
  const issueInstant = new Date().toISOString();
  const xml = `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
    xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
    ID="${id}"
    Version="2.0"
    IssueInstant="${issueInstant}"
    AssertionConsumerServiceURL="${callbackUrl}"
    ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
    <saml:Issuer>${issuer}</saml:Issuer>
  </samlp:AuthnRequest>`;
  return Buffer.from(xml).toString('base64');
}
