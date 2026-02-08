---
name: create-widget
description: Creates a customized AI chat widget with RAG, streaming, and integrations.
---

# AI Widget Builder Skill

## 1. CRITICAL PROTOCOL (READ FIRST)

**You MUST NOT start any implementation until ALL mandatory data is collected.**

### 1.1 Mandatory Data (Ask user if missing)

1.  **Client Info**: `username`, `email`, `website` (Required for DB and `info.json`).
2.  **Business Context**: What the company does, services, pricing. (Paste text or link).
3.  **Design Preferences**:
    - **Glassmorphism**: "Green Glass", "Dark Frosted", "Emerald", etc.
    - **Bot Identity**: Name, Avatar (URL or dicebear), Greeting, Tone.
4.  **Integration Needs**: keys for CRM/Payments (if any).

### 1.2 Workflow Enforcement

1.  **Check**: Do you have ALL "Mandatory Data"?
    - **NO**: Stop. Ask the user for specific missing fields.
    - **YES**: Confirm summary with user.
2.  **Start**: Only proceed to "2. Discovery Phase" after user confirmation.

---

## 2. Global Rules

1.  **Context First**: See Protocol 1.1.
2.  **Verification**: Verify API endpoints and DB connections.
3.  **Security**: No hardcoded keys. Use environment variables.
4.  **Credentials**: If integrating (CRM/Payment), **ASK** the user for keys. Do not assume `.env.local` has them.
5.  **Performance**: Script size < 500KB.
6.  **Tech Stack**: Preact + Vite (IIFE bundle), Tailwind CSS **v3** (NOT v4!), Framer Motion, Shadow DOM, SSE streaming via `/api/chat/stream`, RAG with MongoDB embeddings.
7.  **Premium Standard**: **MANDATORY** "Apple-like" aesthetics: Glassmorphism (`backdrop-blur`), Fluid Animations (`framer-motion`), and Interactive Cards (no raw links).

---

## 3. Discovery Phase

**Collect the following configuration data from the user:**

### 3.1 Design & Identity

- **Style**: Neon, Glass, Minimal (Light/Dark), Corporate, or Site-match.
- **Colors**: Primary, Accent, Background.
- **Position**: Bottom-right (default) or Left.
- **Size**: Compact, Medium, Large.
- **Button**: Circle, Pill, Rounded Square.
- **Theme**: Light, Dark, Auto (System), or Toggle.
- **Bot Identity**: Name, Avatar (emoji/URL/dicebear), Greeting, Tone.

### 3.2 Core Features

- **Streaming**: Yes (fast/smooth) / No.
- **Quick Replies**: Starters (list 3-6). Style: Pill/Card/Text.
- **Leads**: Name, Phone, Email, Custom fields. Trigger: Before chat / After N msgs. Dest: DB/Sheets/Webhook.
- **Media**: Markdown rendering (via `react-markdown`). Sound?
- **Language**: Russian, English, Auto-detect, Other.

### 3.3 Advanced Features

- **Unread Badge**: Number / Dot / None.
- **Auto Open**: Delay (sec), Exit-intent, Scroll (%).
- **Schedule**: Offline Form / Warning / Always Online.
- **Powered By**: Branding in footer?

### 3.4 Integrations

- **CRM**: Bitrix24, AmoCRM, HubSpot, Other, None.
- **Calendar**: Google Calendar, Calendly, Other, None.
- **Payment**: Stripe, YooKassa, Cryptomus, Other, None.
- **Messengers**: Telegram (bot webhook at `/api/telegram/webhook`), WhatsApp.
- **Google Sheets**: Export leads via `/api/integrations/sheets/export`.
- **Webhook/Email**: Send chat transcript on completion?

> **IMPORTANT**: If ANY integration is selected, you **MUST** ask the user for the relevant API Keys, Webhooks, or Credentials immediately. **DO NOT** assume they exist in `.env.local`.

