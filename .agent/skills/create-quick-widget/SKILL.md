---
name: create-quick-widget
description: Auto-create a demo AI chat widget by analyzing a client's website. Extracts colors, content, and builds a fully working widget.
---

# Quick Widget Builder

## Purpose

Create a demo widget for a potential client automatically. Visit their website, extract design + content, build and deploy a working widget.

**Input**: `username`, `email`, `website`
**Output**: Deployed widget in `quickwidgets/<clientId>/` + knowledge base + AI settings

**No user confirmation. No design questions. Auto-detect everything from the site.**

**Never write JSX or CSS manually.** Create `theme.json` → run generator → run build.

---

## Phase 1 — Site Analysis

### 1.1 Analyze Homepage

Use `WebFetch` on the client's website. Extract:

**Design** (exact hex values from CSS — never guess):

- Primary brand color (header bg, CTA buttons, links, accent elements)
- Secondary/accent color (hover states, secondary buttons)
- Background color (body bg — determines light vs dark theme)
- Font family (body CSS + Google Fonts `<link>` URL if present)
- Button border-radius (rounded >15px, slightly rounded 8-12px, sharp <5px)
- Overall feel: compact, standard, premium, or rounded

**Content**:

- Brand/company name
- Business type (dental, real estate, auto, hotel, etc.)
- Language (`<html lang="">` or content language)
- Navigation links (all URLs)
- Phone, email, address
- Tagline/slogan

**WebFetch prompt:**

```
Analyze this website's VISUAL DESIGN and CONTENT. Extract:

DESIGN: 1. Primary brand color (exact hex from header/buttons/links)
2. Secondary color (exact hex) 3. Body background color (exact hex)
4. Font family from CSS + Google Fonts URL if present
5. Button border-radius style 6. Overall design feel
7. Light or dark theme?

CONTENT: 8. Brand name 9. Business type 10. Language
11. ALL nav links with URLs 12. Tagline 13. Phone/email/address
14. Brief company description
```

### 1.2 Crawl Key Pages

Visit 5-8 pages from navigation (prioritize: About, Services, Pricing, FAQ, Contact).

**Per-page prompt:**

```
Extract ALL text content: headings, service descriptions, prices,
FAQ Q&A, contact info, hours, key facts, guarantees.
Format as clean structured text.
```

### 1.3 Light vs Dark Decision

