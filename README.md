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

| Слой           | Технологии                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| **Frontend**   | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4                   |
| **Widget**     | Preact + Vite + Tailwind CSS v3, Shadow DOM изоляция                             |
| **Database**   | MongoDB (Mongoose 9), vector embeddings для RAG                                  |
| **AI**         | Google Gemini API (`@google/genai`), function calling, streaming, model fallback |
| **Payments**   | Stripe, WayForPay, NowPayments, Cryptomus                                        |
| **Channels**   | Web chat, Telegram Bot API, WhatsApp (WHAPI), Instagram (Meta Graph API)         |
| **Deployment** | Docker, Nginx, PM2, production на winbixai.com                                   |

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
│  │                    API Layer (77 route groups)               │ │
│  │  /api/chat/stream  /api/builder/chat  /api/integrations/*   │ │
│  └──────┬─────────────────┬──────────────────────┬─────────────┘ │
│         │                 │                      │               │
│  ┌──────▼───────┐  ┌─────▼──────────┐  ┌───────▼────────────┐  │
│  │ Channel      │  │ Agentic Router │  │ Plugin Registry    │  │
│  │ Router       │  │ (function      │  │ (10+ integrations, │  │
│  │ (RAG + AI)   │  │  calling loop) │  │  all implemented)  │  │
│  └──────┬───────┘  └────────────────┘  └────────────────────┘  │
│         │                                                       │
│  ┌──────▼───────────────────────────────────────────────────┐   │
│  │              MongoDB (64 models)                          │   │
│  │  Users, Clients, KnowledgeChunks, ChatLogs, Integrations │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Gemini Model Fallback Chain                   │   │
│  │  gemini-3.1-pro → gemini-3-flash → gemini-2.5-pro        │   │
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

### Gemini Model Fallback

Все вызовы к Gemini API используют автоматический fallback (`geminiHelpers.ts`):

1. **Primary**: `gemini-3.1-pro-preview`
2. **Fallback 1**: `gemini-3-flash-preview`
3. **Fallback 2**: `gemini-2.5-pro`

При исчерпании квоты (429), ошибке 404 или транзиентных сбоях (503) — автоматическое переключение на следующую модель с retry и exponential backoff.

---

## Возможности платформы

### Core

| Фича                     | Описание                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------ |
| **AI Builder Agent**     | Пользователь общается в чате → агент вызывает tools → виджет создаётся автоматически |
| **30-секундный деплой**  | URL → анализ сайта → генерация дизайна → RAG knowledge → деплой                      |
| **3 типа виджетов**      | AI Chat (RAG чатбот), Smart FAQ (аккордеон), Lead Form (мульти-шаговая форма)        |
| **RAG Knowledge Base**   | Deep crawl (30+ страниц), embeddings, semantic search, corrections                   |
| **Streaming Responses**  | SSE streaming с rich blocks (карусели, формы, кнопки)                                |
| **4 языка**              | EN, UK, RU, AR — автоматическое определение                                          |
| **Voice Input**          | Web Speech API (speech-to-text)                                                      |
| **Text-to-Speech**       | Google Cloud TTS + browser fallback                                                  |
| **Proactive Nudges**     | Всплывающее сообщение через N секунд                                                 |
| **Omnichannel**          | Web, Telegram, WhatsApp, Instagram — один AI на всех каналах                         |
| **Human Handoff**        | Автоопределение "хочу оператора" → пауза бота → передача человеку                    |
| **Widget Versioning**    | Rollback к предыдущим версиям                                                        |
| **Proactive Consultant** | Builder-агент активно предлагает улучшения после деплоя                              |

### AI Actions (Autonomous Agent)

Виджет не только отвечает на вопросы, но и **выполняет действия** в реальном времени:

```
Посетитель: "Хочу записаться на массаж на пятницу"
AI: [вызывает check_availability] → "Есть 14:00 и 16:30. Какое время?"
Посетитель: "14:00"
AI: [вызывает book_appointment] → "Готово! Запись на пятницу 14:00. ✅"
```

| Компонент                | Описание                                                  |
| ------------------------ | --------------------------------------------------------- |
| **Agentic Router**       | Gemini function calling loop (max 15 итераций)            |
| **Built-in Tools**       | `collect_lead`, `search_knowledge`, `send_notification`   |
| **Integration Tools**    | Динамическая загрузка tools из WidgetIntegration bindings |
| **Action UI Indicators** | Спиннер/галочка/крестик в чате при выполнении действий    |
| **Rate Limiting**        | Max N actions per session (настраивается)                 |

### Enterprise Features

| Фича                       | Описание                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **A/B Testing**            | Несколько вариантов виджета, трекинг конверсий, статистика                                                       |
| **Analytics Dashboard**    | Чаты/день, top вопросы, каналы, satisfaction, response time, AI quality metrics                                  |
| **Contacts CRM**           | Контакты с lead scoring, теги, фильтры, multi-channel tracking, timeline                                         |
| **Unified Inbox**          | Единый inbox для всех каналов, conversation threads, real-time updates, AI-suggested replies                     |
| **Flow Builder**           | Визуальный flow editor, trigger-action автоматизации, 10+ типов trigger/action                                   |
| **White-Label**            | Custom domain, скрытый брендинг, custom logo/colors, только для Enterprise плана                                 |
| **Integration Hub**        | Webhook management (12 event types, HMAC-SHA256, retry с backoff), widget-integration bindings                   |
| **Developer API Platform** | REST API v1/v2, API key management (SHA-256 hashed), per-key rate limits, интерактивная документация             |
| **Team Management**        | Организации, роли (owner/admin/editor/viewer), инвайты, activity log                                             |
| **Audit Log**              | 19+ типов действий, 90-дневное хранение, org-scoped                                                              |
| **Billing**                | Stripe + альтернативные провайдеры, trial, plans                                                                 |
| **Webhooks**               | 12 event types, HMAC-SHA256 подпись, retry с backoff, auto-disable после 10 ошибок                               |
| **Onboarding & Growth**    | Referral program, email sequences, smart notifications, empty states, onboarding wizard                          |
| **Widget Marketplace**     | 10 official templates по нишам, browse/search/filter, one-click install, community publishing, ratings & reviews |
| **Premium Marketplace**    | Платные шаблоны, revenue sharing с авторами                                                                      |

### Advanced AI Features

| Фича                          | Описание                                             |
| ----------------------------- | ---------------------------------------------------- |
| **Agent Personas**            | Настраиваемые личности AI (тон, стиль, expertise)    |
| **Agent Routing**             | Правила автоматического переключения между агентами  |
| **Conversation Intelligence** | NLP-анализ: buying signals, churn risk, sentiment    |
| **Knowledge Evolution**       | Отслеживание изменений в базе знаний, автообновление |
| **Co-Browsing**               | Совместный просмотр страницы с клиентом              |
| **Video Avatars**             | Видео-аватары для AI-ассистентов                     |
| **Engagement Predictions**    | Предсказание вовлечённости и конверсии               |
| **Outbound Campaigns**        | Массовые рассылки через подключённые каналы          |

### Integrations (все полностью реализованы)

| Plugin              | Actions                                          |
| ------------------- | ------------------------------------------------ |
| **HubSpot**         | createContact, createDeal, searchContacts        |
| **Pipedrive**       | createPerson, createDeal, searchPersons          |
| **Salesforce**      | createContact, createOpportunity, searchContacts |
| **Google Calendar** | listEvents, getCalendars, createEvent            |
| **Calendly**        | getEventTypes, createBooking                     |
| **Stripe**          | createPaymentLink, checkPayment                  |
| **Telegram**        | sendMessage, sendPhoto                           |
| **WhatsApp**        | sendMessage, sendTemplate                        |
| **Google Sheets**   | appendRow, readRange, appendRows                 |
| **Email (SMTP)**    | sendEmail                                        |

Все плагины полностью реализованы с HTTP-вызовами к API, аутентификацией и обработкой ошибок.

---

## Тарифные планы

|                  | Free    | Starter        | Pro          | Enterprise        |
| ---------------- | ------- | -------------- | ------------ | ----------------- |
| **Цена**         | $0      | $29/мес        | $79/мес      | $299/мес          |
| **Виджеты**      | 1       | 3              | Unlimited    | Unlimited         |
| **Сообщения**    | 100/мес | 1,000/мес      | Unlimited    | Unlimited         |
| **Каналы**       | Web     | Web + Telegram | Все          | Все + Custom      |
| **AI Builder**   | ---     | ---            | Yes          | Yes               |
| **Integrations** | ---     | 3 preset       | Все          | Все + Agent-built |
| **A/B Tests**    | ---     | ---            | 2 concurrent | Unlimited         |
| **Team**         | 1       | 2              | 5            | Unlimited         |
| **White-label**  | ---     | ---            | ---          | Yes               |
| **SLA**          | ---     | ---            | ---          | 99.9%             |

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
│       │   │   ├── WidgetShell.jsx      # Compositor (хуки, стейт, слоты)
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
│   ├── app/                             # Next.js 16 App Router
│   │   ├── page.tsx                     # Landing page (animated, glassmorphism)
│   │   ├── pricing/                     # Pricing page (4-tier with Stripe)
│   │   ├── features/                    # Features showcase page
│   │   ├── customers/                   # Customer testimonials page
│   │   ├── enterprise/                  # Enterprise landing page
│   │   ├── agency/                      # Agency program page
│   │   ├── changelog/                   # Release timeline page
│   │   ├── privacy/                     # Privacy Policy
│   │   ├── terms/                       # Terms of Use
│   │   ├── dashboard/                   # User dashboard
│   │   │   ├── builder/                 # AI Builder (chat UI)
│   │   │   ├── widgets/                 # Widget management
│   │   │   ├── chats/                   # Chat history viewer
│   │   │   ├── inbox/                   # Unified inbox (all channels)
│   │   │   ├── contacts/                # Contact CRM with lead scoring
│   │   │   ├── flows/                   # Visual flow builder
│   │   │   ├── marketplace/             # Widget template marketplace
│   │   │   ├── analytics/               # Analytics + AI quality metrics
│   │   │   ├── ab-tests/                # A/B testing with statistics
│   │   │   ├── integrations/            # Integration hub + webhooks
│   │   │   ├── team/                    # Team management + activity log
│   │   │   ├── billing/                 # Subscription & payments
│   │   │   ├── referrals/               # Referral program
│   │   │   ├── onboarding/              # Onboarding wizard
│   │   │   ├── developer/docs/          # Interactive API documentation
│   │   │   └── settings/                # Settings, API keys, white-label
│   │   ├── admin/                       # Admin panel
│   │   │   ├── users/                   # User management
│   │   │   ├── clients/                 # Client management (tabs)
│   │   │   ├── subscriptions/           # Subscription tracking
│   │   │   └── analytics/               # Platform analytics
│   │   └── api/                         # 77 route groups, 200+ endpoints
│   │       ├── auth/                    # JWT + Google OAuth
│   │       ├── chat/stream/             # SSE streaming endpoint
│   │       ├── builder/chat/            # Builder agent endpoint
│   │       ├── knowledge/               # RAG CRUD + deep crawl
│   │       ├── integrations/            # Plugin marketplace
│   │       ├── marketplace/             # Widget template marketplace API
│   │       ├── premium-marketplace/     # Premium templates
│   │       ├── webhooks/                # Telegram, WhatsApp, Instagram, Stripe
│   │       ├── v1/                      # Developer REST API v1
│   │       ├── v2/                      # Developer REST API v2
│   │       ├── developer/               # API key management
│   │       ├── stripe/                  # Payments
│   │       ├── ab-tests/                # A/B testing
│   │       ├── analytics/               # Analytics API
│   │       ├── intelligence/            # Conversation intelligence
│   │       ├── agent-personas/          # Agent personas
│   │       ├── agent-routing/           # Agent routing rules
│   │       ├── cobrowsing/              # Co-browsing sessions
│   │       ├── video-avatars/           # Video avatar API
│   │       ├── voice/                   # Voice chat / TTS
│   │       ├── knowledge-evolution/     # Knowledge tracking
│   │       ├── predictions/             # Engagement predictions
│   │       ├── campaigns/               # Outbound campaigns
│   │       ├── flows/                   # Flow builder API
│   │       ├── contacts/                # CRM contacts
│   │       ├── inbox/                   # Unified inbox
│   │       ├── compliance/              # Compliance config
│   │       ├── reseller/                # Reseller accounts
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
│   │   │   ├── geminiHelpers.ts         # Model fallback (3.1-pro → flash → 2.5-pro)
│   │   │   ├── anthropicAgent.ts        # Claude fallback agent
│   │   │   ├── toolRegistry.ts          # Tool registration system
│   │   │   └── tools/
│   │   │       ├── coreTools.ts         # analyze_site, generate_design, build_deploy, etc.
│   │   │       ├── integrationTools.ts  # web_search, write_integration, connect_integration
│   │   │       ├── universalApiTool.ts  # Connect any API from docs
│   │   │       └── proactiveTools.ts    # analyze_opportunities
│   │   └── integrations/
│   │       ├── core/
│   │       │   ├── PluginRegistry.ts    # Plugin discovery + execution
│   │       │   ├── types.ts             # Plugin interfaces
│   │       │   └── HealthMonitor.ts     # Connection health checks
│   │       └── plugins/                 # 10+ fully implemented plugins
│   │
│   ├── models/                          # 64 MongoDB schemas
│   │   ├── User.ts                      # Auth, plans, organizations
│   │   ├── Client.ts                    # Widget clients, billing, costs
│   │   ├── AISettings.ts                # Per-client AI config + actions
│   │   ├── KnowledgeChunk.ts            # RAG text + vector embeddings
│   │   ├── ChatLog.ts                   # Conversation history (365d TTL)
│   │   ├── Contact.ts                   # CRM contacts with lead scoring
│   │   ├── Integration.ts               # Connected service credentials
│   │   ├── WidgetIntegration.ts         # Widget ↔ Integration bindings
│   │   ├── ABTest.ts                    # A/B test variants & results
│   │   ├── AgentPersona.ts             # AI personality configurations
│   │   ├── AgentRoutingRule.ts          # Agent switching rules
│   │   ├── ConversationInsight.ts       # NLP conversation analysis
│   │   ├── KnowledgeEvolution.ts        # Knowledge change tracking
│   │   ├── CoBrowsingSession.ts         # Co-browsing session state
│   │   ├── VideoAvatar.ts               # Video avatar configurations
│   │   ├── EngagementPrediction.ts      # Predictive engagement models
│   │   ├── Flow.ts                      # Flow builder automations
│   │   ├── Webhook.ts                   # Webhooks (HMAC, retry, 12 events)
│   │   ├── ApiKey.ts                    # Developer API keys (SHA-256)
│   │   ├── AuditLog.ts                  # Audit log (org-scoped)
│   │   ├── Organization.ts              # Orgs + white-label settings
│   │   ├── MarketplaceTemplate.ts       # Widget marketplace templates
│   │   ├── MarketplaceReview.ts         # Template ratings & reviews
│   │   ├── PremiumMarketplaceTemplate.ts # Premium templates
│   │   ├── Referral.ts                  # Referral program tracking
│   │   ├── OutboundCampaign.ts          # Campaign management
│   │   └── ...                          # 38+ additional models
│   │
│   └── components/                      # React UI (120+ components)
│       ├── builder/                     # AI Builder chat, preview, pipeline
│       ├── dashboard/                   # Command palette, navigation
│       ├── marketing/                   # MarketingNav, MarketingFooter
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
   (uses generateWithFallback — auto-switches model on quota/error)
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

### Integrations & Webhooks

- `GET /api/integrations` — Available plugins
- `POST /api/integrations/connect` — Connect (encrypt credentials)
- `POST /api/integrations/execute` — Execute action
- `GET/POST /api/integrations/widget-bindings` — Widget ↔ integration bindings
- `GET/POST /api/webhooks/manage` — Webhook CRUD (12 event types)
- `PATCH/DELETE /api/webhooks/manage/:id` — Update/delete webhook

### Developer API (v1 / v2)

- `GET/POST /api/developer/keys` — API key management
- `PATCH/DELETE /api/developer/keys/:id` — Update/revoke key
- `GET /api/v1/widgets` — List widgets (API key auth)
- `GET/PATCH/DELETE /api/v1/widgets/:id` — Widget CRUD
- `GET /api/v1/analytics` — Analytics data
- `GET /api/v1/chatlogs` — Chat logs with pagination
- `GET/POST /api/v1/knowledge` — Knowledge chunks CRUD

### Marketplace

- `GET /api/marketplace` — Browse/search/filter templates
- `POST /api/marketplace` — Publish community template
- `GET /api/marketplace/:id` — Template details
- `POST /api/marketplace/:id/install` — One-click fork to account
- `GET/POST /api/marketplace/:id/review` — Ratings & reviews

### AI Features

- `GET/POST /api/agent-personas` — Agent personality management
- `GET/POST /api/agent-routing` — Agent routing rules
- `GET /api/intelligence` — Conversation intelligence
- `GET /api/knowledge-evolution` — Knowledge change tracking
- `GET /api/predictions` — Engagement predictions
- `POST /api/cobrowsing` — Co-browsing sessions
- `GET/POST /api/video-avatars` — Video avatar management
- `POST /api/campaigns` — Outbound campaign management

### Payments

- `POST /api/stripe/checkout` — Create checkout session
- `GET /api/stripe/portal` — Billing portal
- `POST /api/stripe/webhook` — Stripe events

### Admin

- `GET /api/admin/users` — User management
- `GET /api/admin/clients` — Client management
- `GET /api/admin/analytics` — Platform analytics
- `POST /api/admin/users/:id/impersonate` — Support login

Полный список: 77 route groups, 200+ endpoints в `src/app/api/`.

---

## Env Variables

```env
# Core (обязательные)
MONGODB_URI=mongodb://...
GEMINI_API_KEY=...
ADMIN_SECRET_TOKEN=...
NEXT_PUBLIC_BASE_URL=https://winbixai.com
ENCRYPTION_KEY=...              # 64 hex chars (AES-256-GCM)

# Auth
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...
JWT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Payments
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NOWPAYMENTS_API_KEY=...
WAYFORPAY_MERCHANT_ACCOUNT=...

# Channels
TELEGRAM_BOT_TOKEN=...
TELEGRAM_REPORT_CHAT_ID=123456
WHAPI_API_KEY=...

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

### Docker (рекомендуется для продакшена)

```bash
# Настройте .env и .env.local (см. deploy.md)
docker compose up -d --build

# Проверка
curl http://localhost:3000/api/health
```

Подробная инструкция по деплою: [deploy.md](deploy.md)

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

## Roadmap

| Фича                          | Описание                                                         | Статус  |
| ----------------------------- | ---------------------------------------------------------------- | ------- |
| **Real-Time Voice Agent**     | WebRTC голосовой разговор с AI в виджете                         | Concept |
| **Multi-Agent Orchestration** | Sales Agent, Support Agent, Onboarding Agent — автопереключение  | Concept |
| **Auto-Evolving Knowledge**   | Периодический re-crawl сайта + автообновление knowledge base     | Concept |
| **Widget Builder v2**         | Component-based architecture, CSS variables, deterministic edits | Planned |
| **Public API v3**             | GraphQL API, webhook subscriptions, SDK packages                 | Concept |

---

## License

Proprietary (c) 2025-2026 WinBix AI