### 3.5 Business Context (MANDATORY)

**Ask these specific questions to populate the Knowledge Base:**

1. **Business Overview**: What do you do? USPs? Target audience?
2. **Key Info (FAQ)**: Pricing, terms, guarantees, contacts.
3. **Knowledge Base**: Existing docs/links?

> **ACTION**: After getting Business Context:
>
> 1. Create `.agent/widget-builder/clients/<client_id>/knowledge/context.md`.
> 2. Upload text to RAG (see Section 5.2 for exact API format).
> 3. Confirm upload to user.

---

## 4. Configuration & Code Generation

### 4.1 Setup

```bash
mkdir -p .agent/widget-builder/clients/<client_id>/src/{components,hooks}
mkdir -p .agent/widget-builder/clients/<client_id>/knowledge
```

### 4.2 Config File (`widget.config.json`)

Create at `.agent/widget-builder/clients/<client_id>/widget.config.json`:

```json
{
  "clientId": "<client_id>",
  "bot": {
    "name": "Bot Name",
    "avatar": "https://api.dicebear.com/9.x/glass/svg?seed=<name>",
    "greeting": "Greeting message with **markdown**.",
    "tone": "professional_friendly"
  },
  "design": {
    "style": "glass_3d",
    "colors": {
      "primary": "emerald",
      "gradient": "from-emerald-400 to-teal-600",
      "glass": "bg-emerald-900/10 backdrop-blur-xl border-white/20"
    },
    "shapes": "rounded-3xl",
    "animations": "spring_smooth"
  },
  "features": {
    "streaming": true,
    "quickReplies": {
      "enabled": true,
      "starters": ["Option 1", "Option 2", "Option 3", "Option 4"]
    },
    "feedback": false,
    "leads": false,
    "integrations": {}
  }
}
```

**Keys**: `clientId`, `bot` (name, avatar, greeting, tone), `design` (style, colors, shapes, animations), `features` (streaming, quickReplies, feedback, leads, integrations).

### 4.3 Custom Hook (`useChat.js`)

**CRITICAL**: The hook MUST send the EXACT request format expected by `/api/chat/stream`:

