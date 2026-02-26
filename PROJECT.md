# WinBix AI — Project Documentation

## What is this?

**WinBix AI** is a multi-tenant SaaS platform that creates and deploys AI chat widgets for businesses. A client (dental clinic, car tuning studio, etc.) gets a customized widget embedded on their site with a single script tag:

```html
<script src="https://winbix-ai.xyz/widgets/drcare/script.js"></script>
```

The widget answers visitor questions 24/7 using the client's knowledge base + Google Gemini AI. It supports web chat, Telegram, WhatsApp, and Instagram channels.

---

## Tech Stack

| Component          | Technology                                                                 |
| ------------------ | -------------------------------------------------------------------------- |
| **Web App**        | Next.js 15 (App Router), TypeScript, Tailwind CSS v4, MongoDB (Mongoose)   |
| **Widget Builder** | Preact + Vite + Tailwind CSS v3, Shadow DOM isolation                      |
| **AI**             | Google Gemini API (`@google/generative-ai`)                                |
| **Payments**       | WayForPay (cards), Cryptomus (crypto), NowPayments (crypto)                |
| **Integrations**   | Google Sheets API, Telegram Bot API, WhatsApp (WHAPI), Instagram, ManyChat |
| **Deployment**     | Docker (multi-stage), production at `https://winbix-ai.xyz`                |

---

## Architecture: 3 Layers

The project uses a **3-layer architecture** where each layer has a distinct responsibility:

### Layer 1: Skills (What to do)

Directory: `.agent/skills/` — SOP instructions in Markdown. Each skill is a self-contained recipe:

| Skill                           | Purpose                                       |
| ------------------------------- | --------------------------------------------- |
| `create-widget`                 | Full custom widget with discovery interview   |
| `create-quick-widget`           | Auto-create demo widget from website analysis |
| `mass-quick-widgets`            | Batch create widgets from Google Sheets leads |
| `create-start-messages`         | Generate personalized outreach messages       |
| `upload-widget-knowledge`       | Crawl site & populate AI knowledge base       |
| `create-telegram-bot-assistant` | Set up Telegram bot channel                   |
| `create-whatsapp-assistant`     | Set up WhatsApp channel                       |
| `create-instagram-assistant`    | Set up Instagram channel                      |

### Layer 2: Orchestration (Decision making)

The AI agent (Claude/Gemini). Reads skills, calls scripts in the right order, handles errors, updates skills with learnings.

### Layer 3: Execution (Deterministic scripts)

Node.js scripts in `.agent/widget-builder/scripts/` — generate code, build widgets, make API calls. Reliable, testable, fast.

**Why 3 layers?** LLMs make errors. 90% accuracy per step = 59% success over 5 steps. Solution: push complexity into deterministic scripts, AI focuses on decision-making.

---

## Directory Structure

