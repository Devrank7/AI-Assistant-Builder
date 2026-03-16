# WinBix AI Design System Redesign

**Goal:** Transform WinBix AI from a good dark SaaS dashboard into an Apple/Linear-level product with a full design system, light/dark theme support, and pixel-perfect component library.

**Style:** Linear/Arc — "quiet confidence". Subtle borders, restrained color, purposeful animation, progressive disclosure. Premium without intimidation.

**Constraint:** ALL existing functionality must be preserved. This is a visual-only refactor. No API changes, no state management changes, no routing changes.

**Icon System:** Lucide React (`lucide-react`, already installed) as the project-wide icon library. All inline SVGs in dashboard pages replaced with Lucide components. Consistent `size={16|20|24}` and `strokeWidth={1.5}`.

**Responsive Breakpoints:** Tailwind defaults — `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`. Sidebar collapses below `lg`. Content goes single-column below `sm`.

### Scope

**In scope (full redesign):**

- All dashboard pages (`/dashboard/*`)
- Landing page (`/`)
- Auth modal
- Pricing page (`/plans`)
- Onboarding
- Error page (`error.tsx`, `not-found.tsx`, `loading.tsx`)

**Out of scope (preserve current styling, no changes):**

- Admin panel (`/admin/*`) — has its own design system in `src/components/admin/ui/` and `src/styles/admin.css`. Will be addressed in a separate future phase.
- Cabinet portal (`/cabinet/*`) — client-facing portal with its own layout. Separate phase.
- Industry landing pages (`/dubai-realestate`, `/australia-home-services`, `/texas-beauty-instagram`) — custom themed pages per market. Separate phase.
- Demo template pages (`/demo/[template]`) — render client-facing widget demos. Separate phase.
- Client public page (`/client/[id]`) — separate phase.
- Consulting page (`/consulting`) — separate phase.

**Preserved but not restyled:**

- Legal pages (`/about`, `/privacy`, `/terms`) — minimal pages, apply new font + base tokens only, no layout changes.

**Critical: Legacy CSS preservation during migration:**

- `globals.css` (1278 lines) will NOT be wholesale replaced. Instead:
  1. New design tokens added at the TOP of the file (`:root` + `.dark` variables)
  2. `@theme inline` block updated with new token mappings
  3. Legacy classes preserved until all in-scope pages migrated
  4. Phase E cleanup: remove unused legacy classes, but preserve any class used by out-of-scope pages (admin, cabinet, industry, demo)
  5. The `@import '../styles/admin.css'` line must remain
- Hardcoded `className="dark"` and `bg-[#0a0a0f]` on `<html>`/`<body>` in root `layout.tsx` must be removed and replaced with ThemeProvider dynamic class

### Existing UI Components Strategy

11 components already exist in `src/components/ui/`:

- `ConfirmDialog.tsx` → **Restyle** to use new Modal + Button
- `Pagination.tsx` → **Restyle** with new tokens
- `TabNav.tsx` → **Restyle** with new tokens
- `Breadcrumbs.tsx` → **Restyle** with new tokens
- `StatsCard.tsx` → **Replace** with new Card pattern (inline in pages)
- `motion.tsx` → **Keep as-is** (framer-motion wrapper)
- `StatusBadge.tsx` → **Replace** with new Badge component
- `SearchFilter.tsx` → **Restyle** with new Input + tokens
- `CopyButton.tsx` → **Restyle** with new tokens
- `Toast.tsx` → **Restyle** with new tokens (keep functionality)
- `EmptyState.tsx` → **Restyle** with new tokens

Other existing components:

- `LandingChat.tsx` → Restyle with new tokens during landing page redesign (4L)
- `WidgetGenerator.tsx` → Minimal color/font update (same as builder)
- `LanguageSwitcher.tsx` → Restyle with new Dropdown/Button patterns
- `CookieConsent.tsx` → Restyle with new Card + Button
- `components/layout/Sidebar.tsx` → **Delete** after dashboard layout redesign (sidebar moves inline to layout.tsx or becomes new component)
- `components/analytics/AnalyticsCharts.tsx` → Restyle chart colors/tokens

---

## 1. Design Tokens

### 1A. Typography

**Font:** Inter (variable, via `next/font/google`)

