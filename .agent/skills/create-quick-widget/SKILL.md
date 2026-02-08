---
name: create-quick-widget
description: Quickly creates a demo AI chat widget by auto-analyzing a client's website. Requires only username, email, and website URL.
---

# Quick Widget Builder Skill

## 1. PURPOSE

Create a demo widget for a potential client **as fast as possible**. This is used to make demo videos showing how the widget looks on the client's website — BEFORE we even contact them.

**Input**: Only 3 fields — `username`, `email`, `website`
**Output**: A fully working widget deployed and ready for demo

**NO user confirmation loops. NO asking for design preferences. Auto-detect everything from the website.**

---

## 2. INPUT PARSING

Extract these 3 fields from the user's message:

```
- username: <string>   → becomes clientId (lowercase, no spaces, use hyphens)
- email: <string>      → client email
- website: <string>    → full URL with https://
```

Optional fields (use if provided, otherwise auto-detect):

- Language override
- Theme override (light/dark)
- Position override (left/right)
- Extra business context

---

## 3. PHASE 1 — SITE ANALYSIS

### 3.1 Visit Homepage

Use `WebFetch` to load the client's website homepage. Extract:

1. **Brand Name** — from `<title>`, `<meta og:site_name>`, `<h1>`, or logo text
2. **Primary Colors** — from CSS variables, dominant background/accent colors, brand colors
3. **Font Family** — from `font-family` declarations or Google Fonts links
4. **Theme** — light or dark (based on background color luminance)
5. **Language** — from `<html lang="">` attribute or content language
6. **Business Type** — infer from content (dental, auto, hotel, restaurant, ecommerce, etc.)
7. **Navigation Links** — all `<nav>` links, header links, footer links

**Prompt for WebFetch homepage:**

```
Analyze this website and extract:
1. Brand/company name
2. Primary brand colors (hex codes) - look at headers, buttons, accents, links
3. Font family used
4. Is it a light or dark themed site?
5. What language is the site in?
6. What type of business is this? (dental, auto repair, hotel, restaurant, law firm, ecommerce, construction, etc.)
7. List ALL navigation links (About, Services, Pricing, FAQ, Contact, etc.) with their full URLs
8. Main tagline or slogan
9. Phone number, address, email if visible
10. Brief description of what the company does
```

### 3.2 Crawl Key Pages

Visit up to **5-8 important pages** found in navigation (prioritize in this order):

1. About / О компании
2. Services / Услуги
3. Pricing / Цены
4. FAQ / Вопросы
5. Contact / Контакты
6. Any other informative page

**Prompt for each page:**

```
Extract ALL text content from this page. Include:
- Headings and subheadings
- Service descriptions with prices if available
- FAQ questions and answers
- Contact information (phone, email, address, hours)
- Any key facts, guarantees, or unique selling points
Format as clean structured text.
```

### 3.3 Compile Analysis

After visiting all pages, compile a complete picture:

```
SITE ANALYSIS:
- Brand: <name>
- Type: <business type>
- Language: <ru/en/uk/etc>
- Colors: primary=#hex, accent=#hex, bg=#hex, text=#hex
- Font: <font family>
- Theme: light/dark
- Tagline: <tagline>
- Phone: <phone>
- Email: <email>
- Address: <address>
- Services: <list>
- Key FAQ: <list>
```

---

## 4. PHASE 2 — AUTO-GENERATE CONFIGURATION

Based on site analysis, automatically decide everything:

### 4.1 Design Decisions

| Decision          | Rule                                            |
| ----------------- | ----------------------------------------------- |
| **Primary Color** | Use the site's main brand/accent color          |
| **Accent Color**  | Slightly lighter/shifted version of primary     |
| **Background**    | White for light sites, dark gray for dark sites |
| **Text Color**    | Dark gray for light bg, white for dark bg       |
| **Theme**         | Match the site's theme (light/dark)             |
| **Position**      | `bottom-right` (default)                        |
| **Button Style**  | Rounded square with brand color gradient        |
| **Header Style**  | Gradient using primary → accent colors          |

### 4.2 Bot Configuration

| Field             | Rule                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Bot Name**      | `<Brand> AI` or `<Brand> Помощник` (match site language)                                                            |
| **Greeting**      | Auto-generate based on business type and language. Include bold company name, brief value prop, and ask how to help |
| **Tone**          | `professional_friendly` (default)                                                                                   |
| **Quick Replies** | 3-4 options based on business type (see table below)                                                                |

### 4.3 Quick Reply Templates by Business Type

