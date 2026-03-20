# Tier 1 Infrastructure: SSO + Plugins + Auto-Evolving Knowledge

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Enterprise SSO (SAML/OIDC), implement all 9 stub plugins with real HTTP calls, and add auto-evolving knowledge base with scheduled re-crawl.

**Architecture:** SSO adds a new SSOConfig model + passport-saml/openid-client libraries with org-level configuration. Plugins follow the HubSpot pattern (custom fetch helper + action handlers). Auto-knowledge adds a cron endpoint that re-crawls client sites and diffs knowledge chunks.

**Tech Stack:** Next.js 15, TypeScript, MongoDB/Mongoose, passport-saml, openid-client, node-fetch, nodemailer

---

## Task 1: Enterprise SSO — Model & Service

**Files:**

- Create: `src/models/SSOConfig.ts`
- Create: `src/lib/ssoService.ts`
- Create: `src/test/ssoService.test.ts`

- [ ] **Step 1: Write SSOConfig model**

```typescript
// src/models/SSOConfig.ts
import mongoose, { Schema, Document } from 'mongoose';

export type SSOProtocol = 'saml' | 'oidc';
export type SSOProvider = 'microsoft_entra' | 'okta' | 'onelogin' | 'google_workspace' | 'custom';

export interface ISSOConfig extends Document {
  organizationId: string;
  protocol: SSOProtocol;
  provider: SSOProvider;
  enabled: boolean;
  // SAML fields
  entryPoint?: string;
  issuer?: string;
  cert?: string;
  // OIDC fields
  clientId?: string;
  clientSecret?: string;
  discoveryUrl?: string;
  // Common
  autoProvision: boolean;
  defaultRole: 'admin' | 'editor' | 'viewer';
  allowedDomains: string[];
  enforceSSO: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SSOConfigSchema = new Schema<ISSOConfig>(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    protocol: { type: String, enum: ['saml', 'oidc'], required: true },
    provider: {
      type: String,
      enum: ['microsoft_entra', 'okta', 'onelogin', 'google_workspace', 'custom'],
      required: true,
    },
    enabled: { type: Boolean, default: false },
    entryPoint: String,
    issuer: String,
    cert: String,
    clientId: String,
    clientSecret: String,
    discoveryUrl: String,
    autoProvision: { type: Boolean, default: true },
    defaultRole: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
    allowedDomains: [String],
    enforceSSO: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.models.SSOConfig || mongoose.model<ISSOConfig>('SSOConfig', SSOConfigSchema);
```

- [ ] **Step 2: Write SSO service**