```javascript
import { useState, useCallback, useRef } from 'react';

export default function useChat(config) {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const sessionIdRef = useRef(`session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);

  const sendMessage = useCallback(
    async (content) => {
      const userMsg = { role: 'user', content };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);
      setIsTyping(true);

      try {
        // EXACT format for /api/chat/stream:
        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: config.clientId, // REQUIRED: string
            message: content, // REQUIRED: string (current message text)
            conversationHistory: messages, // OPTIONAL: array of {role, content}
            sessionId: sessionIdRef.current, // OPTIONAL: for chat logging
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Stream failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let botContent = '';

        setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
        setIsTyping(false);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const payload = line.slice(6);
              if (payload === '[DONE]') break;
              try {
                const data = JSON.parse(payload);
                if (data.token) {
                  botContent += data.token;
                  setMessages((prev) => {
                    const newMsgs = [...prev];
                    newMsgs[newMsgs.length - 1] = {
                      ...newMsgs[newMsgs.length - 1],
                      content: botContent,
                    };
                    return newMsgs;
                  });
                }
              } catch (e) {
                // Skip unparseable chunks
              }
            }
          }
        }
      } catch (error) {
        console.error('Chat Error:', error);
        setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
      } finally {
        setIsLoading(false);
        setIsTyping(false);
      }
    },
    [messages, config.clientId]
  );

  return { messages, sendMessage, isLoading, isTyping };
}
```

**SSE Stream format from server**:

- Tokens: `data: {"token": "chunk of text"}\n\n`
- End signal: `data: [DONE]\n\n`
- Errors: `data: {"error": "message"}\n\n`

### 4.4 Components

Create Preact components in `src/components/` with **Strict Visual Standards**:

#### Required Components:

- **Widget.jsx**: Main container. Uses `AnimatePresence` for smooth open/close. Floating action button with "spring" physics. Renders greeting from `config.bot.greeting` as first `ChatMessage`. Contains header, messages area, input form, and toggle button.
- **ChatMessage.jsx**: Individual message bubble. Uses `react-markdown` for content rendering. _User_: Gradient pill (right-aligned). _Bot_: Glass bubble (left-aligned) with avatar. _Typing_: Animated dots.
- **QuickReplies.jsx**: Horizontal scroll with staggered animation. Reads options from `config.features.quickReplies.starters`.

#### Design Tokens:

- Font: `Inter` or `SF Pro` (system font stack via `font-sans`).
- Glass: `bg-white/10 backdrop-blur-lg border border-white/20 shadow-xl`.
- `:host` CSS variables: `--aw-primary`, `--aw-accent`, `--aw-glass`, `--aw-text`.

#### Available Dependencies (already in package.json):

- `preact` (v10) + `preact/compat` (aliased as `react`)
- `framer-motion` (v12) - for `motion`, `AnimatePresence`
- `lucide-preact` - for icons (`MessageCircle`, `X`, `Send`, `User`, etc.)
- `react-markdown` (v10) - for rendering markdown in messages
- `tailwind-merge` - for merging Tailwind classes
- `clsx` - for conditional classes

### 4.5 UX Polish

- **Typing indicator**: Animated bouncing dots while waiting for stream.
- **Micro-interactions**: Subtle "scale-down" on click via `whileTap={{ scale: 0.95 }}`.
- **Auto-scroll**: `messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })`.
- **Scrollbar hiding**: `.scrollbar-hide` class (defined in `index.css`).

---

## 5. Backend API Reference (DO NOT MODIFY THESE — THEY ALREADY EXIST)

### 5.1 Streaming Chat — `POST /api/chat/stream`

**Already exists.** Do NOT recreate.

**Request body:**

```json
{
  "clientId": "string (REQUIRED)",
  "message": "string (REQUIRED - current user message)",
  "conversationHistory": [{ "role": "user|assistant", "content": "string" }],
  "sessionId": "string (for chat logging)",
  "metadata": {}
}
```

**Response:** SSE stream (`text/event-stream`)

- Server uses last 6 messages from `conversationHistory`
- RAG retrieval: generates embedding for `message`, finds top-K similar chunks (threshold 0.3)
- Cost tracking: automatically tracks token usage per client
- Chat logging: saves messages to `ChatLog` collection using `sessionId`

**Error codes:**

- `400`: Missing `clientId` or `message`
- `403`: Widget/client is disabled (`isActive: false`)
- `429`: Cost limit exceeded
- `500`: Gemini API error

### 5.2 Knowledge Base — `POST /api/knowledge`

**Already exists.** Requires authentication (admin or client token).

**Request body:**

```json
{
  "clientId": "string (REQUIRED)",
  "text": "string (REQUIRED - text to add to knowledge base)",
  "source": "string (optional, default: 'manual')"
}
```

Text is automatically split into 500-char chunks and embeddings are generated using `text-embedding-004`.

### 5.3 Document Upload — `POST /api/knowledge/upload`

**Already exists.** Accepts `FormData` with:

- `file`: File object (PDF, DOCX, TXT)
- `clientId`: string

### 5.4 Leads — `POST /api/leads`

**Already exists.**

**Request body:**

```json
{
  "clientId": "string (REQUIRED)",
  "name": "string (REQUIRED)",
  "sessionId": "string",
  "email": "string",
  "phone": "string",
  "message": "string",
  "page": "string"
}
```

Additional custom fields can be added. Auto-exports to Google Sheets if configured for client.

### 5.5 AI Settings — `GET/PUT /api/ai-settings/[clientId]`

**Already exists.** Controls:

- `aiModel`: Model ID (default: `gemini-3-flash-preview`)
- `systemPrompt`: Custom system prompt
- `greeting`: Bot greeting message
- `temperature`: 0-1 (default: 0.7)
- `maxTokens`: (default: 1024)
- `topK`: Knowledge chunks to retrieve (default: 3, max: 10)

### 5.6 Available AI Models

Models defined in `src/lib/models.ts`:
| Model ID | Name | Tier |
|----------|------|------|
| `gemini-3-flash-preview` | Gemini 3 Flash (Preview) | standard (default) |
| `gemini-2.0-flash` | Gemini 2.0 Flash | standard |
| `gemini-2.5-flash-lite` | Gemini 2.5 Flash Lite | lite |
| `gemini-3-pro` | Gemini 3 Pro | pro |
| `gemini-2.5-flash` | Gemini 2.5 Flash | standard |
| `gemini-2.5-pro` | Gemini 2.5 Pro | pro |

**Model Map in stream route** (maps settings names to API names):

```
'gemini-3-flash' → 'gemini-3-flash-preview'
'gemini-2.0-flash' → 'gemini-2.0-flash'
'gemini-pro' → 'gemini-pro'
```

### 5.7 Endpoints That Do NOT Exist Yet

- **`/api/feedback`**: NOT implemented. If feedback feature is needed, this route must be created.

---

## 6. CSS & Shadow DOM Pipeline (CRITICAL)

### 6.1 How CSS Works in the Widget

The widget uses **Shadow DOM** for style isolation. CSS MUST be injected directly into the Shadow Root — external stylesheets and `<link>` tags will NOT work.

**Pipeline:**

1. `src/index.css` contains Tailwind directives (`@tailwind base; @tailwind components; @tailwind utilities;`) and `:host` variables
2. PostCSS processes these via `postcss.config.cjs` (tailwindcss + autoprefixer)
3. `vite-plugin-css-injected-by-js` stores the processed CSS in `window.__WIDGET_CSS__`
4. `main.jsx` reads `window.__WIDGET_CSS__` in `connectedCallback()` and injects it into Shadow DOM

### 6.2 Critical Files (DO NOT MODIFY)

- **`postcss.config.cjs`**: Must exist with `tailwindcss` and `autoprefixer` plugins
- **`tailwind.config.js`**: Tailwind **v3** format (`module.exports = {...}`)
- **`vite.config.js`**: Uses `cssInjectedByJsPlugin` with custom `injectCodeFunction` that sets `window.__WIDGET_CSS__`
- **`src/main.jsx`**: Entry point with Shadow DOM setup, reads `window.__WIDGET_CSS__`
- **`src/index.css`**: Tailwind directives + `:host` CSS variables

### 6.3 Tailwind Version WARNING

**MUST use Tailwind CSS v3** (currently `^3.4.19`). Do NOT upgrade to v4 — the config format is incompatible:

- v3 uses `module.exports = { content: [...], theme: { extend: {...} } }`
- v3 uses `@tailwind base; @tailwind components; @tailwind utilities;` directives
- v4 uses completely different syntax

### 6.4 CSS Variables (`:host` in `index.css`)

```css
:host {
  --aw-primary: #00d9ff;
  --aw-accent: #ff00e5;
  --aw-glass: rgba(10, 10, 15, 0.9);
  --aw-text: #ffffff;
}
```

These can be customized per client in `src/index.css`.

---

## 7. Build & Delivery

### 7.1 Build

```bash
node .agent/widget-builder/scripts/build.js <client_id>
```

**What the build script does:**

1. Copies `clients/<client_id>/widget.config.json` → root `widget.config.json`
2. Overlays `clients/<client_id>/src/` on top of default `src/` (client files overwrite defaults)
3. Runs `vite build` → produces `dist/script.js` (IIFE bundle)

> **CRITICAL WARNING**: Because the build script copies client `src/` files OVER the default `src/`, if you create custom files in `clients/<client_id>/src/hooks/useChat.js`, that file MUST contain the FULL correct implementation. It completely replaces the default. Keep client-specific files in sync with the default source.

### 7.2 Verify

- Check `dist/script.js` exists and size < 500KB
- Current typical size: ~290KB

### 7.3 Deploy (CRITICAL)

```bash
mkdir -p widgets/<client_id>
cp .agent/widget-builder/dist/script.js widgets/<client_id>/script.js
```

The API route at `src/app/widgets/[...path]/route.ts` serves files from the root `widgets/` directory. This is the primary serving mechanism. URL pattern: `/widgets/<client_id>/script.js`.

CORS headers are set to `Access-Control-Allow-Origin: *` — widgets can be embedded on any domain.

### 7.4 Info File

Write `widgets/<client_id>/info.json`:

```json
{
  "name": "Company Name",
  "clientId": "<client_id>",
  "username": "<username>",
  "email": "<email>",
  "website": "<website_url>",
  "phone": "<phone>",
  "addresses": ["Address 1"],
  "instagram": null,
  "features": ["streaming", "quick-replies", "glassmorphism"],
  "createdAt": "<ISO date>",
  "version": "2.0.0"
}
```

### 7.5 Automated Verification (MANDATORY)

- **Open Browser**: `http://localhost:3000/demo/dental?client=<client_id>`
- **Verify**:
  1. Widget button appears (bottom-right).
  2. Click to open — chat window animates in.
  3. Bot greeting message displays.
  4. Send test message (e.g., "Hello").
  5. Streaming response works without 400/500 errors.
  6. Navigate away — widget disappears (cleanup works).