| Business Type | Quick Replies (RU)                                 | Quick Replies (EN)                               |
| ------------- | -------------------------------------------------- | ------------------------------------------------ |
| Dental        | Записаться на приём, Цены на услуги, Как добраться | Book appointment, Service prices, How to find us |
| Auto Repair   | Записать авто на ТО, Узнать цены, Часы работы      | Book service, Get pricing, Working hours         |
| Hotel         | Забронировать номер, Посмотреть номера, Трансфер   | Book a room, View rooms, Airport transfer        |
| Restaurant    | Забронировать столик, Посмотреть меню, Доставка    | Reserve a table, View menu, Delivery             |
| Ecommerce     | Помощь с заказом, Условия доставки, Возврат товара | Order help, Shipping info, Returns               |
| Law Firm      | Бесплатная консультация, Наши услуги, Стоимость    | Free consultation, Our services, Pricing         |
| Construction  | Рассчитать стоимость, Наши проекты, Сроки работ    | Get a quote, Our projects, Timeline              |
| Generic       | О компании, Наши услуги, Контакты                  | About us, Our services, Contact                  |

If the site language is detected, use the matching column. Otherwise default to the site's language.

### 4.4 System Prompt Generation

Compose a system prompt from all gathered content:

```
You are an AI assistant for <Brand Name> — <brief description>.

Company information:
<All extracted text from About page>

Services:
<All services with descriptions and prices>

FAQ:
<All FAQ content>

Contact information:
- Phone: <phone>
- Email: <email>
- Address: <address>
- Working hours: <hours>

Instructions:
- Answer questions based ONLY on the information above
- Be helpful, professional, and friendly
- If you don't know the answer, suggest contacting the company directly
- Respond in <detected language>
- Keep answers concise (2-4 sentences) unless more detail is needed
```

---

## 5. PHASE 3 — BUILD WIDGET

### 5.1 Create Client Directory

```bash
mkdir -p .agent/widget-builder/clients/<client_id>/src/{components,hooks}
mkdir -p .agent/widget-builder/clients/<client_id>/knowledge
```

### 5.2 Write widget.config.json

Create `.agent/widget-builder/clients/<client_id>/widget.config.json`:

```json
{
  "clientId": "<client_id>",
  "bot": {
    "name": "<Auto-generated bot name>",
    "greeting": "<Auto-generated greeting with **markdown**>",
    "tone": "professional_friendly"
  },
  "design": {
    "style": "<auto-detected>",
    "position": "bottom-right"
  },
  "features": {
    "streaming": true,
    "imageUpload": false,
    "quickReplies": {
      "enabled": true,
      "starters": ["<auto-generated>", "<auto-generated>", "<auto-generated>"]
    },
    "feedback": true,
    "sound": true,
    "leads": false,
    "integrations": {}
  }
}
```

### 5.3 Write Component Files

Create all files in `.agent/widget-builder/clients/<client_id>/src/`:

#### `index.css`

- Set `:host` CSS variables matching the site's color palette
- Include standard Tailwind directives
- Include scrollbar-hide, font smoothing, reduced-motion support
- Set font-family matching the site's fonts

#### `components/Widget.jsx`

- Main container with header, messages area, input form, toggle button
- Use brand colors for header gradient
- Size: 360px wide, 480-520px tall
- Toggle button: 14x14 rounded-2xl with brand color
- Must use `AnimatePresence` from framer-motion
- Imports from `lucide-preact`
- Reads config from `window.__WIDGET_CONFIG__`

#### `components/ChatMessage.jsx`

- Bot messages: white/light bg with subtle border (light theme) or dark glass (dark theme)
- User messages: gradient using brand primary → accent colors
- Markdown rendering via `react-markdown`
- Relative timestamps in the site's language
- Copy button on hover for bot messages

#### `components/QuickReplies.jsx`

- Horizontal scrollable quick reply chips
- Styled with brand colors (light tint bg, brand color text)
- Spring animations on hover/tap

#### `hooks/useChat.js`

- **MUST** send exact format to `/api/chat/stream`:
  ```json
  {
    "clientId": "<client_id>",
    "message": "<user message>",
    "conversationHistory": [{ "role": "user|assistant", "content": "..." }],
    "sessionId": "<session_id>"
  }
  ```
- SSE parsing: `data: {"token": "..."}` and `data: [DONE]`
- localStorage persistence (last 50 messages)
- Offline detection
- Error handling with retry

> **CRITICAL**: Refer to the full `create-widget` skill (`.agent/skills/create-widget/SKILL.md`) Section 4.3 for the complete useChat.js reference implementation. The hook MUST match the API contract exactly.

### 5.4 Build & Deploy