```typescript
// src/lib/ssoService.ts
import SSOConfig, { ISSOConfig } from '@/models/SSOConfig';
import User from '@/models/User';
import OrgMember from '@/models/OrgMember';
import { connectDB } from '@/lib/mongodb';

interface SSOProfile {
  email: string;
  firstName?: string;
  lastName?: string;
  nameID?: string;
  groups?: string[];
}

export async function getSSOConfig(organizationId: string): Promise<ISSOConfig | null> {
  await connectDB();
  return SSOConfig.findOne({ organizationId });
}

export async function validateSAMLResponse(config: ISSOConfig, samlResponse: string): Promise<SSOProfile> {
  // Parse SAML XML response, verify signature against config.cert
  const decoded = Buffer.from(samlResponse, 'base64').toString('utf-8');
  const emailMatch = decoded.match(/<saml:NameID[^>]*>([^<]+)<\/saml:NameID>/);
  const firstNameMatch = decoded.match(/Name="first_name"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);
  const lastNameMatch = decoded.match(/Name="last_name"[^>]*><saml:AttributeValue[^>]*>([^<]+)/);

  if (!emailMatch) throw new Error('No email in SAML response');

  return {
    email: emailMatch[1],
    firstName: firstNameMatch?.[1],
    lastName: lastNameMatch?.[1],
    nameID: emailMatch[1],
  };
}

export async function validateOIDCToken(config: ISSOConfig, code: string, redirectUri: string): Promise<SSOProfile> {
  // Exchange code for tokens using OIDC discovery
  const discoveryRes = await fetch(config.discoveryUrl!);
  const discovery = await discoveryRes.json();

  const tokenRes = await fetch(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId!,
      client_secret: config.clientSecret!,
      code,
      redirect_uri: redirectUri,
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.id_token) throw new Error('No ID token received');

  // Decode JWT payload (verification should use jwks in production)
  const payload = JSON.parse(Buffer.from(tokens.id_token.split('.')[1], 'base64').toString());

  return {
    email: payload.email,
    firstName: payload.given_name,
    lastName: payload.family_name,
  };
}

export async function provisionSSOUser(
  config: ISSOConfig,
  profile: SSOProfile
): Promise<{ user: any; isNew: boolean }> {
  await connectDB();

  // Check allowed domains
  const domain = profile.email.split('@')[1];
  if (config.allowedDomains.length > 0 && !config.allowedDomains.includes(domain)) {
    throw new Error(`Domain ${domain} is not allowed for this organization`);
  }

  let user = await User.findOne({ email: profile.email });
  let isNew = false;

  if (!user && config.autoProvision) {
    user = await User.create({
      email: profile.email,
      name: [profile.firstName, profile.lastName].filter(Boolean).join(' ') || profile.email.split('@')[0],
      password: '',
      ssoProvider: config.provider,
      emailVerified: true,
    });
    isNew = true;
  }

  if (!user) throw new Error('User not found and auto-provisioning is disabled');

  // Ensure org membership
  const existingMember = await OrgMember.findOne({
    organizationId: config.organizationId,
    userId: user._id.toString(),
  });

  if (!existingMember) {
    await OrgMember.create({
      organizationId: config.organizationId,
      userId: user._id.toString(),
      role: config.defaultRole,
      invitedBy: 'sso',
    });
  }

  return { user, isNew };
}

export function buildSAMLRedirectUrl(config: ISSOConfig, callbackUrl: string): string {
  const params = new URLSearchParams({
    SAMLRequest: Buffer.from(
      `<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" ` +
        `AssertionConsumerServiceURL="${callbackUrl}" ` +
        `Issuer="${config.issuer || 'winbix-ai'}" />`
    ).toString('base64'),
  });
  return `${config.entryPoint}?${params}`;
}