```
AIWidget/
├── src/                              # Next.js application
│   ├── app/
│   │   ├── admin/                    # Admin panel (dashboard, client detail, settings)
│   │   ├── cabinet/                  # Client self-service portal (home, billing)
│   │   ├── demo/[template]/          # Demo pages (Dental, Construction, Hotel, ClientWebsite)
│   │   ├── client/[id]/              # Client widget embed page
│   │   ├── api/                      # 52 API endpoints (see API Reference below)
│   │   │   ├── auth/                 # Admin & client authentication
│   │   │   ├── chat/                 # Chat endpoints (stream, non-stream)
│   │   │   ├── clients/              # Client CRUD + delete + channels
│   │   │   ├── ai-settings/          # AI configuration per client
│   │   │   ├── knowledge/            # Knowledge base management
│   │   │   ├── integrations/sheets/  # Google Sheets (read, update, search, export)
│   │   │   ├── telegram/             # Telegram (notify, webhook)
│   │   │   ├── payments/             # Payments (setup, checkout, cancel, webhooks)
│   │   │   ├── webhooks/             # Integration webhooks (WhatsApp, Instagram, ManyChat)
│   │   │   ├── handoff/              # Lead handoff to human operator
│   │   │   ├── leads/                # Lead capture
│   │   │   ├── credits/              # Credit management (status, topup)
│   │   │   ├── analytics/            # Analytics data
│   │   │   ├── chat-logs/            # Chat history
│   │   │   ├── proactive-triggers/   # Proactive messaging rules
│   │   │   ├── corrections/          # AI response corrections
│   │   │   ├── feedback/             # User feedback
│   │   │   ├── health/               # Health check
│   │   │   └── widgets/[...path]/    # Widget file server
│   │   └── quickwidgets/[...path]/   # Quick widget file server
│   │
│   ├── models/                       # 14 Mongoose models
│   │   ├── Client.ts                 # Client accounts, billing, subscriptions
│   │   ├── AISettings.ts             # AI config per client (prompt, model, temp)
│   │   ├── KnowledgeChunk.ts         # Knowledge base items (text + embeddings)
│   │   ├── ChatLog.ts                # Conversation history
│   │   ├── Correction.ts             # Admin answer overrides
│   │   ├── Feedback.ts               # User thumbs up/down ratings
│   │   ├── Handoff.ts                # Human operator takeover requests
│   │   ├── ChannelConfig.ts          # Channel credentials (Telegram, WhatsApp, etc.)
│   │   ├── Invoice.ts                # Payment records
│   │   ├── PricingConfig.ts          # Global pricing thresholds
│   │   ├── AuditLog.ts               # Admin action tracking
│   │   ├── Notification.ts           # Notification queue
│   │   ├── Webhook.ts                # Webhook logs
│   │   └── ProactiveTrigger.ts       # Proactive message rules
│   │
│   ├── lib/                          # 45+ utility libraries
│   │   ├── mongodb.ts                # Database connection
│   │   ├── auth.ts                   # Authentication (admin token + client JWT)
│   │   ├── gemini.ts                 # Gemini API (chat, embeddings, similarity search)
│   │   ├── channelRouter.ts          # Main message orchestration (471 lines)
│   │   ├── costGuard.ts              # Cost limit enforcement + notifications
│   │   ├── handoff.ts                # Human takeover logic
│   │   ├── googleSheets.ts           # Google Sheets API (JWT auth, CRUD)
│   │   ├── telegramBot.ts            # Telegram Bot API
│   │   ├── notifications.ts          # Email + Telegram notifications
│   │   ├── richMessages.ts           # Parse cards/buttons/carousel from AI
│   │   ├── seedKnowledge.ts          # Knowledge seed importer (production startup)
│   │   ├── exportSeed.ts             # Auto-export seeds on local changes
│   │   ├── widgetScanner.ts          # Widget folder scanner (filesystem ↔ DB sync)
│   │   ├── PaymentService.ts         # Payment orchestration
│   │   ├── rateLimit.ts              # Per-IP rate limiting
│   │   ├── models.ts                 # Gemini model registry + pricing
│   │   └── paymentProviders/         # WayForPay, Cryptomus, NowPayments
│   │
│   ├── components/
│   │   ├── admin/                    # Admin panel components
│   │   │   ├── ClientCard.tsx
│   │   │   └── tabs/                 # 13 tab components (AI Settings, Analytics, etc.)
│   │   ├── templates/                # Demo page templates (Dental, Construction, Hotel, ClientWebsite)
│   │   ├── cabinet/                  # Client portal components
│   │   └── ui/                       # Reusable UI (Toast, Pagination, ConfirmDialog, etc.)
│   │
│   └── middleware.ts                 # Auth middleware
│
├── .agent/
│   ├── skills/                       # Layer 1: Skill definitions (8 skills)
│   ├── widget-builder/               # Layer 3: Widget build system
│   │   ├── src/                      # Shared widget source (Preact)
│   │   │   ├── main.jsx              # Custom Element + Shadow DOM entry
│   │   │   ├── index.css             # Tailwind CSS v3
│   │   │   ├── hooks/                # Shared hooks (preserved across builds)
│   │   │   │   ├── useChat.js        # Chat logic, streaming, notification sound
│   │   │   │   ├── useVoice.js       # Web Speech API voice input
│   │   │   │   └── useDrag.js        # Draggable toggle button
│   │   │   └── components/           # Widget UI components
│   │   │       ├── Widget.jsx        # Main container
│   │   │       ├── ChatMessage.jsx   # Message display
│   │   │       ├── QuickReplies.jsx  # Starter buttons
│   │   │       └── MessageFeedback.jsx # Rating buttons
│   │   ├── clients/<clientId>/       # Per-client configs (23 clients)
│   │   │   ├── theme.json            # Design params (65+ fields)
│   │   │   ├── widget.config.json    # Widget behavior config
│   │   │   └── src/components/       # Client-specific component overrides
│   │   ├── scripts/                  # Build scripts
│   │   │   ├── generate-single-theme.js  # theme.json → 7 source files
│   │   │   ├── build.js              # Vite build → single script.js
│   │   │   └── mass-build.js         # Batch build all clients
│   │   ├── dist/                     # Build output (script.js)
│   │   ├── vite.config.js            # Vite config (IIFE output, CSS injection)
│   │   ├── postcss.config.cjs        # PostCSS (Tailwind v3)
│   │   ├── tailwind.config.js        # Tailwind v3 config
│   │   └── mass-build-configs.json   # Batch build manifest
│   ├── prompts/                      # AI system prompts
│   │   ├── outreach_agent_system_prompt.md
│   │   ├── niche_dental_addon.md
│   │   └── niche_beauty_salon_addon.md
│   └── workflows/                    # High-level workflow guides
│
├── widgets/<clientId>/               # Production widgets (script.js + info.json)
├── quickwidgets/<clientId>/          # Demo widgets (script.js + info.json)
├── knowledge-seeds/<clientId>.json   # Pre-exported knowledge + AI settings
├── scripts/                          # Root-level utility scripts
│   └── export-knowledge-seeds.js     # Export seeds from production
│
├── Dockerfile                        # Multi-stage Docker build
├── docker-compose.yml                # Dev environment (app + MongoDB)
├── service_account.json              # Google Sheets service account
├── .env.local                        # Secrets (tokens, API keys)
└── CLAUDE.md                         # Agent instructions
```