### 7.6 Notify User

Provide the embed snippet:

```html
<script src="https://<domain>/widgets/<client_id>/script.js"></script>
```

And Feature Summary.

---

## 8. Knowledge Base Upload Procedure

After collecting business context:

### 8.1 Create Knowledge File

```bash
# Create knowledge markdown
cat > .agent/widget-builder/clients/<client_id>/knowledge/context.md << 'EOF'
# Company Name

## About
...

## Services & Pricing
...

## FAQ
...

## Contacts
...
EOF
```

### 8.2 Upload to RAG

The `/api/knowledge` endpoint requires authentication. For programmatic upload during widget creation, use the admin token:

```bash
curl -X POST http://localhost:3000/api/knowledge \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=<ADMIN_SECRET_TOKEN>" \
  -d '{
    "clientId": "<client_id>",
    "text": "<full knowledge text>",
    "source": "widget-builder"
  }'
```

The server automatically:

1. Splits text into ~500-char chunks
2. Generates embeddings via `text-embedding-004`
3. Stores in MongoDB `KnowledgeChunk` collection

For file uploads (PDF/DOCX/TXT), use `/api/knowledge/upload` with FormData.

---

## 9. File Structure Reference

```
.agent/widget-builder/
├── scripts/build.js          # Build script (node scripts/build.js <client_id>)
├── vite.config.js            # Vite config with CSS injection plugin
├── postcss.config.cjs        # PostCSS: tailwindcss + autoprefixer
├── tailwind.config.js        # Tailwind v3 config
├── package.json              # Dependencies (preact, framer-motion, etc.)
├── widget.config.json        # Active build config (copied from client)
├── dist/
│   └── script.js             # Build output
├── src/
│   ├── main.jsx              # Entry: Shadow DOM, auto-mount, CSS injection
│   ├── index.css             # Tailwind directives + :host variables
│   ├── index.js              # Legacy entry (NOT USED — main.jsx is the entry)
│   ├── components/
│   │   ├── Widget.jsx        # Main chat UI container
│   │   ├── ChatMessage.jsx   # Message bubble with markdown
│   │   └── QuickReplies.jsx  # Quick reply buttons
│   └── hooks/
│       └── useChat.js        # Chat logic with SSE streaming
└── clients/
    └── <client_id>/
        ├── widget.config.json
        ├── knowledge/
        │   └── context.md
        └── src/              # Custom source (overlays default src/)
            ├── components/
            │   ├── Widget.jsx
            │   ├── ChatMessage.jsx
            │   └── QuickReplies.jsx
            └── hooks/
                └── useChat.js

widgets/                       # Root project directory - served by API
└── <client_id>/
    ├── script.js             # Deployed widget bundle
    └── info.json             # Client metadata
```

