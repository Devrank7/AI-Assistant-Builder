# WinBix AI Enterprise Platform — Design Spec

**Date:** 2026-03-16
**Approach:** C — AI-First Full Stack (Agent Studio + Widget Marketplace + Enterprise Dashboard + Integration Hub + Killer Landing)
**Constraint:** All changes extend the existing AI Builder — no breaking changes to current functionality.

---

## 0. Entity Hierarchy & Identity Model

### Current State

The codebase has two identity models with separate billing:

- `User` — dashboard login, `plan` field (`'none' | 'basic' | 'pro'`), JWT auth
- `Client` — per-widget entity, has its own `subscriptionStatus`, `paymentMethod`, `prepaidMonths` (independent billing)

### Target State: Organization → User → Widget

```
Organization (new)
├── billing: plan, subscription, payment method (single source of truth)
├── limits: maxWidgets, maxMessages, features enabled
│
├── User (member, role: owner/admin/editor/viewer)
│   ├── auth: email, password, 2FA, SSO
│   └── preferences: notifications, timezone
│
└── Widget (replaces Client for user-facing context)
    ├── widgetType, themeJson, config
    ├── knowledge base (chunks + embeddings)
    ├── integrations (event bindings)
    └── analytics (chat logs, metrics)
```

**Key decisions:**

- **Billing consolidates at Organization level.** `Client`-level billing fields (`subscriptionStatus`, `paymentMethod`, `prepaidMonths`) become legacy — reads still work, but new subscriptions write to `Organization`.
- **Solo users get an auto-created Organization** (transparent, no extra UI step).
- **Admin token** (`ADMIN_SECRET_TOKEN` from env) remains as superadmin override for internal/ops use, separate from org roles.
- **`Client` model is not renamed** — too many references. But dashboard UI calls them "Widgets" and the `Client` model gets an `organizationId` field.

### Plan Migration

| Current `User.plan` | New Plan     | Price   |
| ------------------- | ------------ | ------- |
| `'none'`            | `Free`       | $0      |
| `'basic'`           | `Starter`    | $29/mo  |
| `'pro'`             | `Pro`        | $79/mo  |
| (new)               | `Enterprise` | $299/mo |

Migration script: for each existing `User`, create an `Organization` with the mapped plan, set user as `owner`.

### RBAC Permissions Matrix

| Action                 | Owner | Admin | Editor | Viewer |
| ---------------------- | ----- | ----- | ------ | ------ |
| Manage billing         | yes   | no    | no     | no     |
| Invite/remove members  | yes   | yes   | no     | no     |
| Create/delete widgets  | yes   | yes   | yes    | no     |
| Edit widget settings   | yes   | yes   | yes    | no     |
| Edit knowledge base    | yes   | yes   | yes    | no     |
| Manage integrations    | yes   | yes   | yes    | no     |
| View analytics         | yes   | yes   | yes    | yes    |
| View chat logs         | yes   | yes   | yes    | yes    |
| Manage A/B tests       | yes   | yes   | yes    | no     |
| Publish to marketplace | yes   | yes   | yes    | no     |
| API key management     | yes   | yes   | no     | no     |
| White-label settings   | yes   | yes   | no     | no     |

---

## 1. Multi-Agent Architecture (Builder → Agent Studio)

### Current State

One Gemini agent (`geminiAgent.ts`) with 21 tools, progressing through stages: input → analysis → design → knowledge → deploy.

### Target State

The current agent becomes the **Orchestrator Agent** and gains specialized sub-agents as tools:

```
Orchestrator (current geminiAgent, extended)
├── Design Agent      — generates themes, color schemes, layout variants
├── Content Agent     — analyzes sites, writes greetings, FAQ, descriptions
├── Knowledge Agent   — crawls sites, structures RAG, optimizes chunks
├── Integration Agent — configures CRM, webhooks, channels automatically
├── QA Agent          — tests widget after build (render, AI responses, speed)
└── Deploy Agent      — deploys, verifies embed code, monitors first minutes
```

### User Experience

- User still communicates in the same BuilderChat
- New **Agent Activity Feed** shows which agent is working in real-time
- SSE event type `agent_switch` signals transitions between agents
- User can intervene at any stage

### Code Changes