```bash
# Build
node .agent/widget-builder/scripts/build.js <client_id>

# Verify build output
ls -la .agent/widget-builder/dist/script.js

# Deploy
mkdir -p widgets/<client_id>
cp .agent/widget-builder/dist/script.js widgets/<client_id>/script.js
```

### 5.5 Write info.json

Write `widgets/<client_id>/info.json`:

```json
{
  "name": "<Brand Name>",
  "clientId": "<client_id>",
  "username": "<username>",
  "email": "<email>",
  "website": "<website>",
  "phone": "<phone from site or null>",
  "addresses": ["<address from site or empty>"],
  "instagram": null,
  "clientToken": "<client_id>-<random_6_chars>",
  "features": ["streaming", "quick-replies", "feedback"],
  "createdAt": "<ISO date>",
  "version": "2.0.0"
}
```

---

## 6. PHASE 4 — KNOWLEDGE BASE

### 6.1 Compile Knowledge

Create `.agent/widget-builder/clients/<client_id>/knowledge/context.md` with ALL scraped content:

```markdown
# <Brand Name>

## О компании

<About text>

## Услуги и цены

<Services and pricing>

## Часто задаваемые вопросы

<FAQ content>

## Контакты

- Телефон: <phone>
- Email: <email>
- Адрес: <address>
- Часы работы: <hours>
- Сайт: <website>
```

### 6.2 Upload to RAG

```bash
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "clientId": "<client_id>",
    "text": "<full knowledge text from context.md>",
    "source": "quick-widget-builder"
  }'
```

### 6.3 Set AI Settings (System Prompt)

```bash
curl -X PUT http://localhost:3000/api/ai-settings/<client_id> \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "systemPrompt": "<auto-generated system prompt from Phase 2>",
    "greeting": "<same greeting as widget.config.json>",
    "temperature": 0.7,
    "maxTokens": 1024,
    "topK": 5
  }'
```

---

## 7. COMPLETION

### 7.1 Output to User

After everything is done, output:

```
✅ Quick widget created for <Brand Name>!

📋 Summary:
- Brand: <name>
- Colors: <primary> / <accent>
- Theme: <light/dark>
- Language: <detected>
- Quick Replies: <list>
- Knowledge: <N pages scraped, M chunks uploaded>

🔗 Demo: http://localhost:3000/demo/dental?client=<client_id>

📦 Embed code:
<script src="https://<domain>/widgets/<client_id>/script.js"></script>

📁 Files:
- Widget: widgets/<client_id>/script.js
- Config: .agent/widget-builder/clients/<client_id>/widget.config.json
- Knowledge: .agent/widget-builder/clients/<client_id>/knowledge/context.md
```

---

## 8. REFERENCE

For detailed technical specifications, refer to the full widget builder skill:

- **Build pipeline**: `.agent/skills/create-widget/SKILL.md` Section 7
- **CSS & Shadow DOM**: `.agent/skills/create-widget/SKILL.md` Section 6
- **Backend API**: `.agent/skills/create-widget/SKILL.md` Section 5
- **Component architecture**: `.agent/skills/create-widget/SKILL.md` Section 4
- **File structure**: `.agent/skills/create-widget/SKILL.md` Section 9
- **Checklist**: `.agent/skills/create-widget/SKILL.md` Section 10

### 8.1 Key Constraints (from parent skill)

- **Tech Stack**: Preact + Vite (IIFE), Tailwind CSS **v3** (NOT v4!), Framer Motion, Shadow DOM
- **Bundle Size**: < 500KB (typical ~290KB)
- **CSS Pipeline**: `index.css` → PostCSS → `window.__WIDGET_CSS__` → Shadow DOM `<style>`
- **Entry Point**: `src/main.jsx` with custom element `<ai-chat-widget>`
- **DO NOT MODIFY**: `vite.config.js`, `postcss.config.cjs`, `tailwind.config.js`, `src/main.jsx`
- **Icons**: `lucide-preact` (NOT `lucide-react`)
- **Imports**: `import './index.css'` (NOT `?raw`)

### 8.2 Available Dependencies

Already in `package.json` — do NOT install anything new:

- `preact` + `preact/compat` (aliased as react)
- `framer-motion` — `motion`, `AnimatePresence`
- `lucide-preact` — all icons
- `react-markdown` — markdown rendering
- `tailwind-merge`, `clsx` — class utilities

### 8.3 SSE Stream Format

- Tokens: `data: {"token": "chunk"}\n\n`
- End: `data: [DONE]\n\n`
- Errors: `data: {"error": "message"}\n\n`