| Token   | Size | Weight | Tracking | Usage                        |
| ------- | ---- | ------ | -------- | ---------------------------- |
| display | 28px | 700    | -0.02em  | Page titles                  |
| title   | 20px | 600    | -0.01em  | Section headers, card titles |
| heading | 16px | 600    | -0.005em | Sub-sections, dialog titles  |
| body    | 14px | 400    | 0        | Main content text            |
| caption | 12px | 500    | 0        | Meta info, labels            |
| micro   | 11px | 500    | 0.02em   | Badges, timestamps           |

### 1B. Color System

**Accent:** Blue `#3B82F6` — single brand color.

**Light theme (`:root`):**

| Token          | Value                 | Usage                  |
| -------------- | --------------------- | ---------------------- |
| bg-primary     | #FFFFFF               | Page background        |
| bg-secondary   | #F9FAFB               | Cards, sidebar         |
| bg-tertiary    | #F3F4F6               | Hover states, nested   |
| border         | #E5E7EB               | Default borders        |
| border-subtle  | #F3F4F6               | Light dividers         |
| text-primary   | #111827               | Headings, primary text |
| text-secondary | #6B7280               | Descriptions, meta     |
| text-tertiary  | #9CA3AF               | Placeholders, disabled |
| accent         | #3B82F6               | Buttons, links, active |
| accent-hover   | #2563EB               | Hover on accent        |
| accent-subtle  | rgba(59,130,246,0.08) | Active bg tint         |

**Dark theme (`.dark`):**

| Token          | Value                  | Usage                  |
| -------------- | ---------------------- | ---------------------- |
| bg-primary     | #0A0A0F                | Page background        |
| bg-secondary   | #111118                | Cards, sidebar         |
| bg-tertiary    | #1A1A24                | Hover states, nested   |
| border         | rgba(255,255,255,0.08) | Default borders        |
| border-subtle  | rgba(255,255,255,0.04) | Light dividers         |
| text-primary   | #F9FAFB                | Headings, primary text |
| text-secondary | #9CA3AF                | Descriptions, meta     |
| text-tertiary  | #6B7280                | Placeholders, disabled |
| accent         | #3B82F6                | Buttons, links, active |
| accent-hover   | #60A5FA                | Hover on accent        |
| accent-subtle  | rgba(59,130,246,0.12)  | Active bg tint         |

**Semantic colors (both themes):**

| Name   | Value   | Light bg          | Dark bg               | Usage              |
| ------ | ------- | ----------------- | --------------------- | ------------------ |
| blue   | #3B82F6 | blue-50 (#EFF6FF) | rgba(59,130,246,0.12) | Accent, active     |
| green  | #10B981 | green-50          | rgba(16,185,129,0.12) | Success, connected |
| amber  | #F59E0B | amber-50          | rgba(245,158,11,0.12) | Warning, paused    |
| red    | #EF4444 | red-50            | rgba(239,68,68,0.12)  | Error, danger      |
| purple | #8B5CF6 | purple-50         | rgba(139,92,246,0.12) | Premium, upgrade   |

### 1C. Spacing

4px base grid:

| Token | Value | Usage              |
| ----- | ----- | ------------------ |
| 0.5   | 2px   | Micro gaps         |
| 1     | 4px   | Tight spacing      |
| 2     | 8px   | Inline gaps        |
| 3     | 12px  | Inner card padding |
| 4     | 16px  | Section gaps       |
| 5     | 20px  | Card padding       |
| 6     | 24px  | Section padding    |
| 8     | 32px  | Page section gap   |
| 10    | 40px  | Major breaks       |

### 1D. Border Radius

| Token | Value | Usage                    |
| ----- | ----- | ------------------------ |
| sm    | 6px   | Badges, small buttons    |
| md    | 8px   | Buttons, inputs          |
| lg    | 12px  | Cards, panels            |
| xl    | 16px  | Modals, large containers |

### 1E. Shadows (light theme only, dark uses borders)

| Token | Value                       | Usage       |
| ----- | --------------------------- | ----------- |
| sm    | 0 1px 2px rgba(0,0,0,0.05)  | Subtle lift |
| md    | 0 2px 8px rgba(0,0,0,0.08)  | Cards hover |
| lg    | 0 8px 24px rgba(0,0,0,0.12) | Modals      |

### 1F. Animations

Only three types, all triggered by user action:

| Type   | Duration | Easing   | Usage                       |
| ------ | -------- | -------- | --------------------------- |
| fade   | 150ms    | ease     | Appear/disappear elements   |
| slide  | 200ms    | ease-out | Dropdowns, panels, sidebar  |
| spring | 200ms    | spring   | Button press, toggle switch |

