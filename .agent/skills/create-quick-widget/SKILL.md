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

**IMPORTANT**: This skill uses a **pre-built premium design template**. You do NOT write any JSX or CSS files manually. Instead, you create a `theme.json` color config and run the theme generator script which produces all 6 source files automatically.

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

## 3. PHASE 1 — SITE ANALYSIS (VISUAL + DOM)

**CRITICAL**: You MUST actually visit the website and deeply analyze its visual design, CSS styles, and DOM structure. The widget must look like it belongs on the client's site. Do NOT guess colors or styles — extract them from the actual site.

### 3.1 Visual Analysis of Homepage

Use `WebFetch` to load the client's website homepage. If you have browser/screenshot capabilities, take a screenshot and analyze it visually. Otherwise, do a thorough DOM/CSS analysis.

**Extract the following from the site's actual HTML/CSS:**

#### A. Brand & Content

1. **Brand Name** — from `<title>`, `<meta og:site_name>`, `<h1>`, or logo text
2. **Language** — from `<html lang="">` attribute or content language
3. **Business Type** — infer from content (dental, auto, hotel, restaurant, ecommerce, etc.)
4. **Navigation Links** — all `<nav>` links, header links, footer links
5. **Phone, Email, Address** — from visible contact info
6. **Tagline/Slogan** — from hero section or header

#### B. Visual Style Analysis (CSS/DOM inspection)

**You must extract exact hex colors from the site's CSS.** Look at these DOM elements:

| What to inspect            | Where to look in CSS/DOM                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| **Primary brand color**    | Header `background-color`, main CTA buttons `background`, links `color`, `--primary` CSS variable |
| **Accent/secondary color** | Secondary buttons, hover states, decorative elements                                              |
| **Background color**       | `<body>` or main wrapper `background-color` — determines light/dark theme                         |
| **Text color**             | `<body>` or `<p>` `color` — confirms light/dark                                                   |
| **Font family**            | `<body>` `font-family`, or `<link>` to Google Fonts in `<head>`                                   |
| **Button border-radius**   | Main CTA buttons `border-radius` — determines widget roundness                                    |
| **Header/navbar style**    | Is it transparent, solid color, gradient? Dark or light?                                          |
| **Overall feel**           | Is it compact/minimal, spacious/premium, playful/rounded?                                         |

#### C. Determining Light vs Dark Theme

Check the `<body>` background color:

- **Light theme**: background is white/light (`#fff`, `#f5f5f5`, `#fafafa`, etc.) → `isDark: false`
- **Dark theme**: background is dark (`#000`, `#111`, `#1a1a1a`, `#0b1018`, etc.) → `isDark: true`

If in doubt, check the text color — light text on dark bg = dark theme.

#### D. Determining Layout Feel

Analyze the site's visual "personality" to choose widget layout parameters:

| Site characteristic                       | Widget layout to use | Example sites              |
| ----------------------------------------- | -------------------- | -------------------------- |
| Sharp corners, minimal, angular           | **Compact** layout   | Clinical sites, tech sites |
| Rounded buttons (>20px radius), playful   | **Rounded** layout   | Modern, friendly brands    |
| Large hero, spacious padding, luxury feel | **Premium** layout   | Premium clinics, high-end  |
| Standard corporate site                   | **Standard** layout  | Most business sites        |

**Prompt for WebFetch homepage:**

```
Analyze this website's VISUAL DESIGN and CONTENT. Extract:

DESIGN/STYLE:
1. Primary brand color (exact hex) — look at header background, main buttons, links, accent elements
2. Secondary/accent color (exact hex) — hover states, secondary buttons, decorative elements
3. Background color of the page body (exact hex) — is it light or dark?
4. Font family — check <body> font-family CSS and any Google Fonts <link> tags in <head>
5. Google Fonts URL if present (exact URL from <link> tag)
6. Button border-radius style — are buttons rounded (>15px), slightly rounded (8-12px), or sharp (<5px)?
7. Overall design feel: minimal/compact, standard, premium/spacious, or playful/rounded?
8. Is the site dark-themed or light-themed?

CONTENT:
9. Brand/company name
10. What type of business is this?
11. What language is the site in?
12. List ALL navigation links with full URLs
13. Main tagline or slogan
14. Phone number, address, email if visible
15. Brief description of what the company does
```