- `useBuilderStream.ts` — new `activeAgent` field in state + `agent_switch` SSE event type
- `geminiAgent.ts` — orchestrator calls sub-agents via new tool definitions (existing 21 tools untouched)
- New component `AgentActivityFeed` — real-time agent work visualization
- `ProgressPipeline` — extended to show active agent alongside stage

### Architecture

Sub-agents are **functions** of the orchestrator, not separate processes. The orchestrator decides which "agent" to invoke, passes context, receives results. Under the hood — same Gemini with different system prompts and tool sets per sub-agent.

### Error Handling & Context Management

- **Sub-agent failure:** If a sub-agent fails (e.g., QA Agent finds broken widget), the orchestrator receives the error as a tool result, decides whether to retry with adjusted parameters (max 2 retries) or escalate to user ("QA found an issue: X. Want me to fix it?")
- **Context passing:** Each sub-agent receives a **subset** of conversation context — only the relevant portion (e.g., Design Agent gets site analysis + user preferences, not the full chat history). This keeps token usage manageable.
- **Token budget:** Orchestrator has full conversation context. Sub-agents get trimmed context (~2K tokens max) + their specialized system prompt. Total cost per widget build: ~15-25K tokens (vs current ~8-12K for single agent). Acceptable given the quality improvement.
- **Fallback:** If any sub-agent call times out (30s), orchestrator falls back to handling the task itself with its existing 21 tools (graceful degradation to current behavior).

---

## 2. Universal Widget Engine (Beyond Chat)

### Current State

Only AI chat widgets. One type out of dozens possible.

### Target State

Extend `theme.json` with `widgetType` field. Each type gets its own template in `generate-single-theme.js`.

### Widget Types by Priority

**Tier 1 — High demand, fast implementation:**

| Type                | Description                                                  | Enterprise Value                 |
| ------------------- | ------------------------------------------------------------ | -------------------------------- |
| AI Chat (exists)    | RAG chatbot with knowledge base                              | Platform foundation              |
| Smart FAQ           | Accordion with AI search, auto-generated from knowledge base | Reduces support load ~40%        |
| Lead Capture Form   | Multi-step form with conditional logic, validation           | Direct lead generation, CRM push |
| Appointment Booking | Calendar + slot selection + confirmation                     | Dental/beauty/consulting market  |
| Reviews Showcase    | Review aggregator (Google, manual) with carousel             | Social proof, +15-25% conversion |

**Tier 2 — Medium demand, competitive advantage:**

| Type                      | Description                                     | Enterprise Value                  |
| ------------------------- | ----------------------------------------------- | --------------------------------- |
| Pricing Calculator        | Interactive price calculator with formulas      | Lead qualification pre-contact    |
| Popup / Banner            | Trigger popups (exit-intent, scroll, timer)     | Email capture, promos             |
| Live Chat (human)         | Human operator chat + handoff from AI           | For clients where AI isn't enough |
| NPS / Survey              | Satisfaction surveys post-chat or post-purchase | Feedback, retention               |
| Social Proof Notification | "Ivan from Kyiv just purchased..."              | FOMO, conversion                  |

**Tier 3 — Long-term, wow factor:**

| Type                | Description                                    | Enterprise Value          |
| ------------------- | ---------------------------------------------- | ------------------------- |
| Product Recommender | AI picks product based on questions            | E-commerce killer feature |
| Knowledge Portal    | Embeddable mini-site with documentation search | SaaS, tech companies      |
| Video Widget        | Personalized video greeting + CTA              | High engagement           |
| Multi-Widget Bundle | Multiple widgets on one page, linked by logic  | Enterprise package        |

### How It Works With Current Builder

- User writes: "I need a pricing calculator for a dental clinic"
- Orchestrator determines `widgetType: "pricing_calculator"`
- Calls Design Agent + Content Agent for theme.json generation
- Same pipeline: `generate-single-theme.js` → `build.js` → `quickwidgets/`
- Existing AI Chat builder untouched — new branches added

### Code Changes

- `theme.json` schema — new `widgetType` field + type-specific sections
- `generate-single-theme.js` — new templates per type (separate `.jsx` files)
- `systemPrompt.ts` — orchestrator learns about new widget types
- `/dashboard/builder` — TemplateSelector shows widget type categories
- `Client` model — `widgetType` field for filtering in My Widgets

---

## 3. Widget Marketplace & Template Gallery

### Current State

TemplateSelector shows a few hardcoded templates (Dental, Construction, Hotel). No ecosystem.

