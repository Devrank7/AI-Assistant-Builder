# Onboarding v2: Simplified Structure with Platform Tour

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify onboarding from 6 confusing steps to 4 clear steps, replacing "Create Widget" and "Install Widget" steps with an interactive Platform Tour that teaches users where everything is.

**Architecture:** Single-file rewrite of `src/app/dashboard/onboarding/page.tsx`. Same API (`/api/onboarding`), same model (`OnboardingProgress`). No backend changes needed.

**Tech Stack:** React 19, Next.js 15, framer-motion, Tailwind CSS v4, TypeScript

---

## Problem

The current 6-step onboarding confuses users:

1. Step 2 ("Create Widget") previously sent users to AI Builder in another tab — now does a POST /api/widgets but still feels disconnected
2. Step 2 → Step 4 duplication — "create widget" then "install widget" feel like one action split in two
3. Step 1 and Step 3 both collect basic info but are separated by widget creation
4. Users don't understand the dashboard after onboarding — they don't know where to go

## Solution

**4 steps instead of 6:**

| Step | Name          | Purpose                                             |
| ---- | ------------- | --------------------------------------------------- |
| 0    | Welcome       | Greet user, show value props                        |
| 1    | About You     | Collect all info in one form (merged old Steps 1+3) |
| 2    | Platform Tour | Interactive carousel showing 5 dashboard sections   |
| 3    | Done          | Summary + CTA to AI Builder                         |

**Key changes:**

- No widget building during onboarding (that's AI Builder's job)
- No install step (accessible from dashboard after widget is created)
- New interactive carousel tour teaching users the platform
- All user info collected in a single step

## Design Specification

### Visual Style — Keep Current Quality + Enhance

The current onboarding already has excellent visual design. **Preserve and enhance:**

- **Font:** Syne (700, 800) for headings — already imported, keep it
- **Colors:** Keep current gradient system (blue-500 → indigo-500 → purple-500)
- **Background:** Keep ambient blurs (blue, indigo, purple radial gradients) + dot grid
- **Components:** Keep GlassInput, GlassSelect, ConfettiParticle, ProgressIndicator
- **Animations:** Keep slideVariants, staggerContainer, staggerItem (framer-motion)
- **Buttons:** Keep btnPrimary (gradient blue→indigo) and btnGhost styles
- **Dark/light:** Keep full dark mode support with existing color tokens

**Enhancements for the Tour step:**

- Aurora-style animated background blobs: two `motion.div` elements with radial gradients (blue-600/8%, indigo-600/6%), slow scale/translate animation over 8-10s, positioned behind the carousel
- Shimmer effect on the "Start with AI Builder →" button (last carousel slide) and "Go to AI Builder" button on Step 3 — CSS `translateX` animation on a white gradient overlay
- Smooth carousel slide transitions using framer-motion `AnimatePresence` with translateX
- Mock UI screens are **static decorative JSX only** — no live component reuse, no API calls, no interactivity. Pure visual representation of what each dashboard section looks like

### Step 0: Welcome (keep mostly as-is)

Same as current Step 0:

- Rocket icon with float animation
- "Welcome, {name}!" with Syne 800
- 3 value props with staggered appearance
- "Let's get started" button

**Only change:** progress shows "Step 1 of 4" instead of "Step 1 of 6"

### Step 1: About You (merge old Steps 1 + 3)

Single step with all fields. Two visual groups:

**Group 1 — Business Info:**

- Company Name (GlassInput, Building2 icon)
- Industry (GlassSelect, Briefcase icon) — same INDUSTRIES list
- Website URL (GlassInput, Globe icon)
- Team Size + Primary Use Case (side-by-side, same as current)

**Group 2 — Preferences:**

- Language (GlassSelect) — same LANGUAGES list
- Email Notifications toggle — same toggle component as current Step 3

**Removed from form:**