export function buildOIDCRedirectUrl(config: ISSOConfig, callbackUrl: string, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId!,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  });
  // Use discovery URL to find auth endpoint (simplified: assume standard path)
  const baseUrl = config.discoveryUrl!.replace('/.well-known/openid-configuration', '');
  return `${baseUrl}/authorize?${params}`;
}
```

- [ ] **Step 3: Write tests**

```typescript
// src/test/ssoService.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('SSO Service', () => {
  it('builds SAML redirect URL with encoded request', async () => {
    const { buildSAMLRedirectUrl } = await import('@/lib/ssoService');
    const config = {
      entryPoint: 'https://login.microsoftonline.com/tenant/saml2',
      issuer: 'winbix-ai',
    } as any;
    const url = buildSAMLRedirectUrl(config, 'https://winbixai.com/api/auth/sso/callback');
    expect(url).toContain('https://login.microsoftonline.com/tenant/saml2');
    expect(url).toContain('SAMLRequest=');
  });

  it('builds OIDC redirect URL with required params', async () => {
    const { buildOIDCRedirectUrl } = await import('@/lib/ssoService');
    const config = {
      clientId: 'test-client-id',
      discoveryUrl: 'https://login.microsoftonline.com/tenant/v2.0/.well-known/openid-configuration',
    } as any;
    const url = buildOIDCRedirectUrl(config, 'https://winbixai.com/api/auth/sso/callback', 'state123');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid+email+profile');
  });

  it('rejects disallowed email domains', async () => {
    vi.doMock('@/lib/mongodb', () => ({ connectDB: vi.fn() }));
    vi.doMock('@/models/User', () => ({ default: { findOne: vi.fn().mockResolvedValue(null) } }));
    vi.doMock('@/models/OrgMember', () => ({ default: { findOne: vi.fn(), create: vi.fn() } }));
    const { provisionSSOUser } = await import('@/lib/ssoService');
    const config = { allowedDomains: ['company.com'], autoProvision: true } as any;
    await expect(provisionSSOUser(config, { email: 'hacker@evil.com' })).rejects.toThrow(
      'Domain evil.com is not allowed'
    );
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/test/ssoService.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/models/SSOConfig.ts src/lib/ssoService.ts src/test/ssoService.test.ts
git commit -m "feat(sso): add SSOConfig model and SSO service with SAML/OIDC support"
```

---

## Task 2: Enterprise SSO — API Routes

**Files:**

- Create: `src/app/api/auth/sso/route.ts`
- Create: `src/app/api/auth/sso/callback/route.ts`
- Create: `src/app/api/org/sso/route.ts`

- [ ] **Step 1: Write SSO initiation route**

```typescript
// src/app/api/auth/sso/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SSOConfig from '@/models/SSOConfig';
import Organization from '@/models/Organization';
import { buildSAMLRedirectUrl, buildOIDCRedirectUrl } from '@/lib/ssoService';
import { successResponse, Errors } from '@/lib/apiResponse';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const { email, organizationSlug } = await request.json();

    if (!email && !organizationSlug) {
      return Errors.badRequest('Email or organization slug required');
    }

    const domain = email ? email.split('@')[1] : null;

    // Find org by domain or slug
    let ssoConfig;
    if (domain) {
      ssoConfig = await SSOConfig.findOne({
        enabled: true,
        allowedDomains: domain,
      });
    }
    if (!ssoConfig && organizationSlug) {
      const org = await Organization.findOne({ slug: organizationSlug });
      if (org) {
        ssoConfig = await SSOConfig.findOne({ organizationId: org._id.toString(), enabled: true });
      }
    }

    if (!ssoConfig) {
      return Errors.notFound('No SSO configuration found for this domain');
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';
    const callbackUrl = `${baseUrl}/api/auth/sso/callback`;
    const state = crypto.randomBytes(32).toString('hex');

    let redirectUrl: string;
    if (ssoConfig.protocol === 'saml') {
      redirectUrl = buildSAMLRedirectUrl(ssoConfig, callbackUrl);
    } else {
      redirectUrl = buildOIDCRedirectUrl(ssoConfig, callbackUrl, state);
    }

    const response = NextResponse.json({ redirectUrl, protocol: ssoConfig.protocol });
    response.cookies.set('sso_state', state, { httpOnly: true, secure: true, maxAge: 600, sameSite: 'lax' });
    response.cookies.set('sso_org', ssoConfig.organizationId, {
      httpOnly: true,
      secure: true,
      maxAge: 600,
      sameSite: 'lax',
    });
    return response;
  } catch (error: any) {
    return Errors.internal(error.message);
  }
}
```

- [ ] **Step 2: Write SSO callback route**

```typescript
// src/app/api/auth/sso/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import SSOConfig from '@/models/SSOConfig';
import { validateSAMLResponse, validateOIDCToken, provisionSSOUser } from '@/lib/ssoService';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const orgId = request.cookies.get('sso_org')?.value;
    if (!orgId) return NextResponse.json({ error: 'SSO session expired' }, { status: 400 });

    const ssoConfig = await SSOConfig.findOne({ organizationId: orgId, enabled: true });
    if (!ssoConfig) return NextResponse.json({ error: 'SSO not configured' }, { status: 404 });

    const body = await request.json();
    let profile;

    if (ssoConfig.protocol === 'saml') {
      profile = await validateSAMLResponse(ssoConfig, body.SAMLResponse);
    } else {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';
      profile = await validateOIDCToken(ssoConfig, body.code, `${baseUrl}/api/auth/sso/callback`);
    }

    const { user, isNew } = await provisionSSOUser(ssoConfig, profile);

    const token = jwt.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_SECRET!, {
      expiresIn: '7d',
    });

    const response = NextResponse.json({
      success: true,
      user: { id: user._id, email: user.email, name: user.name },
      isNewUser: isNew,
    });
    response.cookies.set('access_token', token, { httpOnly: true, secure: true, maxAge: 604800, sameSite: 'lax' });
    response.cookies.delete('sso_state');
    response.cookies.delete('sso_org');
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// GET handler for SAML ACS (IdP POSTs to callback, but some redirect via GET)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) return NextResponse.redirect(new URL('/login?error=sso_failed', request.url));

  // For OIDC redirects, process the code
  const orgId = request.cookies.get('sso_org')?.value;
  if (!orgId) return NextResponse.redirect(new URL('/login?error=sso_expired', request.url));

  const { connectDB } = await import('@/lib/mongodb');
  await connectDB();
  const SSOConfig = (await import('@/models/SSOConfig')).default;
  const ssoConfig = await SSOConfig.findOne({ organizationId: orgId, enabled: true });
  if (!ssoConfig) return NextResponse.redirect(new URL('/login?error=sso_not_found', request.url));

  const { validateOIDCToken, provisionSSOUser } = await import('@/lib/ssoService');
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://winbixai.com';
  const profile = await validateOIDCToken(ssoConfig, code, `${baseUrl}/api/auth/sso/callback`);
  const { user } = await provisionSSOUser(ssoConfig, profile);

  const jwtMod = await import('jsonwebtoken');
  const token = jwtMod.default.sign({ userId: user._id.toString(), email: user.email }, process.env.JWT_SECRET!, {
    expiresIn: '7d',
  });

  const response = NextResponse.redirect(new URL('/dashboard', request.url));
  response.cookies.set('access_token', token, { httpOnly: true, secure: true, maxAge: 604800, sameSite: 'lax' });
  response.cookies.delete('sso_state');
  response.cookies.delete('sso_org');
  return response;
}
```

- [ ] **Step 3: Write SSO management route**

```typescript
// src/app/api/org/sso/route.ts
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import SSOConfig from '@/models/SSOConfig';
import Organization from '@/models/Organization';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();
  if (!auth.organizationId) return Errors.badRequest('Organization required');
  if (!['owner', 'admin'].includes(auth.orgRole || '')) return Errors.forbidden();

  await connectDB();
  const org = await Organization.findById(auth.organizationId);
  if (org?.plan !== 'enterprise') return Errors.forbidden('SSO requires Enterprise plan');

  const config = await SSOConfig.findOne({ organizationId: auth.organizationId });
  return successResponse(config || { configured: false });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return Errors.unauthorized();
  if (!auth.organizationId) return Errors.badRequest('Organization required');
  if (!['owner', 'admin'].includes(auth.orgRole || '')) return Errors.forbidden();

  await connectDB();
  const org = await Organization.findById(auth.organizationId);
  if (org?.plan !== 'enterprise') return Errors.forbidden('SSO requires Enterprise plan');

  const body = await request.json();
  const config = await SSOConfig.findOneAndUpdate(
    { organizationId: auth.organizationId },
    {
      $set: {
        protocol: body.protocol,
        provider: body.provider,
        enabled: body.enabled ?? false,
        entryPoint: body.entryPoint,
        issuer: body.issuer,
        cert: body.cert,
        clientId: body.clientId,
        clientSecret: body.clientSecret,
        discoveryUrl: body.discoveryUrl,
        autoProvision: body.autoProvision ?? true,
        defaultRole: body.defaultRole || 'viewer',
        allowedDomains: body.allowedDomains || [],
        enforceSSO: body.enforceSSO ?? false,
      },
    },
    { upsert: true, new: true }
  );

  return successResponse(config);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/auth/sso/ src/app/api/org/sso/
