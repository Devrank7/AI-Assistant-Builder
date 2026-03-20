# Landing & Marketing Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Landing & Marketing feature (40% → 100%) by building the missing marketing pages: Features, Customers, Enterprise, Agency, Changelog, and shared marketing layout components.

**Architecture:** Create shared `MarketingLayout` with nav + footer, then build each page as a standalone `'use client'` page with framer-motion animations and glassmorphism styling. All pages are static content (no DB queries) with SEO metadata.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, framer-motion, lucide-react

**What already exists:**

- Homepage (`/`) — 1658 lines, fully animated
- Pricing (`/pricing`) — 4-tier with Stripe
- About, Privacy, Terms pages
- `src/lib/pricing.ts` — plan configs
- Theme system (dark/light), i18n

**Deferred:**

- Blog + MDX system (requires content pipeline, not blocking)
- Docs site (internal API docs already at `/dashboard/developer/docs`)
- Public Marketplace (requires marketplace API, separate feature)

---

## File Structure

| File                                                       | Responsibility                        |
| ---------------------------------------------------------- | ------------------------------------- |
| **Create:** `src/components/marketing/MarketingNav.tsx`    | Shared nav for all marketing pages    |
| **Create:** `src/components/marketing/MarketingFooter.tsx` | Shared footer for all marketing pages |
| **Create:** `src/app/features/page.tsx`                    | Features showcase page                |
| **Create:** `src/app/customers/page.tsx`                   | Customers / testimonials page         |
| **Create:** `src/app/enterprise/page.tsx`                  | Enterprise plan landing page          |
| **Create:** `src/app/agency/page.tsx`                      | Agency program landing page           |
| **Create:** `src/app/changelog/page.tsx`                   | Changelog / what's new page           |

---

### Task 1: Shared Marketing Components

**Files:**

- Create: `src/components/marketing/MarketingNav.tsx`
- Create: `src/components/marketing/MarketingFooter.tsx`

- [ ] **Step 1: Create MarketingNav**

Create `src/components/marketing/MarketingNav.tsx`:

- 'use client'
- Sticky header with blur backdrop (`backdrop-blur-md`)
- Logo (WinBix AI) on left → links to `/`
- Nav links: Features, Pricing, Customers, Enterprise, Changelog
- Right side: "Sign In" button + "Get Started Free" CTA button
- Mobile hamburger menu (Sheet pattern)
- Use `usePathname()` to highlight active link
- Glassmorphism: `bg-bg-primary/80`, `border-border`, `text-text-primary`
- framer-motion fade-down on mount
- lucide-react: Menu, X, Sparkles

- [ ] **Step 2: Create MarketingFooter**

Create `src/components/marketing/MarketingFooter.tsx`:

- 4-column layout: Product (Features, Pricing, Changelog), Company (About, Customers, Agency), Developers (API Docs, Documentation), Legal (Privacy, Terms)
- Bottom bar: © 2026 WinBix AI, social links placeholders
- Glassmorphism styling
- lucide-react: Twitter, Github, Linkedin (or use generic icons)

- [ ] **Step 3: Commit**

```bash
git add src/components/marketing/
git commit -m "feat: add shared MarketingNav and MarketingFooter components"
```

---

### Task 2: Features Page

**Files:**

- Create: `src/app/features/page.tsx`

- [ ] **Step 1: Create features page**

Create `src/app/features/page.tsx` — Apple Enterprise 2026 quality.

Sections:

1. **Hero**: "Everything you need to deploy AI chat agents" — subtitle, gradient text
2. **Feature Grid** (3 columns on desktop, 1 on mobile):
   - AI Chat Widgets — deploy in minutes, custom branding
   - Knowledge Base — auto-crawl, RAG-powered answers
   - Multi-Channel — Web, Telegram, WhatsApp, Instagram
   - Analytics — real-time metrics, A/B testing, AI quality
   - Integrations — 10+ integrations, webhooks, API
   - Team Collaboration — roles, audit log, org management
   - AI Builder — visual builder, no-code customization
   - Developer API — REST API v1, API keys, docs
   - White-Label — custom branding, custom domain
3. **Comparison section**: "WinBix vs Others" — simple comparison table (WinBix vs Generic Chatbot vs Custom Build)
4. **CTA**: "Start Building for Free" → link to `/pricing`

Use MarketingNav + MarketingFooter.
Each feature card: icon, title, description, glassmorphism card with hover animation.
framer-motion stagger on scroll (viewport once).
lucide-react icons for each feature.

- [ ] **Step 2: Commit**