---

## 10. Checklist Before Delivery

- [ ] `widget.config.json` has correct `clientId`, bot info, design, features
- [ ] `useChat.js` sends `{ clientId, message, conversationHistory, sessionId }` to `/api/chat/stream`
- [ ] SSE parsing handles `data: {"token": "..."}` and `data: [DONE]`
- [ ] Components use `import { motion, AnimatePresence } from 'framer-motion'`
- [ ] Components use `import ReactMarkdown from 'react-markdown'`
- [ ] Icons from `lucide-preact` (NOT `lucide-react` for Preact compat, though both work via alias)
- [ ] `import './index.css'` in `main.jsx` (NOT `?raw` import)
- [ ] Shadow DOM injects CSS via `window.__WIDGET_CSS__`
- [ ] Client-specific `useChat.js` matches default format exactly
- [ ] Knowledge uploaded to RAG via `/api/knowledge`
- [ ] `info.json` written to `widgets/<client_id>/`
- [ ] Build produces < 500KB bundle
- [ ] Widget works on demo page without console errors

---

## 11. Proactive Chat (Smart Triggers)

The widget can auto-open with a contextual message based on server-configured triggers.

### 11.1 How It Works

1. On mount, widget fetches triggers: `GET /api/proactive-triggers?clientId=<clientId>`
2. Response: `{ triggers: [{ triggerType, config, maxShowsPerSession, cooldownMinutes, priority }] }`
3. Widget evaluates triggers client-side and shows a notification bubble when one fires