### Target State

**3 template tiers:**

| Tier                | Source                                    | Example                                            |
| ------------------- | ----------------------------------------- | -------------------------------------------------- |
| Official Templates  | WinBix team                               | "Dental AI Chat", "Restaurant Booking", "SaaS FAQ" |
| Community Templates | Users publish their widgets               | "Fitness Lead Form by @user123"                    |
| AI-Generated        | Agent creates from scratch by description | "Make me a calculator for a car wash"              |

### Marketplace Features

1. **Live Preview** — interactive preview in each template card (iframe)
2. **One-Click Fork** — "Use" → clone to account → Builder opens with pre-filled theme.json
3. **Niche Filtering** — filter by industry (dental, beauty, restaurant, SaaS, e-commerce, real estate, auto, education, fitness, legal)
4. **Ratings & Reviews** — users rate templates
5. **Usage Stats** — install count, average conversion rate
6. **"Remix" button** — open someone's template in Builder, ask AI to modify

### Publish Flow

- User creates widget → "Publish to Marketplace" button in My Widgets
- Fill: name, description, niche, screenshot
- Moderation (automatic AI + manual) → publication
- Author sees install statistics

### Monetization (future)

- Free templates (official + community)
- Premium templates ($5-15 one-time) — 70/30 revenue share with authors

### Code Changes

- New model `MarketplaceTemplate` — name, description, niche, widgetType, themeJson, authorId, rating, installCount, status (draft/review/published)
- New API `/api/marketplace` — CRUD, search, filter, rate
- New page `/dashboard/marketplace`
- `TemplateSelector` — new "From Marketplace" tab
- My Widgets page — "Publish" button on each card

---

## 4. Enterprise Dashboard

### 4A: Advanced Analytics (`/dashboard/analytics`)

**Widget Performance:**

- Conversion rate per widget (visitors → chat started → lead captured)
- Funnel visualization: View → Engage → Lead → Sale
- Heatmap: peak chat hours
- Avg. response satisfaction (thumbs up/down ratio)
- Top questions (expanded)

**AI Quality Metrics:**

- Resolution rate — % questions answered without handoff
- Hallucination alerts — AI answers not from knowledge base (confidence < threshold)
- Knowledge gaps — unanswered questions → recommendation to add to knowledge base
- Average tokens per conversation

**Business Metrics:**

- Revenue attribution via CRM integration
- ROI calculator: "Your widget saved X support hours = $Y"
- Comparative analytics — widget vs widget

### 4B: A/B Testing

Users can A/B test any widget:

**Testable elements:**

- Greeting message / AI tone
- Color theme (two design variants)
- Widget position (bottom-right vs bottom-left)
- Quick replies presence/absence
- Different system prompts (more/less formal)

**How it works:**

- **Variant delivery:** Single `script.js` is embedded (no separate builds per variant). On load, widget calls `GET /api/widgets/:id/variant` which returns the assigned variant config (greeting, theme overrides, system prompt). Assignment is stored in localStorage + server-side (by visitor fingerprint hash). This is CDN-compatible — the lightweight config call is the only dynamic part.
- Each ChatLog records `variantId`
- Analytics aggregates by variant
- **Statistical method:** Chi-squared test for conversion rates. Minimum 100 visitors per variant before testing begins. Calculation runs as a daily cron job (`lib/cron/abTests.ts`), not on every page view.
- Reaching 95% confidence → in-app notification "Variant B won". User manually clicks "Apply Winner" (no auto-promotion to avoid surprises).

### 4C: Team Collaboration & White-Label

**Team Seats:**

- New model `Organization` — groups multiple User accounts
- Roles: `owner`, `admin`, `editor`, `viewer`
- Page `/dashboard/team` — invite by email, manage roles, activity log

**White-Label (Enterprise plan):**

- Remove "Powered by WinBix" from widget
- Custom domain for widgets (`widgets.clientdomain.com`)
- Custom favicon and branding in dashboard (for agencies)
- Email notifications from client's brand, not WinBix

### Code Changes

- New models: `Organization`, `OrgMember`, `ABTest`, `ABVariant`
- New API routes: `/api/org/*`, `/api/ab-tests/*`, `/api/analytics/advanced`
- New dashboard pages: `/dashboard/analytics`, `/dashboard/ab-tests`, `/dashboard/team`
- `layout.tsx` sidebar — 3 new nav items
- Widget runtime (`useChat.js`) — passes `variantId` in every API request
- `ChatLog` model — new `variantId` field
- Auth middleware — org membership check + role-based access