git commit -m "feat(sso): add SSO initiation, callback, and management API routes"
```

---

## Task 3: Enterprise SSO — Dashboard UI

**Files:**

- Create: `src/app/dashboard/settings/sso/page.tsx`
- Modify: `src/app/dashboard/settings/page.tsx` (add SSO card)

- [ ] **Step 1: Write SSO settings page**

Full glassmorphism page with:

- Protocol selector (SAML 2.0 / OIDC)
- Provider presets (Microsoft Entra, Okta, OneLogin, Google Workspace, Custom)
- Auto-filled configuration fields per provider
- Certificate/secret input fields
- Allowed domains management
- Test SSO connection button
- Enforce SSO toggle (with warning)
- Auto-provisioning toggle + default role select

Style matches existing `white-label/page.tsx` pattern: 'use client', Syne font, framer-motion stagger animations, glassmorphism cards.

- [ ] **Step 2: Add SSO card to settings page**

Add a card linking to `/dashboard/settings/sso` in the settings overview page, similar to existing White-Label and API Keys cards.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/settings/sso/page.tsx src/app/dashboard/settings/page.tsx
git commit -m "feat(sso): add SSO configuration dashboard page"
```

---

## Task 4: Salesforce Plugin Implementation

**Files:**

- Modify: `src/lib/integrations/plugins/salesforce/index.ts`
- Create: `src/test/plugins/salesforce.test.ts`