### 11.2 Trigger Types

| Type           | Config Fields   | Behavior                                      |
| -------------- | --------------- | --------------------------------------------- |
| `time_on_page` | `delayMs`       | Show after N ms on page                       |
| `scroll_depth` | `scrollPercent` | Show when user scrolls past N%                |
| `exit_intent`  | —               | Show on `mouseleave` from top of viewport     |
| `url_match`    | `urlPattern`    | Show if current URL matches pattern           |
| `inactivity`   | `delayMs`       | Show after N ms of no mouse/keyboard activity |

### 11.3 Implementation in Widget

Add to `useChat.js` or a new `useProactiveTriggers.js` hook:

```javascript
// Fetch triggers on mount
useEffect(() => {
  fetch(`${API_URL}/api/proactive-triggers?clientId=${clientId}`)
    .then((r) => r.json())
    .then((data) => {
      if (data.triggers) evaluateTriggers(data.triggers);
    });
}, []);

function evaluateTriggers(triggers) {
  const shown = JSON.parse(sessionStorage.getItem('proactive_shown') || '{}');

  triggers.forEach((trigger) => {
    const key = trigger._id || trigger.triggerType;
    if ((shown[key] || 0) >= trigger.maxShowsPerSession) return;

    switch (trigger.triggerType) {
      case 'time_on_page':
        setTimeout(() => showProactiveMessage(trigger, key), trigger.config.delayMs || 5000);
        break;
      case 'scroll_depth':
        const handler = () => {
          const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
          if (pct >= (trigger.config.scrollPercent || 50)) {
            showProactiveMessage(trigger, key);
            window.removeEventListener('scroll', handler);
          }
        };
        window.addEventListener('scroll', handler);
        break;
      case 'exit_intent':
        document.addEventListener(
          'mouseleave',
          (e) => {
            if (e.clientY <= 0) showProactiveMessage(trigger, key);
          },
          { once: true }
        );
        break;
    }
  });
}
```