---

## 5. Integration Hub — Universal API

### 5A: OAuth-Based Integrations

Replace manual API key entry with OAuth flows:

- "Connect HubSpot" → OAuth popup → authorized → done
- Automatic refresh tokens
- Status display: Connected / Disconnected / Error

Priority OAuth: HubSpot, Salesforce, Pipedrive, Google Calendar, Stripe, Slack

### 5B: Expanded Categories (50+)

| Category          | Current      | Target                                                                   |
| ----------------- | ------------ | ------------------------------------------------------------------------ |
| CRM & Sales       | 7            | 15 (+ AmoCRM, Close, Copper, Insightly, Nutshell, Keap, Capsule, Streak) |
| Communication     | 4            | 10 (+ Slack, Discord, Viber, Line, Facebook Messenger, SMS/Twilio)       |
| Payments          | Billing only | Stripe, PayPal, LiqPay, Monobank, WayForPay for widgets                  |
| Calendar          | 2            | 4 (+ Cal.com, Acuity, Microsoft Outlook)                                 |
| Marketing & Email | 0            | 5 (Mailchimp, SendGrid, Brevo, ConvertKit, ActiveCampaign)               |
| Automation        | Webhooks     | Zapier, Make, n8n, Custom Webhooks with UI                               |
| Analytics         | 0            | 4 (GA4, Meta Pixel, Mixpanel, Amplitude)                                 |

### 5C: Agent-Built Custom API Integration (Key Differentiator)

Users describe integration in natural language. The **Integration Agent** writes the code:

**Flow:**

1. User describes API or provides docs URL / OpenAPI spec / cURL example
2. Integration Agent crawls docs, understands endpoints, auth, schema
3. Generates integration script (JavaScript)
4. Validates: sandbox dry-run with mock data
5. Tests: real request with test data (with permission)
6. Saves as EventBinding with custom executor

**Supported input methods:**

- Natural language description
- OpenAPI/Swagger spec upload
- cURL example paste
- Documentation URL (agent crawls)

**Security:**

- Code executes in **isolated-vm** (NOT VM2, which is deprecated and has known sandbox escapes). Alternative: Deno subprocess for stronger isolation.
- **Sandboxed APIs:** Only `fetch` (to whitelisted domains), `JSON`, `Date`, `Math`, `TextEncoder/Decoder` available. No `fs`, `child_process`, `require`, `eval`, `process`.
- Domain whitelist: user explicitly allows target domains during setup
- Credentials encrypted AES-256, stored separately from code
- Rate limiting: max 100 calls/minute per integration
- Timeout: 10 seconds per execution
- Audit log: every invocation logged
- **This feature ships as beta** — preset integrations (5A) and webhooks (5B) ship first, agent-built (5C) ships later as experimental

**Three integration modes:**

| Mode        | Connection                 | Audience                |
| ----------- | -------------------------- | ----------------------- |
| Preset      | One-click OAuth            | All users               |
| Webhook     | WinBix sends JSON to URL   | Developers, Zapier/Make |
| Agent-Built | AI reads docs, writes code | Enterprise — any API    |

### 5D: Event-Driven Architecture

Any widget event can trigger any integration:

| Event                           | Example Actions                                |
| ------------------------------- | ---------------------------------------------- |
| `lead_captured`                 | Push to CRM, email notification, Slack message |
| `chat_started`                  | GA4 event, Mixpanel track                      |
| `appointment_booked`            | Google Calendar create, SMS confirmation       |
| `payment_completed`             | Stripe webhook, CRM deal update                |
| `handoff_requested`             | Slack urgent notification, Telegram alert      |
| `widget_feedback` (thumbs down) | Create task in Monday, email to manager        |
| `knowledge_gap_detected`        | Slack notification, Trello card                |

Visual configuration in Integration Hub — no code, no Zapier needed.

**Delivery guarantees:**

- Events are **not executed inline** during the widget API request. Instead, `lib/events.ts` writes a job to the `FailedJob` collection (used as a general job queue) with status `pending`.
- A background processor (`lib/jobQueue.ts`) picks up pending jobs and executes integration actions. On failure: retry 3x with exponential backoff (5s, 30s, 5min). After 3 failures: mark as `failed`, notify widget owner.
- Deduplication: each event gets a unique `eventId` (widgetId + eventType + timestamp hash). Duplicate `eventId` within 60s is ignored.
- This connects directly to the `FailedJob` model from Section 9B — same model, same retry logic.

