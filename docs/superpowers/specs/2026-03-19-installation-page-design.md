# Installation Page — Design Spec

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a dedicated "Installation" page to the dashboard sidebar that provides platform-specific widget installation instructions with a widget selector dropdown.

**Architecture:** Single new page (`/dashboard/installation`) + sidebar link in BUILD section. Reuses existing client list API. All client-side rendering, no new API routes needed.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4 (main app), lucide-react icons.

---

## 1. Sidebar Placement

**Section:** BUILD (third item, after Integrations)

```
BUILD
├── AI Builder        (/dashboard/builder)       [Sparkles]
├── Integrations      (/dashboard/integrations)  [Plug]
└── Installation      (/dashboard/installation)  [Download]
```

**File to modify:** `src/app/dashboard/layout.tsx`

- Add `{ name: 'Installation', href: '/dashboard/installation', icon: Download }` to the BUILD nav group

---

## 2. Page Route

**Path:** `/dashboard/installation`
**File:** `src/app/dashboard/installation/page.tsx`

---

## 3. Page Structure (top to bottom)

### 3.1 Header

- Title: "Install Widget on Your Site"
- Subtitle: "Copy one line of code and paste it into your website"

### 3.2 Widget Selector

- Full-width styled dropdown (custom select or combobox)
- Each item displays:
  - Widget type icon (Zap for Quick, Globe for Production)
  - Widget name (bold)
  - Client ID (muted, right-aligned or below)
- Empty state when no widgets: "No widgets yet. [Create one in AI Builder →](/dashboard/builder)"
- On selection: embed code updates across the entire page
- Default: first widget pre-selected (if any exist)

**Data source:** `GET /api/clients` (existing endpoint, returns all widgets with clientId, name, clientType)

### 3.3 Embed Code Card

- Dark rounded card (`bg-gray-900` or similar dark surface)
- Monospace code: `<script src="https://winbixai.com/quickwidgets/{clientId}/script.js"></script>`
  - For production widgets: `https://winbixai.com/widgets/{clientId}/script.js`
- Copy button (right side): clipboard icon → checkmark + "Copied!" for 2 seconds
- Helper text below: "Paste this snippet before `</body>` on every page where you want the widget"

### 3.4 Platform Tabs

Horizontal tab bar with platform icons/logos. 6 platforms:

| Tab                | Icon                 | Key Steps                                                                                                       |
| ------------------ | -------------------- | --------------------------------------------------------------------------------------------------------------- |
| Any Website (HTML) | `Code`               | Open HTML → paste before `</body>` → save                                                                       |
| WordPress          | WP logo or `Blocks`  | Appearance → Theme Editor → `footer.php` → paste before `</body>`. Alt: use "Insert Headers and Footers" plugin |
| Wix                | Wix logo or `Layout` | Settings → Custom Code → Add Code → paste → set to "Body - end" → Apply                                         |
| Shopify            | `ShoppingBag`        | Online Store → Themes → Edit Code → `theme.liquid` → paste before `</body>` → Save                              |
| Tilda              | `Palette`            | Site Settings → More → HTML code → paste into "Before `</body>`" field → Save & Publish                         |
| Webflow            | `Globe`              | Project Settings → Custom Code → Footer Code → paste → Save → Publish                                           |

Each tab content:

- Numbered steps (1, 2, 3...) with clear descriptions
- Code snippets where needed (with copy buttons)
- Platform-specific tips/warnings (highlighted callout boxes)
- "After pasting, publish/save your site for changes to take effect"

### 3.5 Verification Section

- Heading: "Verify Installation"
- Checklist (visual, not interactive):
  1. "Open your website in a new tab"
  2. "Look for the chat widget in the bottom-right corner"
  3. "Click it to open — send a test message"
  4. "Check that the bot responds with knowledge-based answers"
- Button: "Preview Widget →" — opens `https://winbixai.com/demo/client-website?client={clientId}&website={website}` in new tab (if website URL available from widget info)

### 3.6 Troubleshooting Accordion

Expandable FAQ sections:

| Question                               | Answer                                                                                                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| "Widget doesn't appear"                | Check script tag placement, ensure it's before `</body>`, check browser console for errors, verify no Content Security Policy blocks |
| "Widget appears but chat doesn't work" | Check knowledge base has content, verify API is reachable, check browser console for 4xx/5xx errors                                  |
| "Styling conflicts with my site"       | Widget uses Shadow DOM isolation. If issues persist, check z-index conflicts (widget uses z-index 9999)                              |
| "Widget loads slowly"                  | Script is ~150KB gzipped. Ensure no render-blocking placement. Add `defer` attribute if needed                                       |
| "How to remove the widget"             | Simply remove the `<script>` tag from your site code                                                                                 |

---

## 4. UI/UX Quality Standards

The page should feel like it was designed by a senior Apple designer:

- **Clean whitespace** — generous padding, breathing room between sections
- **Visual hierarchy** — clear section separation, consistent heading sizes
- **Micro-interactions** — smooth tab transitions, copy button feedback animation
- **Progressive disclosure** — troubleshooting is collapsed by default
- **Responsive** — works perfectly on mobile (tabs become scrollable or stacked)
- **Dark theme compatible** — follows existing dashboard dark theme
- **Consistent with existing pages** — matches the visual language of the dashboard (same card styles, same button styles, same typography)

---

## 5. Edge Cases

- **No widgets:** Show empty state with CTA to AI Builder
- **Widget deleted while on page:** Graceful fallback — reset selector, show "Select a widget"
- **Very long widget list:** Dropdown should be scrollable (max-height with overflow)
- **Mobile:** Tabs become horizontally scrollable; embed code card wraps properly
- **Copy on HTTP:** `navigator.clipboard` may fail — fallback to `document.execCommand('copy')`

---

## 6. What NOT to Build

- No new API routes (use existing `GET /api/clients`)
- No database changes
- No analytics tracking (can be added later)
- No "auto-detect platform" feature
- No actual installation verification endpoint (manual checklist only)

---

## 7. Files to Create/Modify

| Action | File                                      | Purpose                                        |
| ------ | ----------------------------------------- | ---------------------------------------------- |
| Create | `src/app/dashboard/installation/page.tsx` | The installation page                          |
| Modify | `src/app/dashboard/layout.tsx`            | Add "Installation" to BUILD section in sidebar |

---

## 8. Acceptance Criteria

1. "Installation" link appears in sidebar under BUILD, after Integrations
2. Page loads at `/dashboard/installation`
3. Widget selector dropdown lists all user's widgets
4. Selecting a widget updates embed code everywhere on the page
5. Copy button copies correct embed code to clipboard
6. All 6 platform tabs show correct, actionable instructions
7. Troubleshooting accordion expands/collapses
8. Empty state shown when user has no widgets
9. Page matches existing dashboard design language (dark theme, cards, typography)
10. Responsive — usable on mobile
