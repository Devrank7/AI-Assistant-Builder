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

### 1.2 Check Key Pages (for theme/config only)

Optionally visit 1-2 key pages (About, Services) via WebFetch **only** to extract design info (colors, fonts) or contact details not found on the homepage. Do NOT manually scrape for knowledge — Phase 4 uses the deep-crawl API which automatically crawls ALL pages (up to 50) server-side.

### 1.3 Light vs Dark

White/light bg (#fff, #f5f5f5) → `isDark: false`. Dark bg (#000, #111, #1a1a1a) → `isDark: true`.

---

## Phase 2 — Create Configs

### 2.1 Create directories

```bash
mkdir -p .agent/widget-builder/clients/<clientId>/src/{components,hooks}
mkdir -p .agent/widget-builder/clients/<clientId>/knowledge
```

### 2.2 Write widget.config.json

Schema: [CONFIG_REFERENCE.md](./CONFIG_REFERENCE.md). Quick replies by business type: [CONFIG_REFERENCE.md#quick-replies-by-business-type](./CONFIG_REFERENCE.md#quick-replies-by-business-type).

**IMPORTANT**: Always include:

- `contacts` object with phone, email, and website from site analysis (enables the contact bar below the header)
- `features.proactive` with a short nudge message (appears after 8s to engage visitors)
- All features default to `true` — only set to `false` if you have a reason to disable
- `welcomeMessage` (greeting) must be **180 characters or less** — it gets truncated automatically but write it short from the start

### 2.3 Write theme.json

Full schema + examples: [THEME_REFERENCE.md](./THEME_REFERENCE.md). Every hex must come from actual site CSS. Match layout preset to site's visual feel.

---

## Phase 3 — Generate, Build, Deploy

```bash
# 1. Generate 7 source files from theme.json (index.css, main.jsx, Widget.jsx, ChatMessage.jsx, QuickReplies.jsx, MessageFeedback.jsx, RichBlocks.jsx)
node .agent/widget-builder/scripts/generate-single-theme.js <clientId>

# 2. Build widget
node .agent/widget-builder/scripts/build.js <clientId>

# 3. Validate: file exists, 200-600KB
ls -la .agent/widget-builder/dist/script.js

# 4. Deploy
mkdir -p quickwidgets/<clientId>
cp .agent/widget-builder/dist/script.js quickwidgets/<clientId>/script.js
```

### Write info.json

Schema: [CONFIG_REFERENCE.md#infojson-schema](./CONFIG_REFERENCE.md#infojson-schema). **`username` is REQUIRED** — missing username crashes admin panel.

Write `quickwidgets/<clientId>/info.json`.

---

## Phase 4 — Knowledge Base & AI

### 4.1 Deep Crawl & Upload Knowledge

Use the deep-crawl endpoint to automatically crawl ALL pages (up to 50) and upload everything as knowledge chunks. This replaces manual WebFetch scraping — the server-side crawler uses sitemap.xml, WordPress API, and BFS link discovery to get ALL content.

```bash
curl -X POST http://localhost:3000/api/knowledge/deep-crawl \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{"clientId":"<clientId>","websiteUrl":"<website URL>","brandName":"<Brand Name>","replace":true}'
```

The response includes crawl stats (pages found, chars extracted, strategies used) and knowledge upload results (chunks created). Verify that `savedChunks > 0` in the response.

**Note:** This replaces the old manual approach of WebFetch-crawling 5-8 pages. The deep crawler gets ALL pages automatically.

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
  -d '{"message":"✅ <b>Quick Widget Created</b>\n\n👤 Client: <username>\n🌐 Website: <website>\n📧 Email: <email or N/A>\n\n📦 Embed:\n<code>&lt;script src=\"https://winbix-ai.pp.ua/quickwidgets/<clientId>/script.js\"&gt;&lt;/script&gt;</code>"}'
```

### 5.3 Output to User

```
✅ Quick widget created for <Brand Name>!
📋 Summary: Brand: <name> | Colors: <primary>/<accent> | Theme: <light/dark>
🔗 Demo: http://localhost:3000/demo/client-website?client=<clientId>&type=quick&website=<encoded_url>
📦 Embed: <script src="https://winbix-ai.pp.ua/quickwidgets/<clientId>/script.js"></script>
```

---

## Critical Notes

### Demo Link Must Include `type=quick`

Demo links for quick widgets MUST include `type=quick` parameter:

```
/demo/client-website?client=<clientId>&type=quick&website=<encoded_url>
```

Without `type=quick`, the demo page loads widgets from `/widgets/` instead of `/quickwidgets/`, causing 404 errors or loading the wrong widget.

### API Base URL Detection — Handled by Vite Banner

The `vite.config.js` injects an API base URL auto-detection script via Rollup `banner` option. This runs post-build and detects the server origin from the script tag's `src` attribute (`/quickwidgets/` or `/widgets/`).

**Do NOT** add API base URL detection code to `main.jsx` — Vite tree-shakes it out, and Prettier auto-format will strip manual edits. The banner approach in `vite.config.js` is the correct and only solution.

### Never Edit main.jsx for Initialization Code

VSCode Prettier auto-format runs on save and will strip any manually added code from `main.jsx`. All initialization code (API base URL detection, Google Fonts loading) is handled by the Rollup `banner` in `vite.config.js`.

### AI Settings — Always Set Company Name

The system prompt MUST include the client's company name (e.g., "You are an AI assistant for <Brand Name>"). Without this, the default prompt is generic and the AI may respond as "WinBix AI" instead of the client's company. The `greeting` field should match the `welcomeMessage` from widget.config.json.

---

## Validation

Run [VALIDATION.md](./VALIDATION.md) checks after every build.