### Code Changes

- New model `Integration` — provider, authType (oauth/apikey/webhook/custom), credentials (encrypted), status, executorCode, eventBindings. **Note:** extends existing `Integration` model, adds new fields.
- New model `EventBinding` — eventType, integrationId, actionType, config
- Event emitter: `lib/events.ts` — on widget event, writes job to queue (not inline execution)
- Job processor: `lib/jobQueue.ts` — processes pending jobs with retry logic
- OAuth routes: `/api/integrations/oauth/[provider]/callback`
- Event config API: `/api/integrations/events`
- Redesigned `/dashboard/integrations` with categories and event builder
- Sandbox executor: `lib/sandbox.ts` — isolated-vm for custom integration code

---

## 6. Killer Landing & Marketing Site

### 6A: New Page Structure

| Page                                 | Purpose                                  | Reference            |
| ------------------------------------ | ---------------------------------------- | -------------------- |
| Home `/`                             | Hero + social proof + live demo          | vercel.com           |
| Features `/features`                 | Detailed capability overview             | linear.app/features  |
| Pricing `/pricing` (replaces /plans) | 4 plans + comparison + FAQ               | stripe.com/pricing   |
| Marketplace `/marketplace` (public)  | Public template catalog (SEO)            | wordpress.org/themes |
| Customers `/customers`               | Cases, reviews, client logos             | tidio.com/customers  |
| Docs `/docs`                         | Documentation: API, embed, SDK, webhooks | docs.stripe.com      |
| Blog `/blog`                         | SEO content, tutorials, updates          | vercel.com/blog      |
| Changelog `/changelog`               | What's new, versions                     | linear.app/changelog |
| Enterprise `/enterprise`             | Dedicated Enterprise landing             | tidio.com/enterprise |
| Agency `/agency`                     | Agency program landing                   | —                    |

### 6B: Home Page Redesign

Key sections:

1. **Hero** — "AI Agents That Build Widgets For You" + live terminal animation showing agents working
2. **Social Proof Bar** — "Trusted by 500+ businesses" + logos + ratings
3. **"How It Works"** — 3-step animation: Describe → AI Builds → Embed & Go
4. **Widget Types Grid** — all types with micro-animations on hover
5. **"Why WinBix" vs Competitors** — feature comparison table
6. **Live Demo** — interactive: type URL → watch agents build
7. **Testimonials Carousel** — real quotes with photos
8. **CTA** — "Build Your First Widget in 2 Minutes" + "No Credit Card"

### 6C: New Pricing Structure (4 Plans)

|               | Free         | Starter $29       | Pro $79                 | Enterprise $299              |
| ------------- | ------------ | ----------------- | ----------------------- | ---------------------------- |
| Widgets       | 1            | 3                 | Unlimited               | Unlimited                    |
| Widget types  | AI Chat only | Chat + FAQ + Form | All types               | All types                    |
| Messages      | 100/mo       | 1,000/mo          | Unlimited               | Unlimited                    |
| Channels      | Web only     | Web + Telegram    | All channels            | All + custom                 |
| Integrations  | —            | 3 preset          | All preset + webhook    | All + Agent-built custom API |
| A/B Testing   | —            | —                 | 2 concurrent            | Unlimited                    |
| Analytics     | Basic        | Standard          | Advanced                | Advanced + export + API      |
| Team seats    | 1            | 2                 | 5                       | Unlimited                    |
| White-label   | —            | —                 | —                       | Full white-label             |
| Marketplace   | Use only     | Use + publish     | Use + publish + premium | Use + publish + premium      |
| Support       | Community    | Email             | Priority                | Dedicated account manager    |
| Custom domain | —            | —                 | —                       | widgets.yourdomain.com       |
| SLA           | —            | —                 | —                       | 99.9% uptime guarantee       |

### 6D: Design Language

- Dark-first with refined gradients (Linear-style)
- Micro-animations (Framer Motion, subtle)
- Typography: Inter or Geist, clear size hierarchy
- Accent: Cyan/blue gradient primary. Green for success, amber for warnings
- Glass morphism for cards and modals
- Grid: max-w-7xl, 8px spacing system
- Abstract 3D illustrations or Lottie animations