### 3.2 Crawl Key Pages (Content for AI Knowledge Base)

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

### 3.3 Compile Full Analysis

After visiting all pages, compile a complete picture. **Every color must be an actual hex code extracted from the site, not a guess.**

```
SITE ANALYSIS:

VISUAL DESIGN:
- Primary Color: #hex (from: header/buttons/links)
- Accent Color: #hex (from: secondary elements)
- Background: #hex (light/dark)
- Text Color: #hex
- Font: <font family> (Google Fonts URL: <url or null>)
- Theme: light / dark
- Button Style: rounded / slightly-rounded / sharp (border-radius: Npx)
- Layout Feel: compact / standard / premium / rounded
- Has Gradient: yes/no (in header/hero)
- Has Shine/Glass: yes/no

CONTENT:
- Brand: <name>
- Type: <business type>
- Language: <ru/en/uk/etc>
- Tagline: <tagline>
- Phone: <phone>
- Email: <email>
- Address: <address>
- Services: <list>
- Key FAQ: <list>
```

---

## 4. PHASE 2 — AUTO-GENERATE CONFIGURATION

Based on the visual analysis from Phase 1, automatically decide everything. **All decisions must come from actual site data, not assumptions.**

### 4.1 Design Decisions (from Visual Analysis)

| Decision            | Rule                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Primary Color**   | Exact hex extracted from site's header/buttons/links (NOT guessed)                                                                     |
| **Accent Color**    | Second brand color from site, or slightly shifted version of primary                                                                   |
| **isDark**          | `true` if site has dark background (#000-#333), `false` if light (#fff, #f5f5f5, etc.)                                                 |
| **Font**            | Exact font-family from site's CSS. Include Google Fonts URL if the site uses one                                                       |
| **Layout Feel**     | Compact/Standard/Premium/Rounded — based on site's button radius, spacing, overall feel                                                |
| **toggleRadius**    | Match site's button border-radius: `rounded-full` for >20px, `rounded-2xl` for 12-20px, `rounded-xl` for 8-12px, `rounded-lg` for <8px |
| **hasShine**        | `true` if site uses gradients/glass effects, `false` if flat/minimal design                                                            |
| **Header gradient** | Use primary → accent color gradient matching site's header/hero direction                                                              |
| **Position**        | `bottom-right` (default)                                                                                                               |

### 4.2 Layout Selection (from Visual Analysis)

Based on the site's visual feel detected in Phase 1, select the matching layout preset:

| Site Feel Detected   | widgetW | widgetH | toggleSize          | toggleRadius     | headerPad     | nameSize        | hasShine |
| -------------------- | ------- | ------- | ------------------- | ---------------- | ------------- | --------------- | -------- |
| **Compact/Minimal**  | `350px` | `500px` | `w-[50px] h-[50px]` | `rounded-xl`     | `px-5 py-3.5` | `text-[13.5px]` | `false`  |
| **Standard**         | `360px` | `520px` | `w-14 h-14`         | `rounded-2xl`    | `px-5 py-4`   | `text-[14px]`   | `true`   |
| **Premium/Spacious** | `370px` | `540px` | `w-[58px] h-[58px]` | `rounded-2xl`    | `px-6 py-5`   | `text-[15px]`   | `true`   |
| **Rounded/Playful**  | `360px` | `520px` | `w-14 h-14`         | `rounded-full`   | `px-5 py-4`   | `text-[14px]`   | `true`   |
| **Angular/Sharp**    | `355px` | `515px` | `w-[54px] h-[54px]` | `rounded-[10px]` | `px-5 py-4`   | `text-[14px]`   | `false`  |

Also set avatar roundness to match:

- Compact/Angular: `avatarHeaderRound: "rounded-lg"`, `chatAvatarRound: "rounded-lg"`
- Standard/Rounded: `avatarHeaderRound: "rounded-xl"`, `chatAvatarRound: "rounded-xl"`
- Premium: `avatarHeaderRound: "rounded-2xl"`, `chatAvatarRound: "rounded-xl"`

### 4.3 Bot Configuration

| Field             | Rule                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Bot Name**      | `<Brand> AI` or `<Brand> Помощник` (match site language)                                                            |
| **Greeting**      | Auto-generate based on business type and language. Include bold company name, brief value prop, and ask how to help |
| **Tone**          | `professional_friendly` (default)                                                                                   |
| **Quick Replies** | 3-4 options based on business type (see table below)                                                                |

### 4.4 Quick Reply Templates by Business Type

| Business Type | Quick Replies (RU)                                 | Quick Replies (UK)                                  | Quick Replies (EN)                               |
| ------------- | -------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| Dental        | Записаться на приём, Цены на услуги, Как добраться | Записатися на прийом, Ціни на послуги, Як дістатися | Book appointment, Service prices, How to find us |
| Auto Repair   | Записать авто на ТО, Узнать цены, Часы работы      | Записати авто на ТО, Дізнатися ціни, Години роботи  | Book service, Get pricing, Working hours         |
| Hotel         | Забронировать номер, Посмотреть номера, Трансфер   | Забронювати номер, Переглянути номери, Трансфер     | Book a room, View rooms, Airport transfer        |
| Restaurant    | Забронировать столик, Посмотреть меню, Доставка    | Забронювати столик, Переглянути меню, Доставка      | Reserve a table, View menu, Delivery             |
| Ecommerce     | Помощь с заказом, Условия доставки, Возврат товара | Допомога із замовленням, Умови доставки, Повернення | Order help, Shipping info, Returns               |
| Law Firm      | Бесплатная консультация, Наши услуги, Стоимость    | Безкоштовна консультація, Наші послуги, Вартість    | Free consultation, Our services, Pricing         |
| Construction  | Рассчитать стоимость, Наши проекты, Сроки работ    | Розрахувати вартість, Наші проєкти, Терміни робіт   | Get a quote, Our projects, Timeline              |
| Generic       | О компании, Наши услуги, Контакты                  | Про компанію, Наші послуги, Контакти                | About us, Our services, Contact                  |

If the site language is detected, use the matching column. Otherwise default to the site's language.

### 4.5 System Prompt Generation

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

## 5. PHASE 3 — CREATE THEME CONFIG & GENERATE SOURCE FILES

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

### 5.3 Write theme.json (COLOR CONFIG)

**THIS IS THE KEY STEP.** Create `.agent/widget-builder/clients/<client_id>/theme.json` with ~50 color/layout parameters derived from the site's brand colors.

The theme generator uses this JSON to produce all 6 source files (index.css, main.jsx, Widget.jsx, ChatMessage.jsx, QuickReplies.jsx, MessageFeedback.jsx) using the premium design template.

**DO NOT write any JSX or CSS files manually. The generator does it all.**

#### theme.json Structure

```json
{
  "label": "<Brand Name> — <Color Theme Description>",
  "domain": "<domain without https://>",
  "fontUrl": "<Google Fonts URL or null>",
  "font": "<CSS font-family string>",
  "isDark": false,

  "widgetW": "360px",
  "widgetH": "520px",
  "widgetMaxW": "360px",
  "widgetMaxH": "520px",
  "toggleSize": "w-14 h-14",
  "toggleRadius": "rounded-2xl",
  "headerPad": "px-5 py-4",
  "nameSize": "text-[14px]",
  "headerAccent": "",
  "avatarHeaderRound": "rounded-xl",
  "chatAvatarRound": "rounded-xl",
  "hasShine": true,

  "headerFrom": "#PRIMARY",
  "headerVia": "#PRIMARY_LIGHTER",
  "headerTo": "#ACCENT",
  "toggleFrom": "#PRIMARY",
  "toggleVia": "#PRIMARY_LIGHTER",
  "toggleTo": "#ACCENT",
  "toggleShadow": "#PRIMARY",
  "toggleHoverRgb": "R, G, B",
  "sendFrom": "#PRIMARY",
  "sendTo": "#ACCENT",
  "sendHoverFrom": "#PRIMARY_DARKER",
  "sendHoverTo": "#ACCENT_DARKER",
  "onlineDotBg": "#PRIMARY_LIGHT",
  "onlineDotBorder": "#PRIMARY",
  "typingDot": "#PRIMARY_MEDIUM",

  "userMsgFrom": "#PRIMARY",
  "userMsgTo": "#ACCENT",
  "userMsgShadow": "#PRIMARY",

  "avatarFrom": "#PRIMARY_VERY_LIGHT",
  "avatarTo": "#PRIMARY_LIGHT",
  "avatarBorder": "#PRIMARY_LIGHT_MEDIUM",
  "avatarIcon": "#PRIMARY",

  "linkColor": "#PRIMARY",
  "linkHover": "#PRIMARY_DARKER",
  "copyHover": "#PRIMARY",
  "copyActive": "#PRIMARY",

  "chipBorder": "#PRIMARY_LIGHT_MEDIUM",
  "chipFrom": "#PRIMARY_VERY_LIGHT",
  "chipTo": "#PRIMARY_LIGHT",
  "chipText": "#PRIMARY_DARKER",
  "chipHoverFrom": "#PRIMARY_LIGHT",
  "chipHoverTo": "#PRIMARY_LIGHT_MEDIUM",
  "chipHoverBorder": "#PRIMARY_MEDIUM",

  "focusBorder": "#PRIMARY_MEDIUM",
  "focusRing": "#PRIMARY_VERY_LIGHT",

  "imgActiveBorder": "#PRIMARY_MEDIUM",
  "imgActiveBg": "#PRIMARY_VERY_LIGHT",
  "imgActiveText": "#PRIMARY",
  "imgHoverText": "#PRIMARY",
  "imgHoverBorder": "#PRIMARY_MEDIUM",
  "imgHoverBg": "#PRIMARY_VERY_LIGHT",

  "cssPrimary": "#PRIMARY",
  "cssAccent": "#ACCENT",
  "focusRgb": "R, G, B",

  "feedbackActive": "#PRIMARY",
  "feedbackHover": "#PRIMARY_MEDIUM"
}
```

#### Color Derivation Guide

Given a primary color (e.g., `#6f4495`), derive the color palette:

| Token                  | How to derive               | Example (#6f4495 primary, #1a80dd accent) |
| ---------------------- | --------------------------- | ----------------------------------------- |
| `PRIMARY`              | The site's main brand color | `#6f4495`                                 |
| `PRIMARY_DARKER`       | Darken primary by ~15-20%   | `#5c3a7d`                                 |
| `PRIMARY_LIGHTER`      | Lighten primary by ~10%     | `#7c52a8`                                 |
| `PRIMARY_MEDIUM`       | Mix primary with white ~40% | `#8b6aad`                                 |
| `PRIMARY_LIGHT`        | Mix primary with white ~70% | `#b99fd4`                                 |
| `PRIMARY_LIGHT_MEDIUM` | Mix primary with white ~60% | `#d4bfe6`                                 |
| `PRIMARY_VERY_LIGHT`   | Mix primary with white ~90% | `#ede5f5` or `#f3eef8`                    |
| `ACCENT`               | Secondary color from site   | `#1a80dd`                                 |
| `ACCENT_DARKER`        | Darken accent by ~15%       | `#1568b5`                                 |
| `toggleHoverRgb`       | Primary color as R,G,B      | `111, 68, 149`                            |
| `focusRgb`             | Same as toggleHoverRgb      | `111, 68, 149`                            |

#### Dark Theme Extra Fields

If `isDark: true`, also include these surface/text colors:

```json
{
  "surfaceBg": "#0b1018",
  "surfaceCard": "#111927",
  "surfaceBorder": "#1e2d3d",
  "surfaceInput": "#0f1720",
  "surfaceInputFocus": "#162232",
  "textPrimary": "#e2e8f0",
  "textSecondary": "#64748b",
  "textMuted": "#475569"
}
```

Adjust the surface colors to complement the primary brand color. For example, if the primary color is blue, use bluish dark surfaces.

#### Layout Variations

Adjust layout based on the site's feel:

| Site Feel | widgetW | widgetH | toggleSize          | toggleRadius     | headerPad     | nameSize        |
| --------- | ------- | ------- | ------------------- | ---------------- | ------------- | --------------- |
| Standard  | `360px` | `520px` | `w-14 h-14`         | `rounded-2xl`    | `px-5 py-4`   | `text-[14px]`   |
| Compact   | `350px` | `500px` | `w-[50px] h-[50px]` | `rounded-xl`     | `px-5 py-3.5` | `text-[13.5px]` |
| Premium   | `380px` | `560px` | `w-16 h-16`         | `rounded-[20px]` | `px-6 py-5`   | `text-[15px]`   |
| Rounded   | `360px` | `520px` | `w-14 h-14`         | `rounded-full`   | `px-5 py-4`   | `text-[14px]`   |

#### Real Examples

**Light theme (green dental clinic):**

```json
{
  "label": "Dental Clinic — Forest Green Theme",
  "domain": "dentalclinic.com",
  "fontUrl": null,
  "font": "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  "isDark": false,
  "widgetW": "350px",
  "widgetH": "500px",
  "widgetMaxW": "350px",
  "widgetMaxH": "500px",
  "toggleSize": "w-[50px] h-[50px]",
  "toggleRadius": "rounded-xl",
  "headerPad": "px-5 py-3.5",
  "nameSize": "text-[13.5px]",
  "headerAccent": "",
  "avatarHeaderRound": "rounded-lg",
  "chatAvatarRound": "rounded-lg",
  "hasShine": false,
  "headerFrom": "#2d8659",
  "headerVia": "#339963",
  "headerTo": "#3a9e6b",
  "toggleFrom": "#2d8659",
  "toggleVia": "#339963",
  "toggleTo": "#3a9e6b",
  "toggleShadow": "#2d8659",
  "toggleHoverRgb": "45, 134, 89",
  "sendFrom": "#2d8659",
  "sendTo": "#339963",
  "sendHoverFrom": "#246e49",
  "sendHoverTo": "#2d8659",
  "onlineDotBg": "#8cc9a6",
  "onlineDotBorder": "#2d8659",
  "typingDot": "#4aad78",
  "userMsgFrom": "#2d8659",
  "userMsgTo": "#339963",
  "userMsgShadow": "#2d8659",
  "avatarFrom": "#d4eede",
  "avatarTo": "#c5e7d3",
  "avatarBorder": "#a3d4b8",
  "avatarIcon": "#2d8659",
  "linkColor": "#2d8659",
  "linkHover": "#246e49",
  "copyHover": "#2d8659",
  "copyActive": "#2d8659",
  "chipBorder": "#a3d4b8",
  "chipFrom": "#edf7f1",
  "chipTo": "#d4eede",
  "chipText": "#246e49",
  "chipHoverFrom": "#d4eede",
  "chipHoverTo": "#c5e7d3",
  "chipHoverBorder": "#8cc9a6",
  "focusBorder": "#4aad78",
  "focusRing": "#d4eede",
  "imgActiveBorder": "#8cc9a6",
  "imgActiveBg": "#edf7f1",
  "imgActiveText": "#2d8659",
  "imgHoverText": "#2d8659",
  "imgHoverBorder": "#8cc9a6",
  "imgHoverBg": "#edf7f1",
  "cssPrimary": "#2d8659",
  "cssAccent": "#339963",
  "focusRgb": "45, 134, 89",
  "feedbackActive": "#2d8659",
  "feedbackHover": "#4aad78"
}
```

**Dark theme (cyan & blue auto service):**

```json
{
  "label": "Auto Service — Dark Cyan & Blue Theme",
  "domain": "autoservice.com",
  "fontUrl": "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
  "font": "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
  "isDark": true,
  "widgetW": "360px",
  "widgetH": "520px",
  "widgetMaxW": "360px",
  "widgetMaxH": "520px",
  "toggleSize": "w-14 h-14",
  "toggleRadius": "rounded-full",
  "headerPad": "px-5 py-4",
  "nameSize": "text-[14px]",
  "headerAccent": "",
  "avatarHeaderRound": "rounded-xl",
  "chatAvatarRound": "rounded-lg",
  "hasShine": true,
  "headerFrom": "#00a1c9",
  "headerVia": "#2e8eb8",
  "headerTo": "#5879c5",
  "toggleFrom": "#00a1c9",
  "toggleVia": "#2e8eb8",
  "toggleTo": "#5879c5",
  "toggleShadow": "#00a1c9",
  "toggleHoverRgb": "0, 161, 201",
  "sendFrom": "#00a1c9",
  "sendTo": "#5879c5",
  "sendHoverFrom": "#0088ac",
  "sendHoverTo": "#4a68b0",
  "onlineDotBg": "#7dd4ec",
  "onlineDotBorder": "#00a1c9",
  "typingDot": "#00a1c9",
  "userMsgFrom": "#00a1c9",
  "userMsgTo": "#5879c5",
  "userMsgShadow": "#00a1c9",
  "avatarFrom": "#162536",
  "avatarTo": "#1a2d42",
  "avatarBorder": "#2a4060",
  "avatarIcon": "#00a1c9",
  "linkColor": "#5cc8e4",
  "linkHover": "#7dd4ec",
  "copyHover": "#00a1c9",
  "copyActive": "#00a1c9",
  "chipBorder": "#1e3348",
  "chipFrom": "#0d1a26",
  "chipTo": "#111f2e",
  "chipText": "#5cc8e4",
  "chipHoverFrom": "#142638",
  "chipHoverTo": "#1a2d42",
  "chipHoverBorder": "#00a1c9",
  "focusBorder": "#00a1c9",
  "focusRing": "#162536",
  "imgActiveBorder": "#00a1c9",
  "imgActiveBg": "#0d1a26",
  "imgActiveText": "#00a1c9",
  "imgHoverText": "#00a1c9",
  "imgHoverBorder": "#2a4060",
  "imgHoverBg": "#0d1a26",
  "cssPrimary": "#00a1c9",
  "cssAccent": "#5879c5",
  "focusRgb": "0, 161, 201",
  "feedbackActive": "#00a1c9",
  "feedbackHover": "#5cc8e4",
  "surfaceBg": "#0b1018",
  "surfaceCard": "#111927",
  "surfaceBorder": "#1e2d3d",
  "surfaceInput": "#0f1720",
  "surfaceInputFocus": "#162232",
  "textPrimary": "#e2e8f0",
  "textSecondary": "#64748b",
  "textMuted": "#475569"
}
```

### 5.4 Run Theme Generator

After writing `theme.json`, run the generator to produce all 6 source files:

```bash
node .agent/widget-builder/scripts/generate-single-theme.js <client_id>
```

This reads `theme.json` and generates:

- `src/index.css` — Tailwind CSS with theme variables
- `src/main.jsx` — Shadow DOM entry point with font loader
- `src/components/Widget.jsx` — Main widget with header, messages, input
- `src/components/ChatMessage.jsx` — Bot/user message bubbles with markdown
- `src/components/QuickReplies.jsx` — Quick reply chips with animations
- `src/components/MessageFeedback.jsx` — Thumbs up/down feedback

**DO NOT manually edit the generated files.** If you need to change colors, edit `theme.json` and re-run the generator.

### 5.5 Build & Deploy

**IMPORTANT: Quick widgets deploy to `quickwidgets/` (NOT `widgets/`)**

```bash
# Build
node .agent/widget-builder/scripts/build.js <client_id>

# Verify build output
ls -la .agent/widget-builder/dist/script.js

# Deploy to quickwidgets/ folder (NOT widgets/)
mkdir -p quickwidgets/<client_id>
cp .agent/widget-builder/dist/script.js quickwidgets/<client_id>/script.js
```

### 5.6 Write info.json

Write `quickwidgets/<client_id>/info.json` (**NOT** `widgets/`):

**NOTE: No `clientToken` field — quick widgets don't use auth tokens.**

```json
{
  "name": "<Brand Name>",
  "clientId": "<client_id>",
  "username": "<username>",
  "email": "<email or empty string>",
  "website": "<website>",
  "phone": "<phone from site or null>",
  "addresses": ["<address from site or empty>"],
  "instagram": null,
  "clientType": "quick",
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

## About

<About text>

## Services & Pricing

<Services and pricing>

## FAQ

<FAQ content>

## Contact

- Phone: <phone>
- Email: <email>
- Address: <address>
- Working hours: <hours>
- Website: <website>
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

### 6.4 Add Lead to "Проверенные лиды" Spreadsheet

**MANDATORY**: After every successful widget build, the lead MUST be added to today's "Проверенные лиды" Google Sheets spreadsheet. This is how we track all demo widgets created.

#### Step 1: Find today's spreadsheet

Get today's date in `DD.MM.YYYY` format and search:

```bash
curl -s "http://localhost:3000/api/integrations/sheets/search?name=DD.MM.YYYY%20Проверенные%20лиды" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

If not found, try fallback:

```bash
curl -s "http://localhost:3000/api/integrations/sheets/search?name=DD.MM.YYYY%20Квалифицированные%20лиды" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

If neither found — **skip this step** (don't fail the widget build), but warn the user that no spreadsheet was found.

#### Step 2: Read current data to find next empty row

```bash
curl -s "http://localhost:3000/api/integrations/sheets/read?spreadsheetId=SPREADSHEET_ID" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}"
```

Count the rows to determine the next empty row number (row 1 = headers, data starts at row 2).

#### Step 3: Append the lead data

Write the lead info to the next empty row. Match the existing column structure (typically: email, website, username, hasWidget):

```bash
curl -s -X POST "http://localhost:3000/api/integrations/sheets/update" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "spreadsheetId": "SPREADSHEET_ID",
    "range": "Sheet1!A<NEXT_ROW>:D<NEXT_ROW>",
    "values": [["<email>", "<website>", "<username>", "TRUE"]]
  }'