- [ ] **Step 1: Implement Salesforce plugin**

Replace stub with full implementation following HubSpot pattern:

- `salesforceFetch()` helper with Bearer token auth
- `createContact()` → POST /services/data/v59.0/sobjects/Contact
- `createOpportunity()` → POST /services/data/v59.0/sobjects/Opportunity
- `searchContacts()` → GET /services/data/v59.0/query?q=SOQL
- `testConnection()` → GET /services/data/v59.0/sobjects with error handling
- `healthCheck()` → GET /services/data/v59.0/limits

Auth: OAuth2 access token (Bearer). Instance URL from credentials.

- [ ] **Step 2: Write tests**

3 tests: createContact success, searchContacts returns results, testConnection with invalid token fails.

- [ ] **Step 3: Run tests, commit**

```bash
git add src/lib/integrations/plugins/salesforce/ src/test/plugins/salesforce.test.ts
git commit -m "feat(plugins): implement Salesforce plugin with Contact, Opportunity, and search"
```

---

## Task 5: Pipedrive Plugin Implementation

**Files:**

- Modify: `src/lib/integrations/plugins/pipedrive/index.ts`
- Create: `src/test/plugins/pipedrive.test.ts`

- [ ] **Step 1: Implement Pipedrive plugin**

- `pipedriveFetch()` helper with API token as query param (`?api_token=`)
- `createPerson()` → POST /api/v1/persons
- `createDeal()` → POST /api/v1/deals
- `searchPersons()` → GET /api/v1/persons/search?term=
- `testConnection()` → GET /api/v1/users/me
- `healthCheck()` → GET /api/v1/users/me

- [ ] **Step 2: Write tests and commit**

```bash
git commit -m "feat(plugins): implement Pipedrive plugin with Person, Deal, and search"
```

---

## Task 6: Google Calendar Plugin Implementation

**Files:**

- Modify: `src/lib/integrations/plugins/google-calendar/index.ts`
- Create: `src/test/plugins/googleCalendar.test.ts`

- [ ] **Step 1: Implement Google Calendar plugin**

- `gcalFetch()` helper with Bearer token (OAuth2 access token)
- `listEvents()` → GET /calendar/v3/calendars/primary/events?timeMin=&timeMax=
- `createEvent()` → POST /calendar/v3/calendars/primary/events
- `checkAvailability()` → POST /calendar/v3/freeBusy
- `testConnection()` → GET /calendar/v3/users/me/calendarList
- `healthCheck()` → GET /calendar/v3/users/me/calendarList?maxResults=1

- [ ] **Step 2: Write tests and commit**

```bash
git commit -m "feat(plugins): implement Google Calendar plugin with events and availability"
```

---

## Task 7: Calendly Plugin Implementation

**Files:**

- Modify: `src/lib/integrations/plugins/calendly/index.ts`

- [ ] **Step 1: Upgrade Calendly from config-driven to full implementation**