### Code Changes

- New pages: `/features`, `/customers`, `/enterprise`, `/changelog`, `/docs/*`, `/blog/*`, `/agency`
- Full redesign of `/page.tsx` (home)
- Rename `/plans` → `/pricing` with 4-plan structure
- Public marketplace: `/marketplace` (no auth)
- Shared components: `MarketingNav`, `MarketingFooter`, `SocialProofBar`
- Free plan logic — new billing entry, limits in middleware

---

## 7. Developer Experience & API Platform

### 7A: Public REST API (`/api/v1/*`)

```
GET/POST/PUT/DELETE  /api/v1/widgets
POST                 /api/v1/widgets/:id/build
GET                  /api/v1/widgets/:id/status
GET                  /api/v1/analytics/:id
GET                  /api/v1/chatlogs/:id
POST/DELETE          /api/v1/knowledge/:id
POST/GET             /api/v1/ab-tests
POST/GET             /api/v1/integrations
GET                  /api/v1/events (SSE stream)
```

Authentication: `X-WinBix-Key: wbx_live_...`

Rate limits: Free 10/min, Starter 60/min, Pro 300/min, Enterprise 1000/min + custom.

### 7B: JavaScript SDK

```javascript
WinBix.init({ widgetId: 'abc123',
  onLeadCaptured: (lead) => {},
  onChatStarted: () => {},
  onHandoffRequested: () => {},
});
WinBix.open() / .close() / .sendMessage('Hi');
WinBix.setUser({ name, email, plan });
WinBix.on('event', callback);
```

**Use cases:** Agencies integrating programmatically, e-commerce passing cart data, SaaS passing user plan context.

### 7C: Documentation Site (`/docs`)

MDX-based with syntax highlighting, copy buttons, "Try it" interactive examples. Framework: Nextra or Fumadocs (Next.js native).

Structure: Getting Started, Widget Types, AI Agents, Integrations, REST API Reference, JavaScript SDK, Guides.

### 7D: API Keys Management (`/dashboard/settings/api`)

- Production + Test keys
- Scoped keys with permissions (read/write/admin)
- Expiration settings
- IP whitelist
- Usage monitoring

### Code Changes

- New route group `/api/v1/*` — versioned public API
- Middleware `apiKeyAuth.ts` — validation, rate limiting, scoped permissions
- Model `ApiKey` — key (hashed), userId, scopes, rateLimit, expiresAt, lastUsedAt
- SDK bundle: `/public/sdk/v1.js`
- Docs: `/app/docs/[[...slug]]/page.tsx` with MDX
- Dashboard: new "API Keys" tab in settings

---

## 8. Onboarding, Retention & Growth Loops

### 8A: Onboarding Wizard (First 5 Minutes)

4-step guided flow after signup:

1. "What's your business?" — niche selection
2. "What do you want to build?" — widget type selection
3. "Drop your website URL" — or skip for template
4. Agents start building — redirect to Builder with pre-filled context

**Target: time-to-value < 3 minutes** from signup to working widget.

### 8B: Smart Empty States

Every empty dashboard page becomes an entry point with contextual CTAs instead of dead ends.

### 8C: Notification & Engagement System

**In-App:** Notification bell in dashboard header with actionable alerts (new chats, knowledge gaps, A/B results, marketplace suggestions, upgrade prompts).

**Email Sequences:**

| Day | Trigger             | Email                            |
| --- | ------------------- | -------------------------------- |
| 0   | Signup              | Welcome + embed code             |
| 1   | No install          | Platform-specific install guide  |
| 3   | Installed, no chats | "Test your widget" + direct link |
| 7   | Active              | Week 1 report                    |
| 10  | Free plan           | "80/100 messages used. Upgrade"  |
| 14  | Trial ending        | "Trial ends tomorrow"            |
| 30  | Monthly             | Monthly performance report       |

**Telegram Bot:** Real-time lead notifications, daily digest, handoff alerts.

### 8D: Growth Loops

| Loop                | Mechanism                                                         |
| ------------------- | ----------------------------------------------------------------- |
| Powered by WinBix   | Free/Starter widgets show branded link → visitors discover WinBix |
| Marketplace Authors | Users publish templates → others use → attribution → more content |
| Referral Program    | Invite friend → both get 1 month free Starter                     |
| Agency Program      | Bulk pricing (10+ widgets = 30% discount), white-label dashboard  |