```

**IMPORTANT**:

- Adjust the column range (`A:D`) to match the actual spreadsheet headers
- The `hasWidget` column should be set to `TRUE` immediately since we just built the widget
- If the spreadsheet has additional columns, fill them accordingly

---

## 7. COMPLETION

### 7.1 Send Telegram Notification

After the widget is successfully built and deployed, send a Telegram notification to report the creation:

```bash
curl -s -X POST "http://localhost:3000/api/telegram/notify" \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=${ADMIN_SECRET_TOKEN}" \
  -d '{
    "message": "✅ <b>Quick Widget Created</b>\n\n👤 Client: <username>\n🌐 Website: <website>\n📧 Email: <email or N/A>\n\n📦 Embed:\n<code>&lt;script src=\"https://<domain>/quickwidgets/<client_id>/script.js\"&gt;&lt;/script&gt;</code>\n\n🔗 <a href=\"http://localhost:3000/admin/client/<client_id>\">Open in Admin</a>"
  }'
```

**IMPORTANT**: This notification is sent when the skill is invoked directly (standalone), NOT when called from `mass-quick-widgets` (which sends its own batch report).

### 7.2 Output to User

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
<script src="https://<domain>/quickwidgets/<client_id>/script.js"></script>

📁 Files:
- Widget: quickwidgets/<client_id>/script.js
- Theme: .agent/widget-builder/clients/<client_id>/theme.json
- Config: .agent/widget-builder/clients/<client_id>/widget.config.json
- Knowledge: .agent/widget-builder/clients/<client_id>/knowledge/context.md

📋 Lead added to "DD.MM.YYYY Проверенные лиды" spreadsheet
📨 Telegram notification sent
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
- **DO NOT MODIFY**: `vite.config.js`, `postcss.config.cjs`, `tailwind.config.js`
- **DO NOT write JSX/CSS manually** — use `theme.json` + `generate-single-theme.js`
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
- Rich blocks: `data: {"rich": [...]}\n\n` (before DONE)
- End: `data: [DONE]\n\n`
- Errors: `data: {"error": "message"}\n\n`

### 8.4 Build Pipeline Summary

```
1. Write theme.json          → .agent/widget-builder/clients/<id>/theme.json
2. Write widget.config.json  → .agent/widget-builder/clients/<id>/widget.config.json
3. Run theme generator       → node scripts/generate-single-theme.js <id>
                                 (generates 6 source files from theme.json)
4. Run build                 → node scripts/build.js <id>
                                 (Vite IIFE build → dist/script.js)
5. Deploy                    → cp dist/script.js quickwidgets/<id>/script.js
6. Write info.json           → quickwidgets/<id>/info.json
```

### 8.5 Advanced Features Reference

For detailed implementation of these optional features, see `create-widget` SKILL.md:

- **Section 11: Proactive Chat** — Smart triggers (time, scroll, exit intent)
- **Section 12: Rich Messages** — Cards, buttons, carousels in AI responses
- **Section 13: Voice Input/Output** — Speech-to-text and text-to-speech
- **Section 14: Message Feedback** — Thumbs up/down on assistant messages

These features are configured via `widget.config.json` `features` object:

```json
{
  "features": {
    "proactiveChat": true,
    "richMessages": true,
    "voice": { "enabled": true, "autoSpeak": false, "lang": "ru-RU" },
    "feedback": true
  }
}
```