Removed: float, shimmer, pulse-glow, rotate-slow, border-dance, aurora, mesh animations.

---

## 2. Component Library

All components live in `src/components/ui/`. Each component reads from CSS variables and works in both themes automatically.

### 2A. Button

**Variants:** primary, secondary, ghost, danger
**Sizes:** sm (h-8), md (h-9), lg (h-10)

```tsx
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  // extends HTMLButtonAttributes
}
```

| Variant   | Light                         | Dark                          |
| --------- | ----------------------------- | ----------------------------- |
| primary   | bg-accent text-white          | bg-accent text-white          |
| secondary | bg-transparent border         | bg-transparent border         |
| ghost     | bg-transparent text-secondary | bg-transparent text-secondary |
| danger    | bg-red-500 text-white         | bg-red-500 text-white         |

Rule: Maximum ONE primary button per screen.

### 2B. Card

```tsx
interface CardProps {
  children: React.ReactNode;
  padding?: 'sm' | 'md' | 'lg'; // 12px, 20px, 24px
  hoverable?: boolean;
  className?: string;
}
```

Styling: `bg-secondary border-border rounded-lg`. Hoverable adds `hover:border` slightly brighter. Shadows only in light theme.

### 2C. Input

```tsx
interface InputProps {
  label?: string;
  // extends HTMLInputAttributes
}
```

Styling: `h-9 px-3 text-body bg-transparent border-border rounded-md`. Focus: `border-accent ring-2 ring-accent/10`.

### 2D. Badge

```tsx
interface BadgeProps {
  variant?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'purple';
  children: React.ReactNode;
}
```

Styling: `h-5 px-2 text-micro font-500 rounded-sm`. Colors from semantic palette.

### 2E. Modal

```tsx
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg'; // 400px, 480px, 640px
}
```

Overlay: `bg-black/50` (light) `bg-black/70` (dark) + `backdrop-blur-sm`. Content: `bg-primary border rounded-xl p-6`. Animation: scale 0.98→1 + opacity, 200ms.

### 2F. Table

```tsx
interface TableProps<T> {
  columns: { key: string; label: string; width?: string }[];
  data: T[];
  renderRow: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
}
```

Header: `text-caption font-500 text-tertiary uppercase tracking-wider`. Rows: `border-b border-subtle py-3 px-4 hover:bg-tertiary`.

### 2G. Avatar

```tsx
interface AvatarProps {
  name: string;
  src?: string;
  size?: 'sm' | 'md' | 'lg'; // 24px, 32px, 40px
}
```

Circle with initials fallback. Colors derived from name hash.

### 2H. Dropdown

```tsx
interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode; // DropdownItem components
  align?: 'left' | 'right';
}
```

Styling: `bg-primary border rounded-lg shadow-lg p-1`. Items: `px-3 py-1.5 rounded-md hover:bg-tertiary text-body`.

### 2I. Toggle

```tsx
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}
```

Switch component: `w-9 h-5 rounded-full`. Off: `bg-tertiary`. On: `bg-accent`. Thumb: white circle with spring animation.

### 2J. ThemeProvider

```tsx
interface ThemeContextType {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}
```

Reads `localStorage('theme')`, falls back to `prefers-color-scheme`. Sets `.dark` class on `<html>`. Flash prevention script in root layout `<head>`.

### 2K. ThemeToggle

Sun/Moon icon button. Click cycles: system → light → dark → system. Tooltip shows current mode. Icon rotation animation on change.

---

## 3. Layout Redesign

### 3A. Dashboard Sidebar

**Width:** 240px (from 256px)

**Structure:**

```
Logo area (h-14, px-4, border-bottom)

Section: MAIN
  Overview
  My Widgets
  My Chats

Section: BUILD
  AI Builder (lock icon if no plan)

Section: INSIGHTS
  Analytics
  A/B Tests

Section: WORKSPACE
  Team
  Integrations

Section: ACCOUNT
  Billing
  Settings
```

**Nav item:** `h-8 px-2 mx-2 rounded-sm text-caption font-500`

- Default: `text-secondary`
- Hover: `bg-tertiary text-primary`
- Active: `bg-accent-subtle text-accent` (light) / `bg-white/8 text-white` (dark)

**Section labels:** `text-micro uppercase tracking-wider text-tertiary px-4 mt-6 mb-1`

**Bottom:** User avatar + name, compact. Click → dropdown (Settings, Billing, Log out).