### Code Changes

- New flow: `/dashboard/onboarding` wizard component
- `User` model — new fields: `niche`, `onboardingCompleted`, `referralCode`, `referredBy`
- `Notification` model — extended for in-app notifications
- `NotificationBell` component in dashboard header
- `/api/notifications` — CRUD + mark as read
- Email service: `lib/email/sequences.ts` (cron-based or SendGrid/Resend)
- All dashboard empty states redesigned
- New pages: `/agency`, `/enterprise`
- Referral tracking middleware

---

## 9. Security, Reliability & Enterprise Infrastructure

### 9A: Security

**Authentication:**

- 2FA (TOTP) — Google Authenticator / Authy
- SSO — Google, GitHub OAuth. SAML for Enterprise (Okta, Azure AD)
- Session management — active sessions page, revoke, auto-logout

**Data Protection:**

- Encryption at rest (AES-256) for credentials, API keys, knowledge base
- Full audit log — every dashboard action logged (who, what, when, IP)
- GDPR compliance panel: data export, account deletion, retention settings, cookie consent

**Widget Security:**

- CSP headers alongside Shadow DOM
- Rate limiting: max 5 messages/minute per IP
- IP blocklist
- Optional profanity filter

### 9B: Reliability & Monitoring

- `/api/health` endpoint — status of all services
- Widget uptime monitoring — ping every 5 min, alert if down
- AI model fallback chain: Gemini 3.1 Pro → Gemini 3 Flash → notification
- Graceful degradation: widget shows offline lead form when API unavailable
- Retry queue: failed integrations retry 3x with exponential backoff
- Error dashboard: `/dashboard/settings/logs`

### 9C: Performance

- CDN for widgets (Cloudflare/Vercel Edge)
- Edge caching for widget config
- Lazy loading: widget loads on scroll or after configurable delay

### 9D: Enterprise SLA ($299/mo plan)

| Guarantee                 | Value                      |
| ------------------------- | -------------------------- |
| Uptime SLA                | 99.9%                      |
| Response time             | < 4 hours (business hours) |
| Dedicated account manager | Yes                        |
| Custom onboarding         | Zoom call setup            |
| Priority AI processing    | Dedicated Gemini quota     |
| Data residency            | EU/US region selection     |
| Custom contract           | Invoice billing, NET-30    |
| Phone support             | Yes                        |

### Code Changes

- 2FA: `User` model + `twoFactorSecret`, `otplib` library
- SSO: NextAuth.js or custom OAuth providers
- Audit log middleware — automatic logging of every API call
- GDPR: `/api/user/export`, `/api/user/delete-account`
- Health: `/api/health` + cron monitoring
- Fallback: `geminiAgent.ts` — try/catch with model fallback chain
- Offline form: widget `useChat.js` — offline mode on API timeout
- Retry queue: `lib/retryQueue.ts` + `FailedJob` model
- CDN: `next.config.ts` + Vercel Edge middleware
- Feature flags: `FeatureFlag` model + `checkFeature()` middleware

---

## Summary: New Models

| Model                    | Purpose                            |
| ------------------------ | ---------------------------------- |
| `Organization`           | Team / company account             |
| `OrgMember`              | User ↔ Org with role               |
| `MarketplaceTemplate`    | Marketplace templates              |
| `ABTest`                 | A/B test configuration             |
| `ABVariant`              | Test variant with metrics          |
| `Integration` (extended) | OAuth + custom API + executor code |
| `EventBinding`           | Event → action binding             |
| `ApiKey`                 | Public API keys                    |
| `FeatureFlag`            | Feature toggle per user/plan       |
| `FailedJob`              | Integration retry queue            |
| `Referral`               | Referral program tracking          |

## Summary: New Dashboard Pages

| Page                          | Purpose                    |
| ----------------------------- | -------------------------- |
| `/dashboard/onboarding`       | Guided wizard              |
| `/dashboard/marketplace`      | Browse & install templates |
| `/dashboard/analytics`        | Advanced analytics         |
| `/dashboard/ab-tests`         | A/B test management        |
| `/dashboard/team`             | Team seats & roles         |
| `/dashboard/settings/api`     | API keys management        |
| `/dashboard/settings/privacy` | GDPR, data export          |