### 11.4 Config Extension

Add to `widget.config.json`:

```json
{
  "features": {
    "proactiveChat": true
  }
}
```

---

## 12. Rich Messages (Cards, Buttons, Carousels)

The AI can respond with structured rich blocks that render as interactive cards, button groups, and carousels.

### 12.1 SSE Stream Format Extension

After all text tokens and `[DONE]`, the server may send:

```
data: {"rich": [{"type": "card", "title": "...", ...}, ...]}
```

The `useChat.js` hook must parse this and attach rich blocks to the message.

### 12.2 Rich Block Types

**Card:**

```json
{
  "type": "card",
  "title": "Product Name",
  "image": "https://example.com/img.jpg",
  "description": "Description text",
  "button": { "label": "Buy Now", "url": "https://example.com" }
}
```

**Button Group:**

```json
{
  "type": "button_group",
  "buttons": [
    { "label": "FAQ", "url": "/faq" },
    { "label": "Pricing", "url": "/pricing" }
  ]
}
```

**Carousel:**

```json
{
  "type": "carousel",
  "items": [
    { "type": "card", "title": "Item 1", "image": "...", "description": "...", "button": {...} },
    { "type": "card", "title": "Item 2", "image": "...", "description": "...", "button": {...} }
  ]
}
```

### 12.3 Component Implementation

Create these components when rich messages are enabled:

**`RichCard.jsx`** — Renders a single card with optional image, title, description, and CTA button.

**`ButtonGroup.jsx`** — Row of action buttons. Buttons can be links (open URL) or quick-replies (send text to chat).

**`Carousel.jsx`** — Horizontal scrollable container of RichCard components. Use CSS `overflow-x: auto` with `snap-x` for smooth scrolling.

**`ChatMessage.jsx` update** — After the text content, check `message.richBlocks` array and render corresponding components.

### 12.4 useChat.js SSE Parser Update

```javascript
// In the SSE parsing loop, before [DONE]:
if (data.rich) {
  setMessages((prev) => {
    const updated = [...prev];
    const last = updated[updated.length - 1];
    if (last && last.role === 'assistant') {
      last.richBlocks = data.rich;
    }
    return updated;
  });
}
```

### 12.5 Config Extension

```json
{
  "features": {
    "richMessages": true
  }
}
```

---

## 13. Voice Input/Output

Widget supports speech-to-text input and text-to-speech output using the browser's Web Speech API.

### 13.1 Voice Button (`VoiceButton.jsx`)

A microphone button next to the text input. Uses `webkitSpeechRecognition` or `SpeechRecognition`.

```jsx
const VoiceButton = ({ onResult, lang = 'ru-RU' }) => {
  const [listening, setListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return; // Hide button if unsupported

    const recognition = new SpeechRecognition();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      onResult(text);
      setListening(false);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
    setListening(true);
  };

  // Only render if browser supports Speech API
  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) return null;

  return (
    <button onClick={startListening} className={listening ? 'voice-btn active' : 'voice-btn'}>
      <Mic size={18} />
    </button>
  );
};
```

### 13.2 Text-to-Speech (TTS)

After assistant message is fully received, optionally speak it:

```javascript
if (config.voice?.autoSpeak && 'speechSynthesis' in window) {
  const utterance = new SpeechSynthesisUtterance(assistantMessage);
  utterance.lang = config.voice.lang || 'ru-RU';
  utterance.rate = 1.0;
  speechSynthesis.speak(utterance);
}
```

### 13.3 Visual Feedback

- Pulsing mic icon while recording (CSS animation: `animate-pulse` with red glow)
- Optional waveform animation during recording

### 13.4 Config Extension

```json
{
  "features": {
    "voice": {
      "enabled": true,
      "autoSpeak": false,
      "lang": "ru-RU"
    }
  }
}
```