**Mobile:** Overlay sidebar with slide animation. Hamburger in header.

### 3B. Dashboard Header

**Height:** h-12 (from h-16)

**Left:** Page title as breadcrumb (`text-caption font-500`)
**Right:** ThemeToggle + NotificationBell + User Avatar (28px circle)

User avatar click → dropdown menu: Settings, Billing, Log out.

No email text displayed in header — avatar is enough.

### 3C. Notification Bell

Functionality: unchanged (fetch, mark read, polling).

**Visual changes:**

- Badge: small dot (not number) when unread exists
- Dropdown: uses Card + standard list rows
- Empty state: icon + "All caught up" text
- Mark all read: Ghost button in dropdown header

---

## 4. Page Redesign Specifications

### 4A. Dashboard Overview

**Header:** Display title "Overview" + period pills (Secondary buttons, sm size) + "New Widget" Primary button (only primary on page)

**Stat cards (4-col grid):**

- Card component with `padding="md"`
- Label: Caption, text-tertiary
- Value: Display size (28px, font-700)
- Change: Caption, green (+) or red (-) with arrow icon
- No icons, no gradients, no glow

**Activity chart:**

- Card container
- Recharts AreaChart, single line, fill blue-500/8
- Grid: border-subtle color
- Tooltip: Card component, no glass effect
- Axis text: Caption size, text-tertiary

**Bottom grid (2-col):**

- Left: "Top Widgets" — Table component
  - Columns: Name, Chats, Satisfaction, Trend
- Right: "Recent Activity" — List rows
  - Dot (semantic color) + text + timeago

**Removed:** ambient glow, gradient stat icons, glow orbs, floating blur, decorative shadows

### 4B. My Widgets

**Default: Table view**

- Columns: Name | Type (Badge) | Status (Badge) | Created (Caption) | Actions
- Actions: Ghost buttons (Preview, Edit, Delete)
- Row hover: bg-tertiary

**Toggle:** Grid/List icon button in header

- Grid mode: 3-col Card grid with widget info

**Empty state:** Centered — 48px icon + "No widgets yet" Title + description Body + Primary button

### 4C. My Chats

**Table view (preserve current navigation pattern):**

- Columns: Client | Widget | Messages | Status (Badge) | Last Active
- Click row → navigate to chat detail (existing behavior)
- Status badges: Active (green), Ended (default), Building (blue)

**Removed:** cyan glow shadows, fancy hover effects

### 4D. AI Builder

**Minimal changes — preserve all functionality:**

- Update color palette to new tokens
- Font → Inter
- Buttons → Button component
- ContextPanel → new border/bg colors
- Chat interface: minimal visual updates only

**Do NOT touch:** streaming logic, SSE events, agent activity, template selector logic, state management

### 4E. Analytics

**Header:** "Analytics" Display + Dropdown date selector (7d/30d/90d/Custom)

**Stat cards:** Same pattern as Overview (4-col, Caption label + Display value + change)

**Charts (2-col grid):**

- Conversations over time: AreaChart, blue fill
- Top Questions: Table rows with count Badge right-aligned
- Hourly Heatmap: keep grid, update to blue opacity scale (accent-subtle based)
- Channel Distribution: horizontal BarChart (not progress bars)

**Widget filter:** Dropdown select (not inline buttons)

### 4F. A/B Tests

**Table view:**

- Columns: Name | Widget | Status (Badge) | Variants count | Visitors | Started | Actions

**Detail view (click row or expand):**

- Variant comparison Cards side by side
- Metrics: visitors, conversions, CVR%
- Winner: green Badge indicator

**Create:** Modal with name + widget selector + variant inputs

### 4G. Team

**Header:** "Team" Display + "Invite Member" Primary button (→ Modal)

**Modal:** Input (email) + Dropdown (role) + Primary button "Send Invite"

**Members Table:**

- Columns: Member (Avatar + name + email) | Role (Badge) | Joined | Actions
- Role badges: Owner=purple, Admin=blue, Editor=default, Viewer=default
- Actions: Ghost danger "Remove" (owner/admin only)

**Pending invites:** Separate section with "Pending" amber Badge

### 4H. Integrations

**Single grouped list:**

Section "Connected" (if any):

- Table rows: Icon + Name + Description + green Badge + Ghost danger "Disconnect"

Section "Available":

- Table rows: Icon + Name + Description + Secondary "Connect" button
- Pro-only: lock icon + purple "Pro Plan" Badge instead of button