## Summary: New Public Pages

| Page                | Purpose                          |
| ------------------- | -------------------------------- |
| `/features`         | Feature showcase                 |
| `/pricing`          | 4-plan pricing (replaces /plans) |
| `/marketplace`      | Public template gallery          |
| `/customers`        | Case studies & testimonials      |
| `/docs/[[...slug]]` | Documentation site               |
| `/blog/[[...slug]]` | SEO content                      |
| `/changelog`        | Product updates                  |
| `/enterprise`       | Enterprise landing               |
| `/agency`           | Agency program landing           |

---

## 10. Phased Rollout Plan

This spec is ~6-12 months of work. Phases are ordered by dependency and value.

### Phase 1: Foundation (Weeks 1-6)

**Goal:** Entity model + new widget types + improved onboarding

- Section 0: Organization/User/Widget entity hierarchy + RBAC + plan migration
- Section 2 (Tier 1 only): Smart FAQ + Lead Form widget types
- Section 8A: Onboarding wizard
- Section 6C: Free plan + 4-tier pricing page
- Section 8B: Smart empty states
- Redirect `/plans` → `/pricing`

**Why first:** Everything else depends on the entity model. New widget types + free plan + onboarding = immediate growth.

### Phase 2: Enterprise Dashboard (Weeks 7-12)

**Goal:** Analytics, A/B testing, team collaboration

- Section 4A: Advanced analytics page
- Section 4B: A/B testing system
- Section 4C: Team seats + Organization management
- Section 1: Multi-agent orchestrator (Design + Content + Knowledge agents)
- Section 8C: In-app notifications + email sequences

**Why second:** These are the features that justify Pro/Enterprise pricing and differentiate from Elfsight/Tidio.

### Phase 3: Platform & Marketplace (Weeks 13-20)

**Goal:** Developer platform + marketplace + integrations

- Section 3: Marketplace (official templates first, then community publishing)
- Section 5A+5B: OAuth integrations + expanded categories + event-driven architecture
- Section 7A+7B: Public REST API v1 + JavaScript SDK
- Section 7C: Documentation site (Fumadocs, integrated into Next.js app)
- Section 2 (Tier 2): Booking, Calculator, Popup widget types
- Section 1: Add QA Agent + Deploy Agent + Integration Agent

**Why third:** Marketplace and API need content (widget types) and infrastructure (entity model, analytics) from phases 1-2.

### Phase 4: Enterprise & Growth (Weeks 21-28)

**Goal:** Enterprise features + growth loops + agent-built integrations

- Section 4C: White-label (custom domain, branding removal)
- Section 5C: Agent-built custom API integrations (beta)
- Section 6: Full marketing site redesign (home, features, customers, blog, changelog)
- Section 8D: Growth loops (referral, agency program, "Powered by")
- Section 9: 2FA, SSO, GDPR panel, CDN, SLA
- Section 2 (Tier 3): Product Recommender, Knowledge Portal, Video Widget

**Why last:** Enterprise/security features are less urgent than growth features. Agent-built integrations need more bake time.

### Dependencies Map

```
Phase 1: Entity Model ──→ Phase 2: Team/RBAC
Phase 1: Widget Types ──→ Phase 3: Marketplace
Phase 1: Free Plan    ──→ Phase 4: Growth Loops
Phase 2: Analytics    ──→ Phase 2: A/B Testing
Phase 2: Multi-Agent  ──→ Phase 4: Agent-Built APIs
Phase 3: API v1       ──→ Phase 3: JS SDK
Phase 3: Integrations ──→ Phase 4: White-Label
```

### Technical Decisions

- **Docs framework:** Fumadocs (integrated into existing Next.js app, not separate deploy)
- **Blog:** MDX files in `/content/blog/`, rendered via Next.js dynamic routes. No headless CMS initially.
- **Rate limiting for public API:** Redis-based (via Upstash Redis for serverless compatibility)
- **Widget versioning:** Each widget gets a `version` counter (auto-incremented on edit). Marketplace forks snapshot a specific version. A/B tests lock the widget version during the test.
- **Webhook signature verification:** All outbound webhooks signed with HMAC-SHA256 using per-integration secret. Inbound OAuth callbacks verified via state parameter.
- **`/plans` redirect:** Next.js `redirects` in `next.config.ts` → 301 to `/pricing`