---

## Widget Build Pipeline

Widgets are **generated, not hand-written**. The entire flow is config-driven:

### Step 1: Analyze Client Website

Agent visits the site, extracts colors (hex from CSS), fonts, business name, services, contacts.

### Step 2: Create `theme.json`

65+ design parameters:

```json
{
  "domain": "drcare.com.ua",
  "font": "Montserrat",
  "headerFrom": "#6f4495",
  "headerTo": "#1a80dd",
  "toggleFrom": "#6f4495",
  "surfaceBg": "#1a1a2e",
  "isDark": true
}
```

### Step 3: Create `widget.config.json`

Widget behavior settings:

```json
{
  "clientId": "drcare",
  "bot": {
    "name": "Dr. Care Clinic",
    "greeting": "Welcome! How can I help?",
    "tone": "professional_friendly"
  },
  "features": {
    "streaming": true,
    "imageUpload": true,
    "quickReplies": { "enabled": true, "starters": ["🦷 How much is a consultation?"] },
    "sound": true,
    "voiceInput": true,
    "leads": true
  }
}
```

### Step 4: Generate Source Files

```bash
node .agent/widget-builder/scripts/generate-single-theme.js <clientId>
```

Reads `theme.json` → generates 7 files: `index.css`, `main.jsx`, `Widget.jsx`, `ChatMessage.jsx`, `QuickReplies.jsx`, `MessageFeedback.jsx`, `RichBlocks.jsx`

### Step 5: Build Widget

```bash
node .agent/widget-builder/scripts/build.js <clientId>
```

1. Copies client config to builder root
2. Overlays client-specific source over shared source
3. Runs Vite build → single IIFE file `dist/script.js` (~435KB)
4. PostCSS/Tailwind v3 processes CSS → stored in `window.__WIDGET_CSS__`

### Step 6: Deploy

```bash
cp .agent/widget-builder/dist/script.js widgets/<clientId>/script.js
# + write info.json with metadata
```

### Step 7: Upload Knowledge

Parse site content → split into chunks → generate embeddings via Gemini → `POST /api/knowledge`

### Step 8: Configure AI

`PUT /api/ai-settings/<clientId>` with system prompt, greeting, model, temperature.

---

## How the Widget Works in Browser

### Embedding