```bash
git add src/app/features/page.tsx
git commit -m "feat: add Features showcase page"
```

---

### Task 3: Customers Page

**Files:**

- Create: `src/app/customers/page.tsx`

- [ ] **Step 1: Create customers page**

Create `src/app/customers/page.tsx`.

Sections:

1. **Hero**: "Trusted by businesses worldwide"
2. **Stats bar**: "500+ widgets deployed", "10M+ messages processed", "99.9% uptime"
3. **Testimonials grid** (3 cards): Each has quote, name, role, company, star rating (use static data — this is a marketing page)
4. **Use cases section**: 4 use case cards (Dental Clinics, E-Commerce, Hotels, Agencies) — each with icon, title, description, key metric
5. **CTA**: "Join hundreds of businesses" → `/pricing`

Use MarketingNav + MarketingFooter.
All glassmorphism cards, framer-motion animations.

- [ ] **Step 2: Commit**

```bash
git add src/app/customers/page.tsx
git commit -m "feat: add Customers / testimonials page"
```

---

### Task 4: Enterprise + Agency Landing Pages

**Files:**

- Create: `src/app/enterprise/page.tsx`
- Create: `src/app/agency/page.tsx`

- [ ] **Step 1: Create enterprise page**

Create `src/app/enterprise/page.tsx`.

Sections:

1. **Hero**: "Enterprise AI Chat Platform" — dark gradient background, premium feel
2. **Enterprise features grid**:
   - Unlimited widgets & messages
   - White-label branding + custom domain
   - Developer API (1000 req/min)
   - Dedicated account manager
   - SLA guarantee (99.99% uptime)
   - SSO & advanced security
   - Custom integrations
   - Priority support
3. **Security & Compliance**: AES-256 encryption, GDPR ready, SOC 2 (planned), HMAC webhook signing
4. **CTA**: "Contact Sales" button + "Start Free Trial" button

- [ ] **Step 2: Create agency page**

Create `src/app/agency/page.tsx`.

Sections:

1. **Hero**: "WinBix Agency Program" — "Deploy AI widgets for your clients"
2. **Benefits grid**:
   - Bulk pricing: 10+ widgets = 30% discount
   - White-label dashboard
   - Client management portal
   - Priority support
   - Revenue sharing (referral bonuses)
   - API access for automation
3. **How it works**: 3-step process (Sign up → Build widgets → Deploy for clients)
4. **Pricing tiers**: Agency Starter (10 widgets), Agency Pro (50 widgets), Agency Enterprise (unlimited)
5. **CTA**: "Apply for Agency Program" → contact form or mailto

Both pages use MarketingNav + MarketingFooter, glassmorphism, framer-motion.

- [ ] **Step 3: Commit**

```bash
git add src/app/enterprise/page.tsx src/app/agency/page.tsx
git commit -m "feat: add Enterprise and Agency program landing pages"
```

---

### Task 5: Changelog Page

**Files:**

- Create: `src/app/changelog/page.tsx`

- [ ] **Step 1: Create changelog page**

Create `src/app/changelog/page.tsx`.

Structure:

- MarketingNav + MarketingFooter
- Hero: "What's New" — subtitle: "Latest updates and improvements"
- Timeline of releases (static data, hardcoded):

```
March 2026:
- Developer API Platform — REST API v1, API keys management, interactive docs
- Integration Hub v2 — Webhook management, extended events, widget bindings, retry logic
- Enterprise Dashboard — A/B test statistics, AI quality metrics, white-label settings, audit log

February 2026:
- Onboarding & Growth — Referral program, email sequences, smart notifications, empty states
- Contact CRM — Lead scoring, contact management, multi-channel tracking
- Inbox System — Unified inbox, conversation threads, real-time updates
- Flow Builder — Visual flow editor, trigger-action automation

January 2026:
- Multi-channel support — Telegram, WhatsApp, Instagram bots
- AI Builder — Visual widget builder with Gemini AI
- Analytics Dashboard — Real-time metrics, conversation tracking
```

Each entry: date header, list of features with colored badges (New, Improved, Fixed).
Timeline layout with left date column, right content.
framer-motion stagger on scroll.

- [ ] **Step 2: Commit**

```bash
git add src/app/changelog/page.tsx
git commit -m "feat: add Changelog page with release timeline"
```

---

### Task 6: Run All Tests + Push

- [ ] **Step 1: Run all existing tests to verify no regressions**

```bash
npx vitest run
```

Expected: No new failures

- [ ] **Step 2: Push to remote**

```bash
git push origin main
```