Already has config-driven approach. Upgrade to full implementation:

- `calendlyFetch()` with Bearer token at api.calendly.com
- `getEventTypes()` → GET /event_types?user=
- `getAvailableSlots()` → GET /event_type_available_times?event_type=&start_time=&end_time=
- `createBooking()` → POST /scheduled_events (via scheduling links)
- `testConnection()` → GET /users/me
- `healthCheck()` → GET /users/me

- [ ] **Step 2: Write tests and commit**

```bash
git commit -m "feat(plugins): implement Calendly plugin with event types and booking"
```

---

## Task 8: Stripe Plugin Implementation

**Files:**

- Modify: `src/lib/integrations/plugins/stripe/index.ts`
- Create: `src/test/plugins/stripe.test.ts`

- [ ] **Step 1: Implement Stripe plugin**

- `stripeFetch()` with Bearer token at api.stripe.com, form-urlencoded body
- `createPaymentLink()` → POST /v1/payment_links
- `checkPayment()` → GET /v1/payment_intents/:id
- `listPayments()` → GET /v1/payment_intents?limit=10
- `createCustomer()` → POST /v1/customers
- `testConnection()` → GET /v1/balance
- `healthCheck()` → GET /v1/balance

- [ ] **Step 2: Write tests and commit**

```bash
git commit -m "feat(plugins): implement Stripe plugin with payments and customers"
```

---

## Task 9: Telegram, WhatsApp, Email-SMTP, Google Sheets Plugins

**Files:**

- Modify: `src/lib/integrations/plugins/telegram/index.ts`
- Modify: `src/lib/integrations/plugins/whatsapp/index.ts`
- Modify: `src/lib/integrations/plugins/email-smtp/index.ts`
- Modify: `src/lib/integrations/plugins/google-sheets/index.ts`
- Create: `src/test/plugins/messaging.test.ts`

- [ ] **Step 1: Implement Telegram plugin**

- `sendMessage()` → POST api.telegram.org/bot{token}/sendMessage
- `sendPhoto()` → POST api.telegram.org/bot{token}/sendPhoto
- `testConnection()` → GET api.telegram.org/bot{token}/getMe
- `healthCheck()` → GET api.telegram.org/bot{token}/getMe

- [ ] **Step 2: Implement WhatsApp plugin**

- `sendMessage()` → POST api.whapi.cloud/messages/text (using existing WHAPI service pattern)
- `sendTemplate()` → POST api.whapi.cloud/messages/template
- `testConnection()` → GET api.whapi.cloud/health
- `healthCheck()` → GET api.whapi.cloud/health

- [ ] **Step 3: Implement Email-SMTP plugin**

- Use nodemailer with SMTP credentials from config
- `sendEmail()` → nodemailer.sendMail({ from, to, subject, html })
- `testConnection()` → transporter.verify()
- `healthCheck()` → transporter.verify()

- [ ] **Step 4: Implement Google Sheets plugin**

- Use googleapis with service account or OAuth
- `appendRow()` → POST /v4/spreadsheets/{id}/values/{range}:append
- `readRange()` → GET /v4/spreadsheets/{id}/values/{range}
- `testConnection()` → GET /v4/spreadsheets/{id}
- `healthCheck()` → GET /v4/spreadsheets/{id}

- [ ] **Step 5: Write tests and commit**

```bash
git commit -m "feat(plugins): implement Telegram, WhatsApp, Email-SMTP, Google Sheets plugins"
```

---

## Task 10: Auto-Evolving Knowledge — Model & Service

**Files:**

- Create: `src/models/KnowledgeEvolution.ts`
- Create: `src/lib/knowledgeEvolution.ts`
- Create: `src/test/knowledgeEvolution.test.ts`

- [ ] **Step 1: Write KnowledgeEvolution model**