### 13.5 Graceful Degradation

- Check `window.SpeechRecognition || window.webkitSpeechRecognition` before rendering mic button
- Check `'speechSynthesis' in window` before attempting TTS
- If not supported, hide voice features entirely (no error messages)

---

## 14. Message Feedback

The widget can show thumbs up/down buttons on assistant messages for user satisfaction tracking.

### 14.1 API

```
POST /api/feedback
Body: { clientId, sessionId, messageIndex, rating: "up"|"down" }
```

### 14.2 Implementation

In `ChatMessage.jsx`, after assistant message text:

```jsx
{
  message.role === 'assistant' && config.features.feedback && (
    <div className="feedback-buttons">
      <button onClick={() => sendFeedback('up')}>👍</button>
      <button onClick={() => sendFeedback('down')}>👎</button>
    </div>
  );
}
```

### 14.3 Config Extension

```json
{
  "features": {
    "feedback": true
  }
}
```

---

## 15. Handoff to Human (Opt-in)

Allows customers to request a live human operator. The AI bot pauses the conversation and notifies the operator. **This feature is opt-in** — it only activates when `handoffEnabled: true` is set in the client's AI Settings (via admin panel toggle).

### 15.1 How It Works

1. Customer types a handoff keyword ("оператор", "человек", "менеджер", "human", "operator", "live agent", etc.)
2. `channelRouter` detects the keyword (only if `handoffEnabled` is true for that client)
3. A Handoff record is created with status `pending`
4. Operator is notified via Telegram (if connected) and admin panel (Channels tab shows pending handoffs)
5. While handoff is pending/active, the bot responds with a "human is coming" message instead of AI generation
6. Admin resolves the handoff via the admin panel → bot resumes normal operation

### 15.2 Widget Implementation

When handoff is enabled, the widget should implement:

**Handoff Button (optional)**:

```jsx
// A "Talk to Human" button in the header or as a quick reply
<button onClick={() => sendMessage('Соединить с оператором')}>
  <UserCheck size={16} /> Оператор
</button>
```

**Handoff State Detection**:
The SSE stream will return a single non-AI message when handoff is active. The widget should detect this and display a special UI:

```jsx
// In ChatMessage.jsx, detect handoff response pattern
const isHandoffMessage =
  message.content.includes('Передаю вашу беседу оператору') ||
  message.content.includes('Ваш запрос уже передан оператору');

if (isHandoffMessage) {
  // Show a special "waiting for operator" card with pulsing animation
  return (
    <div className="handoff-card">
      <div className="animate-pulse">🤝</div>
      <p>{message.content}</p>
    </div>
  );
}
```

### 15.3 Handoff Keywords (Server-side)

The server automatically detects these keywords (case-insensitive):

- Russian: оператор, человек, менеджер, живой человек, поговорить с человеком, соединить с оператором, позвать менеджера, нужен человек
- English: human, operator, agent, talk to human, real person, support agent, live agent

### 15.4 API Reference

**Handoff status is managed server-side** — the widget does NOT call handoff APIs directly. The `/api/chat/stream` and `/api/chat` endpoints automatically handle handoff via `channelRouter`.

Admin API (for reference only):

- `GET /api/handoff?clientId=X` — list handoffs with stats
- `PATCH /api/handoff` — `{ handoffId, action: 'assign' | 'resolve' }`

### 15.5 Config Extension

```json
{
  "features": {
    "handoff": true
  }
}
```

When `features.handoff` is true in `widget.config.json`, include the "Talk to Human" button in the widget UI. The actual handoff logic is handled entirely server-side — the widget just needs to send the keyword message and display the response.

**IMPORTANT**: This feature requires the admin to enable `handoffEnabled` in AI Settings for the specific client. If the admin hasn't enabled it, the keyword detection won't trigger even if the widget has the handoff button.