The `<script>` tag on the client's site:

1. Creates Custom Element `<ai-chat-widget>`
2. Attaches **Shadow DOM** (CSS isolation — widget styles don't leak to host page)
3. Injects processed CSS from `window.__WIDGET_CSS__` as `<style>`
4. Loads Google Fonts into document `<head>`
5. Renders Preact component tree inside Shadow DOM
6. On SPA navigation: removes stale widgets, clears Shadow DOM, remounts cleanly

### Widget Architecture

```
Widget.jsx (main container)
├── Toggle button (draggable, themed gradient)
├── Chat window
│   ├── Header (bot name, status, clear/close buttons)
│   ├── Messages area (auto-scroll)
│   │   ├── ChatMessage.jsx (each message with Markdown)
│   │   └── MessageFeedback.jsx (thumbs up/down)
│   ├── QuickReplies.jsx (starter question buttons)
│   └── Input area
│       ├── Image upload button
│       ├── Microphone button (voice input)
│       └── Textarea + send button
```

### 3 Shared Hooks (never overwritten per-client)

**`useChat.js`** — all chat logic:

- Message state management and localStorage persistence
- SSE streaming from `/api/chat/stream`
- Image upload (Base64 conversion)
- Notification sound (MP3 embedded as base64, ~50KB)
- Retry logic on errors

**`useVoice.js`** — voice input:

- Web Speech API (`SpeechRecognition`)
- Ukrainian (`uk-UA`) + any locale support
- Mic → text → insert into textarea

**`useDrag.js`** — draggable toggle button:

- Touch/mouse events, localStorage position persistence
- Double-click resets position

---

## Message Flow: Widget → AI → Response

When a user sends a message, here's the complete path:

```
1. WIDGET (browser)
   useChat.js → POST /api/chat/stream
   { clientId, message, sessionId, conversationHistory }
        │
        ▼
2. API ROUTE: /api/chat/stream/route.ts
   Parse JSON → routeMessageStream() → return SSE stream
        │
        ▼
3. CHANNEL ROUTER (channelRouter.ts) — main orchestrator
   │
   ├─ 3a. Client validation
   │       Client.findOne({clientId}) → check isActive
   │
   ├─ 3b. Cost limit check (costGuard.ts)
   │       monthlyCostUsd < $40? If not → block widget + notify
   │       monthlyCostUsd > $20? → warning (once/month)
   │
   ├─ 3c. Handoff check
   │       Active/pending handoff? → return "operator will respond"
   │       Message contains "оператор"/"менеджер"?
   │       → create Handoff, notify via Telegram
   │
   ├─ 3d. Load AI config (AISettings)
   │       systemPrompt, temperature, maxTokens, topK, aiModel
   │
   ├─ 3e. RAG (Retrieval-Augmented Generation)
   │       Generate query embedding (gemini-embedding-001)
   │       → Cosine similarity vs KnowledgeChunk collection
   │       → Top-K most similar chunks (default K=3, min similarity 0.3)
   │       → + Applied Corrections (highest priority overrides)
   │
   ├─ 3f. Build full prompt
   │       [System prompt] + [last 6 messages] + [RAG context] + [user message]
   │
   ├─ 3g. Call Gemini API (streaming)
   │       model.generateContentStream(...)
   │       → tokens sent via SSE: data: {"token": "..."}
   │
   ├─ 3h. Parse rich blocks (:::card, :::buttons, :::carousel)
   │
   ├─ 3i. Track cost (async)
   │       (inputTokens / 1M) * inputPrice + (outputTokens / 1M) * outputPrice
   │       → update Client.monthlyCostUsd
   │
   └─ 3j. Log conversation (async)
           ChatLog.upsert() with sessionId
        │
        ▼
4. WIDGET receives SSE stream
   data: {"token": "Hello"}
   data: {"token": "! How can"}
   data: {"token": " I help?"}
   data: {"rich": [...]}
   data: [DONE]
   → Text renders progressively (typewriter effect)
   → Notification sound plays (if tab is inactive)
```

---

## Cost Guard System

Every Gemini API call costs money. The system controls spending per client:

| Model                  | Input $/1M tokens | Output $/1M tokens |
| ---------------------- | ----------------- | ------------------ |
| gemini-2.5-flash-lite  | $0.05             | $0.20              |
| gemini-3-flash-preview | $0.10             | $0.40              |
| gemini-3-pro           | $1.25             | $5.00              |

**Thresholds** (from PricingConfig):

- **$20/month** → warning notification (email + Telegram, once per month)
- **$40/month** → block (widget disabled, client offered to buy extra credits)

**Extra Credits**: Client purchases $10/$20/$30 top-up → widget reactivated. Unused credits carry over (expire in 30 days).

---

## Client Sync (Filesystem ↔ Database)

Clients live in the filesystem (`widgets/` and `quickwidgets/` folders). The database syncs on every `GET /api/clients`:

- **Folder exists, no DB record** → create client in DB
- **DB record exists, no folder** → **delete from DB** (+ delete knowledgechunks, aisettings, chatlogs)

This means: **delete a folder from `quickwidgets/`** → client disappears completely from the system.

---

## Knowledge Seeds (Auto-deploy Knowledge)

**Problem**: Knowledge is parsed and uploaded locally. On production deploy, it should appear without re-parsing all websites.

**Solution — 3-part pipeline**:

### 1. Auto-export (local)

`src/lib/exportSeed.ts` — on every knowledge or AI settings change locally, a seed file is auto-written:

```
POST /api/knowledge      → exportClientSeed(clientId)
PUT /api/ai-settings     → exportClientSeed(clientId)
DELETE /api/knowledge     → exportClientSeed(clientId)
```

Output: `knowledge-seeds/<clientId>.json` (text + embeddings + AI settings)

### 2. Deploy

`Dockerfile` copies `knowledge-seeds/` into the Docker image.

### 3. Import (production)

`src/lib/seedKnowledge.ts` — on app startup, checks for seed files for clients without knowledge. If found → imports chunks + AI settings. If embeddings are missing → generates via Gemini.

---

## Handoff to Human Operator

When a user writes "оператор" / "менеджер" / "human" / "operator":

1. AI detects keyword via `detectHandoffRequest(message)`
2. Creates `Handoff` record with status `pending`
3. Sends Telegram notification to client owner
4. Bot responds: "Your request has been forwarded. Please wait."
5. Operator accepts in admin panel → status `active` → bot pauses
6. Operator resolves → status `resolved` → bot resumes

---

## Admin Panel (`/admin`)

| Route                | Purpose                                                                  |
| -------------------- | ------------------------------------------------------------------------ |
| `/admin`             | Dashboard — all clients, stats (Total Clients, Requests, Tokens, Active) |
| `/admin/client/[id]` | Client detail page with 13 tabs                                          |
| `/admin/settings`    | Global admin settings                                                    |

**Client Detail Tabs:**

1. **Client Info** — profile, contacts, website
2. **Channels** — Telegram, WhatsApp, Instagram integrations
3. **AI Settings** — system prompt editor, model selector, temperature, topK
4. **Knowledge** — manage knowledge base chunks
5. **Chat History** — browse conversations with search
6. **Billing** — subscription status, invoices
7. **Demo** — live widget preview
8. **Analytics** — Recharts graphs, usage metrics
9. **Proactive** — proactive message trigger builder
10. **Training** — training data management
11. **Usage** — API usage statistics
12. **Files** — document upload (PDF, Word)
13. **Channel Details** — individual channel configuration

---

## API Reference

### Authentication

All admin endpoints require `Cookie: admin_token=${ADMIN_SECRET_TOKEN}`.
Client endpoints use `Cookie: client_token=<token>` or `Bearer <token>`.

### Core Endpoints

| Endpoint                      | Method          | Purpose                                |
| ----------------------------- | --------------- | -------------------------------------- |
| `/api/clients`                | GET             | List clients (syncs filesystem ↔ DB)   |
| `/api/clients/[id]`           | GET/PUT         | Get/update client                      |
| `/api/clients/[id]/delete`    | DELETE          | Delete quick widget + all related data |
| `/api/chat/stream`            | POST            | Stream AI chat response (SSE)          |
| `/api/ai-settings/[clientId]` | GET/PUT         | AI configuration                       |
| `/api/knowledge`              | GET/POST/DELETE | Knowledge base CRUD                    |
| `/api/knowledge/upload`       | POST            | Bulk document upload                   |

### Integrations

| Endpoint                          | Method | Purpose                       |
| --------------------------------- | ------ | ----------------------------- |
| `/api/integrations/sheets/read`   | GET    | Read Google Sheets data       |
| `/api/integrations/sheets/update` | POST   | Write to Google Sheets        |
| `/api/integrations/sheets/search` | GET    | Search spreadsheets by name   |
| `/api/telegram/notify`            | POST   | Send Telegram notification    |
| `/api/telegram/webhook`           | POST   | Receive Telegram bot messages |
| `/api/webhooks/whatsapp`          | POST   | WhatsApp webhook              |
| `/api/webhooks/instagram`         | POST   | Instagram webhook             |
| `/api/webhooks/manychat`          | POST   | ManyChat webhook              |

### Payments

| Endpoint                            | Method   | Purpose                       |
| ----------------------------------- | -------- | ----------------------------- |
| `/api/payments/setup`               | GET      | Initialize payment            |
| `/api/payments/tiers`               | GET      | List subscription tiers       |
| `/api/payments/wayforpay/checkout`  | POST     | WayForPay checkout            |
| `/api/payments/cancel`              | GET/POST | Cancel subscription           |
| `/api/payments/webhook/wayforpay`   | POST     | WayForPay payment confirmed   |
| `/api/payments/webhook/cryptomus`   | POST     | Cryptomus payment confirmed   |
| `/api/payments/webhook/nowpayments` | POST     | NowPayments payment confirmed |
| `/api/credits/status`               | GET      | Credit balance                |
| `/api/credits/topup`                | POST     | Add extra credits             |

### Business Logic

| Endpoint                  | Method   | Purpose                        |
| ------------------------- | -------- | ------------------------------ |
| `/api/handoff`            | POST     | Lead handoff to human          |
| `/api/leads`              | GET/POST | Lead capture                   |
| `/api/corrections`        | POST     | AI response corrections        |
| `/api/feedback`           | POST     | User feedback (thumbs up/down) |
| `/api/proactive-triggers` | GET/POST | Proactive message rules        |
| `/api/analytics`          | GET      | Analytics data                 |
| `/api/chat-logs`          | GET      | Chat history                   |
| `/api/health`             | GET      | Health check                   |

---

## Database Models

| Model                | Purpose              | Key Fields                                                                                                   |
| -------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Client**           | Client account       | `clientId`, `website`, `isActive`, `monthlyCostUsd`, `subscriptionStatus`, `prepaidUntil`, `extraCreditsUsd` |
| **AISettings**       | AI config per client | `clientId`, `systemPrompt`, `greeting`, `temperature`, `maxTokens`, `topK`, `aiModel`, `handoffEnabled`      |
| **KnowledgeChunk**   | RAG vector store     | `clientId`, `text`, `embedding` (number[768]), `source`                                                      |
| **ChatLog**          | Conversations        | `clientId`, `sessionId`, `messages[]`, `metadata` (channel, ip, userAgent)                                   |
| **Correction**       | Answer overrides     | `clientId`, `userQuestion`, `correctedAnswer`, `status` (pending/applied/rejected)                           |
| **Feedback**         | Response ratings     | `clientId`, `sessionId`, `rating` (up/down)                                                                  |
| **Handoff**          | Operator takeover    | `clientId`, `status` (pending/active/resolved), `channel`, `customerContact`                                 |
| **ChannelConfig**    | Channel credentials  | `clientId`, `channel`, `provider`, `config`                                                                  |
| **Invoice**          | Payment records      | `clientId`, `amount`, `currency`, `status`                                                                   |
| **PricingConfig**    | Spending thresholds  | `costWarningThreshold` ($20), `costBlockThreshold` ($40)                                                     |
| **AuditLog**         | Action tracking      | `action`, `actor`, `target`, `timestamp`                                                                     |
| **Notification**     | Notification queue   | `clientId`, `type`, `message`, `delivered`                                                                   |
| **Webhook**          | Webhook logs         | `clientId`, `event`, `payload`                                                                               |
| **ProactiveTrigger** | Proactive rules      | `clientId`, `trigger`, `condition`, `message`                                                                |

---

## Docker Deployment

### Local Development

```bash
docker-compose up    # Next.js on :3000 + MongoDB on :27017
# OR
npm run dev          # Dev server (requires MongoDB running separately)
```

`docker-compose.yml` runs two services: `app` (Next.js) and `mongo` (MongoDB 7).

### Production

Multi-stage `Dockerfile`:

1. **deps** — install production dependencies
2. **builder** — `npm run build` → Next.js standalone output
3. **runner** — minimal image with `.next/standalone`, `widgets/`, `quickwidgets/`, `knowledge-seeds/`, `public/`

Environment variables: `MONGODB_URI`, `ADMIN_SECRET_TOKEN`, `GEMINI_API_KEY`, `NEXT_PUBLIC_BASE_URL`, SMTP settings, Telegram bot token, payment provider keys.

---

## Mass Operations

### Mass Widget Build

```bash
node .agent/widget-builder/scripts/mass-build.js
```

Reads `mass-build-configs.json` (23 clients), for each: generates config → builds → copies to `widgets/` and `quickwidgets/`.

### Mass Start Messages (create-start-messages skill)

1. Read Google Sheets leads
2. Filter by `widget=TRUE`
3. For each: analyze website → generate personalized message with demo link
4. Write messages to spreadsheet
5. Send Telegram summary report

### Export Knowledge Seeds from Production

```bash
node scripts/export-knowledge-seeds.js https://winbix-ai.xyz <admin_token>
```

---

## Key Constraints & Gotchas

1. **Tailwind v3 vs v4**: Main Next.js app uses v4, widget builder uses v3. Never mix configs.
2. **Shadow DOM CSS**: Widget CSS must be processed by PostCSS/Tailwind before injection. Raw `@tailwind` directives don't work.
3. **Shared hooks must stay shared**: Never place hooks in `clients/<id>/src/hooks/`. The `build.js` script uses `fs.cpSync(force: true)` which would overwrite the shared version.
4. **Google Sheets grid**: Default 26 columns (A-Z). Column AA+ requires expanding via `batchUpdate` API first.
5. **Sheet range format**: No sheet name prefix. `Z1` works, `Sheet1!Z1` fails.
6. **Ukrainian sites**: Many are WordPress/Elementor SPAs — try WP REST API (`/wp-json/wp/v2/pages`), sitemaps (`/sitemap.xml`).
7. **Demo link encoding**: Website URLs must be `encodeURIComponent()`-encoded.
8. **Service account**: `service_account.json` in project root, spreadsheet must be shared with the service account email.
9. **Custom Elements**: `customElements.define()` can only be called once per element name. SPA navigation handled by removing stale elements + Shadow DOM cleanup.
10. **Knowledge seed export**: Only runs on local (`NODE_ENV !== 'production'`). Seeds auto-update when knowledge or AI settings change.

---

## Environment

| Environment  | URL                                                                           |
| ------------ | ----------------------------------------------------------------------------- |
| Local dev    | `http://localhost:3000`                                                       |
| Production   | `https://winbix-ai.xyz`                                                       |
| Demo links   | `https://winbix-ai.xyz/demo/client-website?client=<id>&website=<encoded_url>` |
| Widget embed | `<script src="https://winbix-ai.xyz/widgets/<id>/script.js"></script>`        |
| Quick widget | `<script src="https://winbix-ai.xyz/quickwidgets/<id>/script.js"></script>`   |

---

## Current Clients (23)

### Dental Clinics (15)

`drcare`, `dentline`, `dentify`, `dentalbar`, `zdorovo`, `ddc`, `narin`, `smilelab`, `dentiplex`, `meddeo`, `osadchyclinic`, `dentalart`, `coraldent`, `whiteclinic`, `smileclinic`

### Car Tuning (5)

`upstage`, `gtuning`, `jstuning`, `tuningcomua`, `fasttuning`

### Other (3)

`bruno`, and 2 additional clients

All have widgets in `widgets/` and `quickwidgets/`, knowledge seeds in `knowledge-seeds/`, and configs in `.agent/widget-builder/clients/`.