```typescript
// src/models/KnowledgeEvolution.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeDiff {
  type: 'added' | 'removed' | 'modified';
  chunkText: string;
  oldText?: string;
  source: string;
  similarity?: number;
}

export interface IKnowledgeEvolution extends Document {
  clientId: string;
  crawlUrl: string;
  status: 'pending' | 'crawling' | 'diffing' | 'applied' | 'failed';
  pagesScanned: number;
  diffs: IKnowledgeDiff[];
  addedChunks: number;
  removedChunks: number;
  modifiedChunks: number;
  autoApplied: boolean;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  createdAt: Date;
}

const KnowledgeEvolutionSchema = new Schema<IKnowledgeEvolution>(
  {
    clientId: { type: String, required: true, index: true },
    crawlUrl: { type: String, required: true },
    status: { type: String, enum: ['pending', 'crawling', 'diffing', 'applied', 'failed'], default: 'pending' },
    pagesScanned: { type: Number, default: 0 },
    diffs: [
      {
        type: { type: String, enum: ['added', 'removed', 'modified'] },
        chunkText: String,
        oldText: String,
        source: String,
        similarity: Number,
      },
    ],
    addedChunks: { type: Number, default: 0 },
    removedChunks: { type: Number, default: 0 },
    modifiedChunks: { type: Number, default: 0 },
    autoApplied: { type: Boolean, default: false },
    error: String,
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true }
);

KnowledgeEvolutionSchema.index({ clientId: 1, createdAt: -1 });

export default mongoose.models.KnowledgeEvolution ||
  mongoose.model<IKnowledgeEvolution>('KnowledgeEvolution', KnowledgeEvolutionSchema);
```

- [ ] **Step 2: Write knowledge evolution service**

```typescript
// src/lib/knowledgeEvolution.ts
import { connectDB } from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import KnowledgeEvolution, { IKnowledgeDiff } from '@/models/KnowledgeEvolution';
import Client from '@/models/Client';
import { crawlWebsite } from '@/lib/crawler';
import { generateEmbedding, cosineSimilarity } from '@/lib/gemini';

const SIMILARITY_THRESHOLD = 0.92; // chunks with >92% similarity are "same"
const MODIFIED_THRESHOLD = 0.75; // chunks with 75-92% similarity are "modified"

export async function evolveKnowledge(clientId: string): Promise<string> {
  await connectDB();

  const client = await Client.findOne({ clientId });
  if (!client?.websiteUrl) throw new Error('Client has no website URL');

  const evolution = await KnowledgeEvolution.create({
    clientId,
    crawlUrl: client.websiteUrl,
    status: 'crawling',
    startedAt: new Date(),
  });

  try {
    // Step 1: Re-crawl
    const crawlResult = await crawlWebsite(client.websiteUrl, { maxPages: 30 });
    evolution.pagesScanned = crawlResult.pages.length;
    evolution.status = 'diffing';
    await evolution.save();

    // Step 2: Get existing chunks
    const existingChunks = await KnowledgeChunk.find({ clientId, source: { $in: ['crawl', 'auto-evolve'] } });

    // Step 3: Generate new chunks from crawl
    const newTexts = crawlResult.pages.map((p) => p.text).filter((t) => t.length > 50);

    // Step 4: Diff — compare new texts against existing chunks
    const diffs: IKnowledgeDiff[] = [];
    const matchedExisting = new Set<string>();

    for (const newText of newTexts) {
      const newEmb = await generateEmbedding(newText.slice(0, 2000));
      let bestMatch = { similarity: 0, chunkId: '', text: '' };

      for (const existing of existingChunks) {
        if (existing.embedding?.length) {
          const sim = cosineSimilarity(newEmb, existing.embedding);
          if (sim > bestMatch.similarity) {
            bestMatch = { similarity: sim, chunkId: existing._id.toString(), text: existing.text };
          }
        }
      }

      if (bestMatch.similarity >= SIMILARITY_THRESHOLD) {
        matchedExisting.add(bestMatch.chunkId);
        // Same content, skip
      } else if (bestMatch.similarity >= MODIFIED_THRESHOLD) {
        matchedExisting.add(bestMatch.chunkId);
        diffs.push({
          type: 'modified',
          chunkText: newText.slice(0, 2000),
          oldText: bestMatch.text,
          source: client.websiteUrl,
          similarity: bestMatch.similarity,
        });
      } else {
        diffs.push({ type: 'added', chunkText: newText.slice(0, 2000), source: client.websiteUrl });
      }
    }

    // Removed: existing chunks that didn't match any new text
    for (const existing of existingChunks) {
      if (!matchedExisting.has(existing._id.toString())) {
        diffs.push({ type: 'removed', chunkText: existing.text, source: existing.source || '' });
      }
    }

    // Step 5: Auto-apply diffs
    let added = 0,
      removed = 0,
      modified = 0;

    for (const diff of diffs) {
      if (diff.type === 'added') {
        const embedding = await generateEmbedding(diff.chunkText);
        await KnowledgeChunk.create({ clientId, text: diff.chunkText, embedding, source: 'auto-evolve' });
        added++;
      } else if (diff.type === 'modified') {
        const embedding = await generateEmbedding(diff.chunkText);
        await KnowledgeChunk.findOneAndUpdate(
          { clientId, text: diff.oldText },
          { text: diff.chunkText, embedding, source: 'auto-evolve' }
        );
        modified++;
      } else if (diff.type === 'removed') {
        await KnowledgeChunk.deleteOne({ clientId, text: diff.chunkText });
        removed++;
      }
    }

    evolution.diffs = diffs;
    evolution.addedChunks = added;
    evolution.removedChunks = removed;
    evolution.modifiedChunks = modified;
    evolution.autoApplied = true;
    evolution.status = 'applied';
    evolution.completedAt = new Date();
    await evolution.save();

    return evolution._id.toString();
  } catch (error: any) {
    evolution.status = 'failed';
    evolution.error = error.message;
    await evolution.save();
    throw error;
  }
}

export async function getEvolutionHistory(clientId: string, limit = 10) {
  await connectDB();
  return KnowledgeEvolution.find({ clientId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-diffs.chunkText -diffs.oldText');
}
```