**Connect modal:** Update to Modal component, keep existing logic

### 4I. Billing

**Current plan Card:** Plan name (Title) + price (Body) + status Badge + "Manage Subscription" Secondary button

**Usage section (new visual, data from existing API):**

- Progress bars showing usage vs limits
- Caption: reset date

**Plan comparison:** Table component with standard styling

### 4J. Settings

**Clean vertical form (Linear-style):**

Sections separated by border-subtle + spacing (no gradient accent lines, no icon boxes):

- **Profile:** Avatar upload area + name Input + email Input (readonly)
- **Password:** Current + New + Confirm inputs
- **Notifications:** Toggle switches
- **Danger Zone:** red border Card, "Delete Account" danger Button

**Save:** Fixed bottom bar with "Save Changes" Primary button, disabled until form dirty

### 4K. Onboarding

Already updated with Lucide icons. Additional changes:

- Switch to Inter font
- Use Button, Card components
- Apply theme tokens

### 4L. Landing Page

**Full redesign:**

- Clean white hero (light) / deep dark (dark theme)
- Large headline (48-64px) + subtitle + single Primary CTA + product screenshot
- Features: 3-col simple Cards (icon + title + description)
- How it works: 3 numbered steps
- Pricing: embedded on same page
- Social proof section (if available)
- Footer: clean links grid

**Removed:** aurora effects, mesh backgrounds, neon text, floating animations, gradient text, dot patterns

### 4M. Auth Modal

- Clean Modal component
- Tabs: Login / Sign up (underline active indicator, not gradient)
- Google OAuth: Secondary button with Google icon
- Form: Input components with label
- Submit: Primary button

### 4N. Pricing Page (plans/)

- Use standard Card components for plan comparison
- Highlight "Pro" with accent border
- Annual/Monthly Toggle component
- Feature list with check icons (green for included, text-tertiary for excluded)

### 4O. Error Page

- Centered layout
- Icon (48px, text-red) + Title + description + "Go Back" Secondary button + "Go Home" Ghost button

---

## 5. Theme Implementation

### 5A. CSS Variables

Defined in `globals.css` under `:root` (light) and `.dark` (dark). See Section 1B for full token list.

### 5B. Tailwind v4 Integration

CSS variables use `--wb-` prefix in `:root`/`.dark` to avoid collision. The `@theme inline` block (existing pattern in codebase) maps them to Tailwind utilities:

```css
/* In :root */
--wb-bg-primary: #ffffff;
--wb-bg-secondary: #f9fafb;
/* etc. */

/* In .dark */
--wb-bg-primary: #0a0a0f;
--wb-bg-secondary: #111118;
/* etc. */

/* Tailwind mapping (uses @theme inline, matching existing codebase pattern) */
@theme inline {
  --color-bg-primary: var(--wb-bg-primary);
  --color-bg-secondary: var(--wb-bg-secondary);
  --color-bg-tertiary: var(--wb-bg-tertiary);
  --color-border: var(--wb-border);
  --color-border-subtle: var(--wb-border-subtle);
  --color-text-primary: var(--wb-text-primary);
  --color-text-secondary: var(--wb-text-secondary);
  --color-text-tertiary: var(--wb-text-tertiary);
  --color-accent: var(--wb-accent);
  --color-accent-hover: var(--wb-accent-hover);
  --color-accent-subtle: var(--wb-accent-subtle);
}
```

Usage in JSX: `bg-bg-primary text-text-primary border-border`.

Note: `@theme inline` prevents Tailwind from outputting these as separate CSS custom properties — they reference the `--wb-*` variables directly. This is the existing pattern already used in the codebase's `globals.css`.

### 5C. ThemeProvider Component

Location: `src/components/ThemeProvider.tsx`

React context providing:

- `theme`: 'light' | 'dark' | 'system'
- `resolvedTheme`: 'light' | 'dark' (what's actually applied)
- `setTheme(theme)`: update preference, save to localStorage, toggle class

Wraps app in root `layout.tsx`.

### 5D. Flash Prevention

Inline `<script>` in root layout `<head>` that reads localStorage and sets `.dark` class before React hydrates. Prevents white flash on dark-preference devices.

**Critical:** The current `layout.tsx` has hardcoded `className="dark"` on `<html>` and `bg-[#0a0a0f]` on `<body>`. Both must be removed and replaced with dynamic ThemeProvider class management + `bg-bg-primary` token.

### 5F. Loading States

Skeleton pattern for both themes:

- Light: `bg-gray-100 animate-pulse rounded-md`
- Dark: `bg-white/5 animate-pulse rounded-md`

Using token: `bg-bg-tertiary animate-pulse rounded-md` (works in both themes automatically).

Skeleton shapes match content layout: rectangular bars for text, circles for avatars, full-width blocks for charts. No shimmer effect — just simple pulse.

The existing `loading.tsx` and `LoadingCard.tsx` will be restyled to use these patterns.

### 5G. Toast Notifications

Existing `Toast.tsx` component preserved and restyled:

- Position: bottom-right
- Light: `bg-white border shadow-md`
- Dark: `bg-bg-secondary border-border`
- Variants: success (green left-border), error (red), info (blue)
- Animation: slide-in from right, 200ms
- Auto-dismiss: 4 seconds

### 5E. System Preference Listener

`matchMedia('(prefers-color-scheme: dark)')` listener in ThemeProvider. When user preference is 'system', theme auto-updates if OS theme changes.

---

## 6. Migration Strategy

### Phase A: Foundation (no visual changes yet)

1. Install Inter font, configure in root layout
2. Write CSS variables in globals.css (:root + .dark)
3. Configure Tailwind v4 @theme mapping
4. Create ThemeProvider + ThemeToggle components
5. Create all ui/ components (Button, Card, Input, Badge, Modal, Table, Avatar, Dropdown, Toggle)
6. Add flash prevention script

### Phase B: Layout Shell

7. Redesign dashboard layout (sidebar groups + compact header + theme toggle)
8. Redesign NotificationBell with new components

### Phase C: Dashboard Pages

9. Overview page
10. My Widgets page
11. My Chats page
12. Analytics page
13. A/B Tests page
14. Team page
15. Integrations page
16. Billing page
17. Settings page
18. Onboarding page (update to new components)
19. AI Builder (minimal — colors/fonts only)

### Phase D: Public Pages

20. Landing page
21. Plans/Pricing page
22. Auth modal
23. Error page

### Phase E: Polish

24. Animation pass (fade/slide/spring where appropriate)
25. Responsive fine-tuning (all breakpoints)
26. Accessibility (ARIA labels, focus rings, keyboard nav)
27. Clean up old CSS (remove unused globals.css classes)

### Migration Rules

- One page per commit
- Run existing tests after each page
- No API changes, no state management changes, no routing changes
- If a page has tests, ensure they still pass
- Old CSS classes removed only after all pages migrated (Phase E)

---

## 7. Files Affected

### New Files

- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Input.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/Modal.tsx`
- `src/components/ui/Table.tsx`
- `src/components/ui/Avatar.tsx`
- `src/components/ui/Dropdown.tsx`
- `src/components/ui/Toggle.tsx`
- `src/components/ThemeProvider.tsx`
- `src/components/ThemeToggle.tsx`

### Modified Files

- `src/app/globals.css` — replace with new token system
- `src/app/layout.tsx` — Inter font, ThemeProvider, flash prevention script
- `src/app/dashboard/layout.tsx` — new sidebar + header
- `src/app/dashboard/page.tsx` — overview redesign
- `src/app/dashboard/widgets/page.tsx` — table view
- `src/app/dashboard/chats/page.tsx` — table view
- `src/app/dashboard/builder/page.tsx` — minimal color/font update
- `src/app/dashboard/integrations/page.tsx` — grouped list
- `src/app/dashboard/analytics/page.tsx` — new chart styling
- `src/app/dashboard/ab-tests/page.tsx` — table view
- `src/app/dashboard/team/page.tsx` — table + modal
- `src/app/dashboard/billing/page.tsx` — clean cards
- `src/app/dashboard/settings/page.tsx` — form layout
- `src/app/dashboard/onboarding/page.tsx` — component update
- `src/app/page.tsx` — landing page redesign
- `src/app/plans/page.tsx` — pricing redesign
- `src/app/error.tsx` — clean error page
- `src/components/AuthModal.tsx` — modal redesign
- `src/components/NotificationBell.tsx` — component update

### Unchanged Files (functionality preserved)

- All files in `src/app/api/` — no API changes
- All files in `src/lib/` — no logic changes
- All files in `src/models/` — no model changes
- `src/components/AuthProvider.tsx` — no auth logic changes
- `src/components/builder/` — minimal changes (colors only)
- All test files — must continue passing
