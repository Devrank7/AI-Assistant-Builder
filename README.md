# WinBix AI

**AI that sells while you sleep.**

WinBix AI — multi-tenant SaaS-платформа, которая разворачивает AI чат-ассистентов для бизнеса за 30 секунд. Пользователь вставляет URL сайта → AI анализирует бизнес → создаёт кастомный виджет с базой знаний → виджет отвечает клиентам 24/7 на 4 языках, бронирует встречи, собирает лиды и интегрируется с CRM.

**Продакшн:** [https://winbixai.com](https://winbixai.com)

---

## Что это за продукт

WinBix AI — это конструктор AI-ассистентов, который конкурирует с Intercom, Tidio, Crisp и Drift. Ключевое отличие: **AI Builder Agent** — пользователь общается с AI в чате, а тот создаёт, настраивает и деплоит виджет через инструменты (function calling). Нет UI-форм — всё через разговор.

### Для кого

- **Малый и средний бизнес** — установить AI-ассистента на сайт за 30 секунд
- **Агентства** — массово создавать виджеты для клиентов (mass-build из Google Sheets)
- **Enterprise** — white-label, кастомный домен, SLA 99.9%

### Ценностное предложение

```
Пользователь вставляет URL → AI краулит 30+ страниц → извлекает цвета, шрифты, контент →
генерирует 3 варианта дизайна → загружает знания в RAG → деплоит виджет →
виджет работает 24/7 на сайте клиента
```

---

## Техстек

| Слой           | Технологии                                                               |
| -------------- | ------------------------------------------------------------------------ |
| **Frontend**   | Next.js 15 (App Router), TypeScript, Tailwind CSS v4                     |
| **Widget**     | Preact + Vite + Tailwind CSS v3, Shadow DOM изоляция                     |
| **Database**   | MongoDB (Mongoose), vector embeddings для RAG                            |
| **AI**         | Google Gemini API (`@google/genai`), function calling, streaming         |
| **Payments**   | Stripe, WayForPay, NowPayments, Cryptomus, LiqPay                        |
| **Channels**   | Web chat, Telegram Bot API, WhatsApp (WHAPI), Instagram (Meta Graph API) |
| **Deployment** | Docker, production на winbixai.com                                       |

---

## Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        WinBix AI Platform                        │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │  Dashboard    │  │  Admin Panel │  │  AI Builder (Chat UI)  │ │
│  │  /dashboard/* │  │  /admin/*    │  │  /dashboard/builder    │ │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬─────────────┘ │
│         │                 │                      │               │
│  ┌──────▼─────────────────▼──────────────────────▼─────────────┐ │
│  │                    API Layer (120+ routes)                   │ │
│  │  /api/chat/stream  /api/builder/chat  /api/integrations/*   │ │
│  └──────┬─────────────────┬──────────────────────┬─────────────┘ │
│         │                 │                      │               │
│  ┌──────▼───────┐  ┌─────▼──────────┐  ┌───────▼────────────┐  │
│  │ Channel      │  │ Agentic Router │  │ Plugin Registry    │  │
│  │ Router       │  │ (function      │  │ (HubSpot, Calendar │  │
│  │ (RAG + AI)   │  │  calling loop) │  │  Stripe, Sheets)   │  │
│  └──────┬───────┘  └────────────────┘  └────────────────────┘  │
│         │                                                       │
│  ┌──────▼───────────────────────────────────────────────────┐   │
│  │              MongoDB (25 models)                          │   │
│  │  Users, Clients, KnowledgeChunks, ChatLogs, Integrations │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘

         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │ Website │         │Telegram │         │WhatsApp │
    │ Widget  │         │  Bot    │         │ (WHAPI) │
    │(Preact) │         │         │         │         │
    └─────────┘         └─────────┘         └─────────┘
```

### 3-Layer Architecture

| Слой                        | Назначение                                     | Где                               |
| --------------------------- | ---------------------------------------------- | --------------------------------- |
| **Skills** (инструкции)     | SOP-документы для AI-агента                    | `.claude/skills/*/SKILL.md`       |
| **Orchestration** (решения) | AI Builder Agent — роутинг, вызов инструментов | `src/lib/builder/`                |
| **Execution** (исполнение)  | Детерминистические Node.js скрипты             | `.claude/widget-builder/scripts/` |

---

## Возможности платформы

### Core — Что работает сейчас

| Фича                         | Статус      | Описание                                                                             |
| ---------------------------- | ----------- | ------------------------------------------------------------------------------------ |
| **AI Builder Agent**         | ✅ Работает | Пользователь общается в чате → агент вызывает tools → виджет создаётся автоматически |
| **30-секундный деплой**      | ✅ Работает | URL → анализ сайта → генерация дизайна → RAG knowledge → деплой                      |
| **3 типа виджетов**          | ✅ Работает | AI Chat (RAG чатбот), Smart FAQ (аккордеон), Lead Form (мульти-шаговая форма)        |
| **RAG Knowledge Base**       | ✅ Работает | Deep crawl (30+ страниц), embeddings, semantic search, corrections                   |
| **Streaming Responses**      | ✅ Работает | SSE streaming с rich blocks (карусели, формы, кнопки)                                |
| **4 языка**                  | ✅ Работает | EN, UK, RU, AR — автоматическое определение                                          |
| **Voice Input**              | ✅ Работает | Web Speech API (speech-to-text)                                                      |
| **Text-to-Speech**           | ✅ Работает | Google Cloud TTS + browser fallback                                                  |
| **Proactive Nudges**         | ✅ Работает | Всплывающее сообщение через N секунд                                                 |
| **Omnichannel**              | ✅ Работает | Web, Telegram, WhatsApp, Instagram — один AI на всех каналах                         |
| **Human Handoff**            | ✅ Работает | Автоопределение "хочу оператора" → пауза бота → передача человеку                    |
| **A/B Testing**              | ✅ Работает | Несколько вариантов виджета, трекинг конверсий                                       |
| **Analytics Dashboard**      | ✅ Работает | Чаты/день, top вопросы, каналы, satisfaction, response time                          |
| **Integrations Marketplace** | ✅ Работает | HubSpot, Salesforce, Pipedrive, Calendly, Stripe, Google Sheets и др.                |
| **Team Management**          | ✅ Работает | Организации, роли (owner/admin/editor/viewer), инвайты                               |
| **Billing**                  | ✅ Работает | Stripe + 5 альтернативных провайдеров, trial, plans                                  |
| **Webhooks**                 | ✅ Работает | 6 event types, HMAC-SHA256 подпись, auto-disable после 10 ошибок                     |
| **Audit Log**                | ✅ Работает | 19+ типов действий, 90-дневное хранение                                              |
| **Widget Versioning**        | ✅ Работает | Rollback к предыдущим версиям                                                        |
| **Proactive Consultant**     | ✅ Работает | Builder-агент активно предлагает улучшения после деплоя                              |

### AI Actions — Autonomous Agent (новое)

| Фича                     | Статус                         | Описание                                                    |
| ------------------------ | ------------------------------ | ----------------------------------------------------------- |
| **Agentic Router**       | ✅ Код готов, ⚠️ не тестирован | Gemini function calling loop в widget chat (max 5 итераций) |
| **Built-in Tools**       | ✅ Код готов, ⚠️ не тестирован | `collect_lead`, `search_knowledge`, `send_notification`     |
| **Integration Tools**    | ✅ Код готов, ⚠️ не тестирован | Динамическая загрузка tools из WidgetIntegration bindings   |
| **Action UI Indicators** | ✅ Код готов, ⚠️ не тестирован | Спиннер/галочка/крестик в чате при выполнении действий      |
| **Rate Limiting**        | ✅ Код готов                   | Max N actions per session (настраивается)                   |

### Plugins — Реализация интеграций

| Plugin              | Статус           | Actions                                   |
| ------------------- | ---------------- | ----------------------------------------- |
| **HubSpot**         | ✅ Полностью     | createContact, createDeal, searchContacts |
| **Pipedrive**       | 📋 Manifest only | createContact, createDeal                 |
| **Salesforce**      | 📋 Manifest only | createContact, createOpportunity          |
| **Google Calendar** | 📋 Manifest only | checkAvailability, createEvent            |
| **Calendly**        | 📋 Manifest only | getAvailableSlots, createBooking          |
| **Stripe**          | 📋 Manifest only | createPaymentLink, checkPayment           |
| **Telegram**        | 📋 Manifest only | sendMessage                               |
| **WhatsApp**        | 📋 Manifest only | sendMessage                               |
| **Google Sheets**   | 📋 Manifest only | appendRow, readRange                      |
| **Email (SMTP)**    | 📋 Manifest only | sendEmail                                 |

> **📋 Manifest only** = определены actions + auth schema, но execute() возвращает stub. Нужно реализовать HTTP вызовы к API.

---

## Тарифные планы

|                  | Free    | Starter        | Pro          | Enterprise        |
| ---------------- | ------- | -------------- | ------------ | ----------------- |
| **Цена**         | $0      | $29/мес        | $79/мес      | $299/мес          |
| **Виджеты**      | 1       | 3              | ∞            | ∞                 |
| **Сообщения**    | 100/мес | 1,000/мес      | ∞            | ∞                 |
| **Каналы**       | Web     | Web + Telegram | Все          | Все + Custom      |
| **AI Builder**   | —       | —              | ✅           | ✅                |
| **Integrations** | —       | 3 preset       | Все          | Все + Agent-built |
| **A/B Tests**    | —       | —              | 2 concurrent | ∞                 |
| **Team**         | 1       | 2              | 5            | ∞                 |
| **White-label**  | —       | —              | —            | ✅                |
| **SLA**          | —       | —              | —            | 99.9%             |

---

## Структура проекта

```
├── .claude/
│   ├── skills/                          # AI-агентные скиллы (SOPs)
│   │   ├── create-widget/SKILL.md       # Полное создание виджета
│   │   ├── create-quick-widget/SKILL.md # Быстрый демо-виджет из URL
│   │   ├── mass-quick-widgets/SKILL.md  # Массовое создание из Google Sheets
│   │   ├── upload-widget-knowledge/     # Краулинг + загрузка знаний
│   │   ├── create-telegram-bot-assistant/
│   │   ├── create-whatsapp-assistant/
│   │   ├── create-instagram-assistant/
│   │   └── check-demo-quality/          # Проверка iframe-совместимости
│   │
│   └── widget-builder/                  # Preact Widget Builder
│       ├── src/
│       │   ├── main.jsx                 # Custom Element + Shadow DOM entry
│       │   ├── components/
│       │   │   ├── Widget.jsx           # Главный UI (chat, toggle, header)
│       │   │   ├── ChatMessage.jsx      # Markdown рендер, code blocks
│       │   │   ├── QuickReplies.jsx     # Кнопки быстрых ответов
│       │   │   ├── MessageFeedback.jsx  # Thumbs up/down
│       │   │   └── RichBlocks.jsx       # Карусели, формы, карточки
│       │   └── hooks/
│       │       ├── useChat.js           # Streaming, SSE, actions, history
│       │       ├── useVoice.js          # Speech-to-text
│       │       ├── useTTS.js            # Text-to-speech
│       │       ├── useDrag.js           # Draggable toggle
│       │       ├── useProactive.js      # Nudge bubble
│       │       └── useLanguage.js       # Auto language detection
│       ├── clients/<clientId>/          # Per-client customizations
│       └── scripts/
│           ├── generate-single-theme.js # theme.json → 7 source files
│           └── build.js                 # Vite build → script.js
│
├── src/
│   ├── app/                             # Next.js 15 App Router
│   │   ├── page.tsx                     # Landing page
│   │   ├── pricing/                     # Pricing page
│   │   ├── dashboard/                   # User dashboard
│   │   │   ├── builder/                 # AI Builder (chat UI)
│   │   │   ├── widgets/                 # Widget management
│   │   │   ├── chats/                   # Chat history viewer
│   │   │   ├── analytics/               # Analytics dashboard
│   │   │   ├── ab-tests/                # A/B testing
│   │   │   ├── integrations/            # Integration marketplace
│   │   │   ├── team/                    # Team management
│   │   │   ├── billing/                 # Subscription & payments
│   │   │   └── settings/                # User preferences
│   │   ├── admin/                       # Admin panel
│   │   │   ├── users/                   # User management
│   │   │   ├── clients/                 # Client management (tabs)
│   │   │   ├── subscriptions/           # Subscription tracking
│   │   │   └── analytics/               # Platform analytics
│   │   └── api/                         # 120+ API routes
│   │       ├── auth/                    # JWT + Google OAuth
│   │       ├── chat/stream/             # SSE streaming endpoint
│   │       ├── builder/chat/            # Builder agent endpoint
│   │       ├── knowledge/               # RAG CRUD + deep crawl
│   │       ├── integrations/            # Plugin marketplace
│   │       ├── webhooks/                # Telegram, WhatsApp, Instagram
│   │       ├── stripe/                  # Payments
│   │       ├── ab-tests/                # A/B testing
│   │       ├── analytics/               # Analytics API
│   │       └── admin/                   # Admin operations
│   │
│   ├── lib/                             # Business logic
│   │   ├── channelRouter.ts             # Unified AI message handler (all channels)
│   │   ├── agenticRouter.ts             # AI Actions — function calling loop
│   │   ├── widgetTools.ts               # Dynamic tool loader per widget
│   │   ├── gemini.ts                    # Embeddings, RAG search
│   │   ├── models.ts                    # Gemini model registry + pricing
│   │   ├── richMessages.ts              # Parse :::carousel, :::form blocks
│   │   ├── handoff.ts                   # Human handoff workflow
│   │   ├── analytics.ts                 # Chat analytics aggregation
│   │   ├── pricing.ts                   # Plan definitions & feature matrix
│   │   ├── builder/
│   │   │   ├── systemPrompt.ts          # AI Builder agent prompt
│   │   │   ├── geminiAgent.ts           # Gemini function calling (builder)
│   │   │   ├── anthropicAgent.ts        # Claude fallback agent
│   │   │   ├── toolRegistry.ts          # Tool registration system
│   │   │   └── tools/
│   │   │       ├── coreTools.ts         # analyze_site, build_deploy, etc.
│   │   │       ├── integrationTools.ts  # web_search, write_integration
│   │   │       └── proactiveTools.ts    # analyze_opportunities
│   │   └── integrations/
│   │       ├── core/
│   │       │   ├── PluginRegistry.ts    # Plugin discovery + execution
│   │       │   ├── types.ts             # Plugin interfaces
│   │       │   └── HealthMonitor.ts     # Connection health checks
│   │       └── plugins/                 # 13+ integration plugins
│   │
│   ├── models/                          # 25 MongoDB schemas
│   │   ├── User.ts                      # Auth, plans, organizations
│   │   ├── Client.ts                    # Widget clients, billing, costs
│   │   ├── AISettings.ts                # Per-client AI config + actions
│   │   ├── KnowledgeChunk.ts            # RAG text + vector embeddings
│   │   ├── ChatLog.ts                   # Conversation history (365d TTL)
│   │   ├── Integration.ts               # Connected service credentials
│   │   ├── WidgetIntegration.ts         # Widget ↔ Integration bindings
│   │   ├── ABTest.ts                    # A/B test variants & results
│   │   ├── ProactiveTrigger.ts          # Nudge trigger rules
│   │   ├── Handoff.ts                   # Human handoff requests
│   │   ├── Webhook.ts                   # Custom webhooks (HMAC signed)
│   │   └── ...
│   │
│   └── components/                      # React UI (100+ components)
│       ├── builder/                     # AI Builder chat, preview, pipeline
│       ├── dashboard/                   # Command palette, navigation
│       ├── admin/                       # Admin tabs, data tables, charts
│       ├── analytics/                   # Analytics charts
│       ├── playground/                  # Widget sandbox
│       ├── templates/                   # Industry demo pages
│       └── ui/                          # Design system (buttons, modals, etc.)
│
├── widgets/<clientId>/                  # Production widgets (script.js)
├── quickwidgets/<clientId>/             # Demo widgets (script.js)
├── knowledge-seeds/<clientId>.json      # Portable knowledge snapshots
└── scripts/                             # Standalone utilities
```

---

## Widget Build Pipeline

```
1. User provides URL
   ↓
2. analyze_site → Deep crawl (sitemap + BFS, 30+ pages)
   → Extract: colors, fonts, business type, content, links
   ↓
3. generate_design → Gemini generates 3 theme.json variants
   ↓
4. generate-single-theme.js → 7 source files from theme.json
   (Widget.jsx, ChatMessage.jsx, QuickReplies.jsx, etc.)
   ↓
5. build.js → Vite IIFE build → script.js (single file, CSS injected)
   ↓
6. Deploy → quickwidgets/<clientId>/script.js
   ↓
7. crawl_knowledge → Extract text from 30+ pages → embeddings → MongoDB
   ↓
8. Widget is live: <script src="https://winbixai.com/quickwidgets/<id>/script.js"></script>
```

---

## AI Actions (Autonomous Agent)

Виджет может не только отвечать на вопросы, но и **выполнять действия**:

```
Посетитель: "Хочу записаться на массаж на пятницу"
AI: [вызывает check_availability] → "Есть 14:00 и 16:30. Какое время?"
Посетитель: "14:00"
AI: [вызывает book_appointment] → "Готово! Запись на пятницу 14:00. ✅"
```

### Как работает

1. `channelRouter.ts` проверяет `actionsEnabled` в AI Settings
2. Если включено → делегирует в `agenticRouter.ts`
3. `widgetTools.ts` загружает tools: built-in + из WidgetIntegration bindings
4. Gemini получает `functionDeclarations` → может вызывать tools
5. Agentic loop (max 5 итераций): Gemini → tool call → execute → result → Gemini → text
6. SSE events: `action_start` (спиннер), `action_result` (галочка/крестик)

### Built-in Tools (всегда доступны)

| Tool                | Описание                                                    |
| ------------------- | ----------------------------------------------------------- |
| `collect_lead`      | Сохраняет лид (имя, email, телефон) из разговора            |
| `search_knowledge`  | Расширенный поиск по knowledge base (top-5, threshold 0.25) |
| `send_notification` | Уведомление владельцу в Telegram                            |

### Integration Tools (из подключённых интеграций)

Динамически загружаются из WidgetIntegration. Если подключён HubSpot с action `createContact` → виджет может создавать контакты прямо в чате.

### Статус

⚠️ **Код написан и компилируется, но не тестирован с реальным Gemini API.** Нужен ручной тест: включить `actionsEnabled: true` для виджета → отправить сообщение → проверить agentic loop.

---

## Channels

| Канал          | Endpoint                       | Особенности                                                     |
| -------------- | ------------------------------ | --------------------------------------------------------------- |
| **Web Widget** | `POST /api/chat/stream`        | SSE streaming, rich blocks, page context, follow-up suggestions |
| **Telegram**   | `POST /api/webhooks/telegram`  | Bot API, /start linking, user metadata                          |
| **WhatsApp**   | `POST /api/webhooks/whatsapp`  | WHAPI + Meta Cloud API, human takeover (30 min timeout)         |
| **Instagram**  | `POST /api/webhooks/instagram` | Meta Graph API v21+, DM routing, attachment support             |

Все каналы используют единый `channelRouter.ts` → одна и та же RAG + AI логика.

---

## API Overview

### Auth & Users

- `POST /api/auth/register` — Регистрация
- `POST /api/auth/login` — JWT login
- `GET /api/auth/google` — Google OAuth
- `POST /api/auth/refresh` — Refresh token
- `GET /api/auth/me` — Current user

### Chat & AI

- `POST /api/chat/stream` — SSE streaming (website widget)
- `POST /api/chat` — Non-streaming (channels)
- `PUT /api/ai-settings/:clientId` — AI config (prompt, model, temperature, actions)

### Builder Agent

- `POST /api/builder/chat` — Builder conversation (function calling)
- `POST /api/builder/build` — Build widget

### Knowledge Base

- `GET/POST /api/knowledge` — CRUD knowledge chunks
- `POST /api/knowledge/upload` — File upload (PDF/DOCX)
- `POST /api/knowledge/deep-crawl` — Website crawl

### Integrations

- `GET /api/integrations` — Available plugins
- `POST /api/integrations/connect` — Connect (encrypt credentials)
- `POST /api/integrations/execute` — Execute action
- `POST /api/integrations/widget-attach` — Bind to widget

### Payments

- `POST /api/stripe/checkout` — Create checkout session
- `GET /api/stripe/portal` — Billing portal
- `POST /api/stripe/webhook` — Stripe events

### Admin

- `GET /api/admin/users` — User management
- `GET /api/admin/clients` — Client management
- `GET /api/admin/analytics` — Platform analytics
- `POST /api/admin/users/:id/impersonate` — Support login

Полный список: 120+ endpoints в `src/app/api/`.

---

## Env Variables

```env
# Core
MONGODB_URI=mongodb://...
GEMINI_API_KEY=...
ADMIN_SECRET_TOKEN=...
NEXT_PUBLIC_BASE_URL=https://winbixai.com

# Auth
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NOWPAYMENTS_API_KEY=...

# Channels
TELEGRAM_BOT_TOKEN=...
TELEGRAM_REPORT_CHAT_ID=123456
WHAPI_API_KEY=...
INSTAGRAM_ACCESS_TOKEN=...

# Integrations
INTEGRATION_ENCRYPTION_KEY=...   # AES-256 for API key storage
BRAVE_SEARCH_API_KEY=...         # For web_search tool

# Notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=...
SMTP_PASS=...

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_PATH=./service_account.json
```

---

## Quick Start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env.local   # Fill in values

# 3. Run
npm run dev                   # http://localhost:3000

# 4. Access
# Dashboard: http://localhost:3000/dashboard
# Admin:     http://localhost:3000/admin
# Builder:   http://localhost:3000/dashboard/builder
```

### Build a widget manually

```bash
# Generate source files from theme.json
node .claude/widget-builder/scripts/generate-single-theme.js <clientId>

# Build widget
node .claude/widget-builder/scripts/build.js <clientId>

# Output: .claude/widget-builder/dist/script.js
# Deploy: copy to quickwidgets/<clientId>/script.js
```

---

## Что планируется (Roadmap)

| #   | Фича                          | Описание                                                           | Статус        |
| --- | ----------------------------- | ------------------------------------------------------------------ | ------------- |
| 1   | **AI Actions Testing**        | Протестировать agentic router с реальным Gemini API                | Следующий шаг |
| 2   | **Plugin Implementations**    | Реализовать Google Calendar, Calendly, Stripe plugins (HTTP calls) | Planned       |
| 3   | **Real-Time Voice Agent**     | WebRTC голосовой разговор с AI в виджете                           | Concept       |
| 4   | **Multi-Agent Orchestration** | Sales Agent, Support Agent, Onboarding Agent — автопереключение    | Concept       |
| 5   | **Workflow Builder**          | Визуальный drag-and-drop конструктор автоматизаций                 | Concept       |
| 6   | **Auto-Evolving Knowledge**   | Периодический re-crawl сайта + автообновление knowledge base       | Concept       |
| 7   | **Conversation Intelligence** | NLP-анализ: buying signals, churn risk, competitor mentions        | Concept       |
| 8   | **Unified Omnichannel Inbox** | Единый inbox для всех каналов с AI-suggested replies               | Concept       |
| 9   | **Agent Marketplace**         | Готовые отраслевые агенты (dental, restaurant, beauty)             | Concept       |
| 10  | **White-Label Reseller**      | Агентства продают под своим брендом                                | Concept       |

---

## License

Proprietary © 2026 WinBix AI