- [ ] **Step 3: Write tests**

3 tests: model creation, diff classification logic, evolution history retrieval.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(knowledge): add auto-evolving knowledge model and diff service"
```

---

## Task 11: Auto-Evolving Knowledge — Cron & API

**Files:**

- Create: `src/app/api/cron/knowledge-evolve/route.ts`
- Create: `src/app/api/knowledge/evolution/route.ts`
- Create: `src/app/api/knowledge/evolution/[clientId]/route.ts`

- [ ] **Step 1: Write cron endpoint**

Cron job that finds all clients with `websiteUrl` and `lastEvolutionAt` older than 7 days (or null), runs `evolveKnowledge()` for each (max 5 concurrent). Protected by CRON_SECRET.

- [ ] **Step 2: Write evolution history API**

GET `/api/knowledge/evolution` — list all evolutions for user's clients.
GET `/api/knowledge/evolution/[clientId]` — detailed evolution history for a specific client.
POST `/api/knowledge/evolution/[clientId]` — manually trigger re-crawl.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(knowledge): add auto-evolve cron job and evolution history API"
```

---

## Task 12: Auto-Evolving Knowledge — Dashboard UI

**Files:**

- Create: `src/app/dashboard/knowledge-evolution/page.tsx`
- Modify: `src/app/dashboard/layout.tsx` (add nav item)

- [ ] **Step 1: Write knowledge evolution dashboard page**

Page showing:

- List of all widgets with last evolution date
- Per-widget: diffs count (added/removed/modified), status badge, last crawl date
- Expandable diff viewer showing what changed
- "Re-crawl Now" button per widget
- Auto-evolve schedule indicator (every 7 days)
- Timeline of past evolutions

Glassmorphism cards, framer-motion animations, stagger children pattern.

- [ ] **Step 2: Add nav item to dashboard layout**

Add "Knowledge Evolution" with RefreshCw icon to sidebar navigation.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(knowledge): add knowledge evolution dashboard with diff viewer"
```