| Body Background                   | Theme           |
| --------------------------------- | --------------- |
| White/light (#fff, #f5f5f5, etc.) | `isDark: false` |
| Dark (#000, #111, #1a1a1a, etc.)  | `isDark: true`  |

If unsure, check text color — light text on dark bg = dark theme.

---

## Phase 2 — Create Configs

### 2.1 Create Client Directory

```bash
mkdir -p .agent/widget-builder/clients/<clientId>/src/{components,hooks}
mkdir -p .agent/widget-builder/clients/<clientId>/knowledge
```

### 2.2 Write widget.config.json

> **Exact schema documented in [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md)**

Create `.agent/widget-builder/clients/<clientId>/widget.config.json`:

```json
{
  "clientId": "<clientId>",
  "botName": "<Brand> AI",
  "welcomeMessage": "<greeting with **markdown** — company intro + how to help>",
  "inputPlaceholder": "Ask about our services...",
  "quickReplies": ["<option1>", "<option2>", "<option3>"],
  "avatar": { "type": "initials", "initials": "<2 letters>" },
  "design": { "position": "bottom-right" },
  "features": {
    "sound": true,
    "voiceInput": true,
    "feedback": true,
    "streaming": true
  }
}
```

**Quick replies** — match business type and language. See table in [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md#quick-replies-by-business-type).

### 2.3 Write theme.json

> **Full schema with 50+ fields documented in [THEME_REFERENCE.md](./THEME_REFERENCE.md)**

Create `.agent/widget-builder/clients/<clientId>/theme.json` with all color/layout parameters derived from the site's actual extracted colors.

**Key rules:**

- Every hex code must come from actual site CSS, never guessed
- Derive lighter/darker shades from the primary color (see derivation table in THEME_REFERENCE.md)
- If `isDark: true`, include all 8 surface/text fields
- Match layout preset to site's visual feel (compact/standard/premium/rounded)

---

## Phase 3 — Generate, Build, Deploy

### 3.1 Generate Source Files

```bash
node .agent/widget-builder/scripts/generate-single-theme.js <clientId>
```

Produces 6 files from theme.json. **Never edit generated files manually.**

### 3.2 Build Widget

```bash
node .agent/widget-builder/scripts/build.js <clientId>
```

### 3.3 Validate Build

**MANDATORY — run this check before deploying:**

```bash
ls -la .agent/widget-builder/dist/script.js
```

Verify:

- File exists
- Size is 200KB-600KB (typical ~433KB)
- No build errors in output

### 3.4 Deploy

```bash
mkdir -p quickwidgets/<clientId>
cp .agent/widget-builder/dist/script.js quickwidgets/<clientId>/script.js
```

### 3.5 Write info.json

> **Exact schema in [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md#infojson-schema)**

Write `quickwidgets/<clientId>/info.json`:

```json
{
  "clientId": "<clientId>",
  "username": "<username>",
  "name": "<Brand Name>",
  "email": "<email or empty string>",
  "website": "<website URL>",
  "phone": "<phone or null>",
  "addresses": ["<address or empty>"],
  "instagram": null,
  "clientType": "quick",
  "createdAt": "<ISO date>"
}
```

**CRITICAL: `username` field is REQUIRED.** The admin panel API uses this field to create Client records. Without it, the admin panel will crash with a 500 error.

---

## Phase 4 — Knowledge Base & AI

### 4.1 Compile Knowledge

Write `.agent/widget-builder/clients/<clientId>/knowledge/context.md` with all scraped content (about, services, pricing, FAQ, contact info).

### 4.2 Upload Knowledge

```bash
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"clientId": "<clientId>", "text": "<knowledge text>", "source": "quick-widget-builder"}'
```

### 4.3 Set AI Settings

```bash
curl -X PUT http://localhost:3000/api/ai-settings/<clientId> \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "systemPrompt": "<system prompt built from all site content>",
    "greeting": "<same as welcomeMessage>",
    "temperature": 0.7,
    "maxTokens": 1024,
    "topK": 5
  }'
```

**System prompt template:**

```
You are an AI assistant for <Brand Name> — <description>.

Company information: <about page content>
Services: <services with prices>
FAQ: <FAQ content>
Contact: Phone: / Email: / Address: / Hours:

Instructions:
- Answer based ONLY on information above
- Be helpful, professional, friendly
- If unsure, suggest contacting the company directly
- Respond in <detected language>
- Keep answers concise (2-4 sentences unless more needed)
```

---

## Phase 5 — Spreadsheet & Notification

### 5.1 Add to "Проверенные лиды" Spreadsheet

Find today's spreadsheet:

```bash
curl -s "http://localhost:3000/api/integrations/sheets/search?name=DD.MM.YYYY%20Проверенные%20лиды" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

If not found, try `Квалифицированные лиды`. If still not found — skip but warn user.

Read current data, find next empty row, append:

```bash
curl -s -X POST "http://localhost:3000/api/integrations/sheets/update" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"spreadsheetId": "ID", "range": "A<ROW>:D<ROW>", "values": [["<email>", "<website>", "<username>", "TRUE"]]}'
```

### 5.2 Telegram Notification

**Only when run standalone** (not from mass-quick-widgets):

```bash
curl -s -X POST "http://localhost:3000/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"message": "✅ <b>Quick Widget Created</b>\n\n👤 Client: <username>\n🌐 Website: <website>\n📧 Email: <email or N/A>\n\n📦 Embed:\n<code>&lt;script src=\"https://winbix-ai.pp.ua/quickwidgets/<clientId>/script.js\"&gt;&lt;/script&gt;</code>"}'
```

### 5.3 Output to User

```
✅ Quick widget created for <Brand Name>!

📋 Summary: Brand: <name> | Colors: <primary>/<accent> | Theme: <light/dark>
🔗 Demo: http://localhost:3000/demo/client-website?client=<clientId>&website=<encoded_url>
📦 Embed: <script src="https://winbix-ai.pp.ua/quickwidgets/<clientId>/script.js"></script>
```

---

## Validation Checklist

Run through this after every build. See [VALIDATION.md](./VALIDATION.md) for details.

- [ ] `widget.config.json` has `clientId`, `botName`, `welcomeMessage`, `quickReplies`
- [ ] `theme.json` passes generator validation (all required fields present)
- [ ] `generate-single-theme.js` ran without errors
- [ ] `build.js` ran without errors
- [ ] `dist/script.js` exists and is 200-600KB
- [ ] `quickwidgets/<clientId>/script.js` deployed
- [ ] `quickwidgets/<clientId>/info.json` has `username` field
- [ ] Knowledge uploaded (API returned success)
- [ ] AI settings set (API returned success)

---

## Key Constraints

- **Tech**: Preact + Vite (IIFE), Tailwind CSS **v3** (NOT v4), Shadow DOM
- **Bundle**: < 600KB typical
- **Deploy to**: `quickwidgets/` (NOT `widgets/`)
- **Sequential builds only**: build.js copies client src to shared dir — only one build at a time
- **Never modify**: `vite.config.js`, `postcss.config.cjs`, `tailwind.config.js`
- **Never write JSX/CSS manually** — use theme.json + generator
- **Icons**: `lucide-preact` (NOT `lucide-react`)
- **Hooks are shared**: Never put hooks in client directories — they live in `src/hooks/` only