- Theme picker (already in top bar)
- Timezone selector (auto-detected on the client via `Intl.DateTimeFormat().resolvedOptions().timeZone`, passed silently in the PUT call when saving step 1 — same as current `useEffect` that already does this)

**Navigation:** Back + Skip + Continue buttons (same style as current)

### Step 2: Platform Tour (NEW)

Interactive carousel with 5 slides. Each slide contains:

- Icon (emoji or Lucide, in a gradient-bg rounded container)
- Title with gradient text (Syne 800)
- One-line description
- Mock UI screen (glassmorphism card with fake UI elements)

**Slides:**

| #   | Title          | Icon          | Description                              | Mock UI                                     |
| --- | -------------- | ------------- | ---------------------------------------- | ------------------------------------------- |
| 1   | AI Builder     | Rocket        | Create your AI chat widget in minutes    | Chat-style interface with bot messages      |
| 2   | Widgets        | MessageSquare | Manage and customize all your widgets    | List of widget cards with status dots       |
| 3   | Analytics      | BarChart3     | Track conversations, leads & performance | Stat cards + bar chart                      |
| 4   | Integrations   | Plug          | Connect Telegram, WhatsApp, CRM & more   | Grid of integration pills with colored dots |
| 5   | Knowledge Base | BookOpen      | Train your AI with your business content | List of knowledge source items              |

**Carousel behavior:**

- One slide visible at a time
- Slide transitions: translateX animation (same slideVariants as step transitions)
- Dot indicators below carousel showing current position
- "Back" / "Next" navigation buttons
- On last slide: "Next" button changes to "Start with AI Builder →". Clicking it advances to step 3 (Done), where `completeOnboarding()` fires via `useEffect`. Step 3 then offers the "Go to AI Builder" CTA for the actual navigation to `/dashboard/ai-builder`.
- Keyboard arrow support for navigation (document-level `keydown` listener for ArrowLeft/ArrowRight)
- When the user exits step 2 by reaching the last slide and clicking "Start with AI Builder", `'tour'` is included in `completedSteps` via the PUT call. If the user navigates away via "Skip setup" in the top bar, `'tour'` is omitted from `completedSteps`.
- Carousel slide index is **ephemeral** — not persisted to DB. On page reload, carousel resets to slide 1. Only the step-level `currentStep: 2` is persisted.

**Mobile behavior:**

- No swipe gestures (buttons only — simpler, more reliable)
- Mock UI screens scale down proportionally via `max-height` + `overflow: hidden`
- Carousel container has `min-height: 380px` on desktop, `min-height: 320px` on mobile
- On screens < 640px: mock UI section gets reduced padding, smaller font sizes

**Carousel visual container:**

- Rounded 2xl card with glassmorphism border
- Each mock screen has a macOS-style title bar (three dots: red, yellow, green)
- Mock UI elements use rgba whites and subtle borders (consistent with existing style)

### Step 3: Done (simplified)

**Trigger:** `completeOnboarding()` (POST to `/api/onboarding`) fires on `useEffect` when `step === 3`, identical to current pattern where it fires on `step === 5`.

Same structure as current Step 5 but simplified:

- Confetti animation (keep ConfettiParticle)
- PartyPopper icon with spring animation
- "You're all set!" heading (Syne 800, gradient text)
- **Primary CTA:** "Go to AI Builder" → navigates to `/dashboard/ai-builder` (with shimmer effect)
- **Secondary CTA:** "Go to Dashboard" → navigates to `/dashboard`
- Quick links: same 4-card grid (Create Widget, Invite Team, Dashboard, Documentation)

**Summary card rows:**

