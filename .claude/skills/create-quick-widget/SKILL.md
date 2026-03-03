---
name: create-quick-widget
description: Auto-create a demo AI chat widget by analyzing a client's website. Extracts colors, content, builds and deploys a working widget.
---

# Quick Widget Builder

**Input**: `username`, `email`, `website`
**Output**: Deployed widget in `quickwidgets/<clientId>/` + knowledge base + AI settings

No user confirmation needed. Auto-detect everything from the site. Use `theme.json` → generator → build (never write JSX/CSS manually).

---

## Phase 1 — Site Analysis

### 1.1 Analyze Homepage

WebFetch the client's website with this prompt:

```
Analyze this website's VISUAL DESIGN and CONTENT. Extract:
DESIGN: 1. Primary brand color (exact hex from header/buttons/links)
2. Secondary color (exact hex) 3. Body background color (exact hex)
4. Font family from CSS + Google Fonts URL if present
5. Button border-radius style 6. Overall design feel
7. Light or dark theme?
CONTENT: 8. Brand name 9. Business type 10. Language
11. ALL nav links with URLs 12. Tagline
13. Phone number (exact, for contact bar)
14. Email address (exact, for contact bar)
15. Physical address(es)
16. Website URL (for contact bar)
17. Brief company description
```

### 1.2 Crawl Key Pages

Visit 5-8 pages from navigation (About, Services, Pricing, FAQ, Contact). Per-page prompt:

```
Extract ALL text content: headings, service descriptions, prices,
FAQ Q&A, contact info, hours, key facts, guarantees.
Format as clean structured text.
```

### 1.3 Light vs Dark

White/light bg (#fff, #f5f5f5) → `isDark: false`. Dark bg (#000, #111, #1a1a1a) → `isDark: true`.

---

## Phase 2 — Create Configs

### 2.1 Create directories

```bash
mkdir -p .claude/widget-builder/clients/<clientId>/src/{components,hooks}
mkdir -p .claude/widget-builder/clients/<clientId>/knowledge
```

### 2.2 Write widget.config.json

Schema: [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md). Quick replies by business type: [CONFIG_REFERENCE.md#quick-replies-by-business-type](./CONFIG_REFERENCE.md#quick-replies-by-business-type).

**IMPORTANT**: Always include:

- `contacts` object with phone, email, and website from site analysis (enables the contact bar below the header)
- `features.proactive` with a short nudge message (appears after 8s to engage visitors)
- All features default to `true` — only set to `false` if you have a reason to disable

### 2.3 Write theme.json

Full schema + examples: [THEME_REFERENCE.md](./THEME_REFERENCE.md). Every hex must come from actual site CSS. Match layout preset to site's visual feel.

---

## Phase 3 — Generate, Build, Deploy

```bash
# 1. Generate 7 source files from theme.json (index.css, main.jsx, Widget.jsx, ChatMessage.jsx, QuickReplies.jsx, MessageFeedback.jsx, RichBlocks.jsx)
node .claude/widget-builder/scripts/generate-single-theme.js <clientId>

# 2. Build widget
node .claude/widget-builder/scripts/build.js <clientId>

# 3. Validate: file exists, 200-600KB
ls -la .claude/widget-builder/dist/script.js

# 4. Deploy
mkdir -p quickwidgets/<clientId>
cp .claude/widget-builder/dist/script.js quickwidgets/<clientId>/script.js
```

### Write info.json

Schema: [CONFIG_REFERENCE.md#infojson-schema](./CONFIG_REFERENCE.md#infojson-schema). **`username` is REQUIRED** — missing username crashes admin panel.

Write `quickwidgets/<clientId>/info.json`.

### 3.3 Check Frameability & Capture Screenshot

After deploying, check if the client's website can be embedded in an iframe (for the demo page). Store the result in `info.json` so the demo page can skip the iframe instantly for blocked sites.

```bash
# Check frameability (GET request, check X-Frame-Options / CSP headers)
# Store result as "frameable": true/false in info.json

# Capture screenshot via thum.io for iframe-blocked fallback
curl -o quickwidgets/<clientId>/preview.png \
  "https://image.thum.io/get/width/1440/crop/900/<website_url>"
```

Update info.json with `"frameable": true/false` and `"hasPreview": true/false`.

The `captureScreenshot()` function in `src/lib/screenshot.ts` does this automatically when called from the `generate-demo` API route. For CLI-based creation, use the batch script: `node scripts/batch-check-frameable.js`.

---

## Phase 4 — Knowledge Base & AI

### 4.1 Save & Upload Knowledge

Write all scraped content to `.claude/widget-builder/clients/<clientId>/knowledge/context.md`.

Upload:

```bash
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"clientId":"<clientId>","text":"<knowledge text>","source":"quick-widget-builder"}'
```

### 4.2 Set AI Settings

```bash
curl -X PUT http://localhost:3000/api/ai-settings/<clientId> \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"systemPrompt":"<prompt>","greeting":"<same as welcomeMessage>","temperature":0.7,"maxTokens":2048,"topK":5}'
```

System prompt structure:

```
You are an AI assistant for <Brand Name> — <description>.
Company information: <about>
Services: <services with prices>
FAQ: <FAQ>
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

Search: `GET /api/integrations/sheets/search?name=DD.MM.YYYY%20Проверенные%20лиды` (fallback: `Квалифицированные лиды`). If not found — skip.

Read current data, find next empty row, append `[email, website, username, "TRUE"]` via `POST /api/integrations/sheets/update`.

### 5.2 Telegram Notification

**Only when run standalone** (not from mass-quick-widgets):

```bash
curl -s -X POST "http://localhost:3000/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"message":"✅ <b>Quick Widget Created</b>\n\n👤 Client: <username>\n🌐 Website: <website>\n📧 Email: <email or N/A>\n\n📦 Embed:\n<code>&lt;script src=\"https://winbix-ai.xyz/quickwidgets/<clientId>/script.js\"&gt;&lt;/script&gt;</code>"}'
```

### 5.3 Output to User

```
✅ Quick widget created for <Brand Name>!
📋 Summary: Brand: <name> | Colors: <primary>/<accent> | Theme: <light/dark>
🔗 Demo: http://localhost:3000/demo/client-website?client=<clientId>&website=<encoded_url>
📦 Embed: <script src="https://winbix-ai.xyz/quickwidgets/<clientId>/script.js"></script>
```

---

## Validation

Run [VALIDATION.md](./VALIDATION.md) checks after every build.