| Row           | Condition                         | Example                                                |
| ------------- | --------------------------------- | ------------------------------------------------------ |
| Business      | `!!businessInfo.companyName`      | "Business: Acme Corp" or "Business info (skipped)"     |
| Industry      | `!!businessInfo.industry`         | "Industry: E-commerce" or "Industry (skipped)"         |
| Website       | `!!businessInfo.website`          | "Website: acme.com" or "Website (skipped)"             |
| Language      | always true                       | "Language: English"                                    |
| Notifications | always true                       | "Notifications: Enabled" or "Notifications: Disabled"  |
| Tour          | `completedSteps.includes('tour')` | "Platform tour completed" or "Platform tour (skipped)" |

### Progress Indicator

Update to show 4 steps instead of 6:

- `TOTAL_STEPS = 4`
- `STEP_NAMES = ['welcome', 'profile', 'tour', 'complete']`
- Same ProgressIndicator component, just fewer dots

### Top Bar

Keep exactly as current:

- WinBix AI logo + name
- Theme toggle button
- "Skip setup" button: visible when `step < 3` (hidden on the Done screen, index 3)

## Data Model

### No model changes needed

`OnboardingProgress` schema stays identical. The fields map to the new steps:

- `currentStep`: 0-3 instead of 0-5
- `completedSteps`: uses new STEP_NAMES
- `businessInfo`: same fields (companyName, industry, website, teamSize, useCase)
- `preferences`: same fields (language, timezone, notifications)
- `firstWidgetId`: still exists but won't be set during onboarding (set later in AI Builder)

### API compatibility

All three endpoints (`GET /PUT /POST /api/onboarding`) work unchanged:

- GET: returns progress (currentStep will be 0-3 now)
- PUT: saves partial progress (same fields)
- POST: completes onboarding (marks isCompleted + updates User)

**Migration for existing users mid-onboarding:**

Explicit old-step → new-step mapping on load:

| Old currentStep | Old step name  | New currentStep | Reason                                  |
| --------------- | -------------- | --------------- | --------------------------------------- |
| 0               | Welcome        | 0               | Same step                               |
| 1               | Business Info  | 1               | Maps to About You                       |
| 2               | Create Widget  | 1               | Widget step removed, send to About You  |
| 3               | Customize      | 1               | Merged into About You                   |
| 4               | Install Widget | 1               | Install step removed, send to About You |
| 5               | Complete       | redirect        | `isCompleted: true` → dashboard         |

Old `completedSteps` values (`'business'`, `'widget'`, `'customize'`, `'install'`) will remain in the DB harmlessly but won't match any new step name — this is acceptable, they are not used for logic.

## Removed Features

| Feature                          | Reason                               | Where it lives now                   |
| -------------------------------- | ------------------------------------ | ------------------------------------ |
| Create Widget step               | Confusing, breaks context            | AI Builder (`/dashboard/ai-builder`) |
| Install Widget step              | Premature, user has no widget yet    | Widget detail page in dashboard      |
| Verify Installation button       | Can't verify without widget          | Dashboard post-creation              |
| Website URL → auto-create widget | Onboarding shouldn't build           | AI Builder does this properly        |
| Theme picker in form             | Duplicate of top bar toggle          | Top bar (already exists)             |
| Timezone selector                | Auto-detected, no user action needed | Stored silently via `Intl` API       |

## File Changes

| File                                    | Action      | Details                              |
| --------------------------------------- | ----------- | ------------------------------------ |
| `src/app/dashboard/onboarding/page.tsx` | **Rewrite** | 6 steps → 4 steps, add Tour carousel |
| `src/app/api/onboarding/route.ts`       | No change   | API stays identical                  |
| `src/models/OnboardingProgress.ts`      | No change   | Schema stays identical               |

## Success Criteria

1. Onboarding completes in 4 steps
2. All existing fields (businessInfo, preferences) are still collected and saved
3. Platform Tour carousel works with keyboard + click navigation
4. Existing users with `isCompleted: true` still redirect to dashboard
5. "Skip setup" still works
6. All framer-motion animations are smooth (no layout shift, no jank)
7. Dark and light mode both look correct
8. Mobile responsive (carousel works on small screens)
