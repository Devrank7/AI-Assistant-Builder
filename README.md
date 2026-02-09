# AI Widget Platform

SaaS-платформа для создания AI чат-виджетов с RAG, мультитенантностью, омниканальными интеграциями и AI-агентными скиллами для автоматизации.

**Stack**: Next.js 14, TypeScript, MongoDB, Preact (виджет), Vite, Tailwind CSS v3, Google Gemini API

---

## Архитектура

```
Клиентские сайты (embed <script>)
        │
        ▼
┌──────────────────────────────────────────────────┐
│              AI Widget Platform                   │
│                                                   │
│  Pages:                                           │
│  /admin          — Админ-панель (dashboard)       │
│  /admin/client/X — Детали клиента (табы)          │
│  /client/X       — Клиентский кабинет             │
│  /cabinet        — Биллинг, настройки             │
│  /demo/template  — Превью шаблонов                │
│                                                   │
│  Widget (Preact, Shadow DOM):                     │
│  widgets/X/script.js      — полные виджеты        │
│  quickwidgets/X/script.js — демо-виджеты          │
│                                                   │
│  AI Agent Skills (.agent/skills/):                │
│  6 скиллов для автоматизации (см. ниже)           │
│                                                   │
│  External:                                        │
│  Gemini AI · Cryptomus · SMTP · Telegram Bot      │
│  Google Sheets · Instagram · WhatsApp · ManyChat  │
└──────────────────────────────────────────────────┘
```

---

## Структура проекта

```
AIWidget/
├── .agent/
│   ├── skills/                          # AI-агентные скиллы (инструкции)
│   │   ├── create-widget/SKILL.md       # Создание полного виджета (discovery → build)
│   │   ├── create-quick-widget/SKILL.md # Быстрое создание демо-виджета
│   │   ├── mass-quick-widgets/SKILL.md  # Массовое создание из Google Sheets
│   │   ├── create-telegram-bot-assistant/SKILL.md
│   │   ├── create-whatsapp-assistant/SKILL.md
│   │   └── create-instagram-assistant/SKILL.md
│   │
│   └── widget-builder/                  # Сборщик виджетов (Preact + Vite)
│       ├── src/
│       │   ├── main.jsx                 # Entry point (Custom Element, Shadow DOM)
│       │   ├── index.css                # Tailwind CSS (processed by PostCSS)
│       │   ├── components/
│       │   │   ├── Widget.jsx           # Главный компонент
│       │   │   ├── ChatMessage.jsx      # Рендер сообщений (markdown, code blocks)
│       │   │   ├── QuickReplies.jsx     # Кнопки быстрых ответов
│       │   │   └── MessageFeedback.jsx  # Лайк/дизлайк
│       │   └── hooks/
│       │       └── useChat.js           # API логика, стриминг, localStorage
│       ├── clients/<clientId>/          # Кастомный код клиента (переопределяет src/)
│       ├── scripts/build.js             # Сборка: node scripts/build.js <client_id>
│       ├── vite.config.js               # IIFE bundle, CSS injection в Shadow DOM
│       ├── postcss.config.cjs
│       └── tailwind.config.js
│
├── widgets/<clientId>/                  # Полные виджеты (embed-скрипты)
│   ├── script.js
│   └── info.json
│
├── quickwidgets/<clientId>/             # Демо-виджеты (без биллинга)
│   ├── script.js
│   └── info.json                        # clientType: "quick"
│
├── src/
│   ├── app/                             # Next.js App Router
│   │   ├── admin/
│   │   │   ├── page.tsx                 # Dashboard: список клиентов + quick widgets
│   │   │   └── client/[id]/page.tsx     # Детали клиента (табы)
│   │   ├── client/[id]/page.tsx         # Клиентский кабинет
│   │   ├── cabinet/
│   │   │   ├── page.tsx                 # Кабинет клиента
│   │   │   └── billing/page.tsx         # Биллинг, тарифы
│   │   ├── demo/[template]/page.tsx     # Превью шаблонов
│   │   │
│   │   └── api/                         # API Routes (см. ниже)
│   │
│   ├── components/
│   │   ├── ClientCard.tsx               # Карточка клиента (regular + quick)
│   │   ├── ClientList.tsx               # Список клиентов (split view)
│   │   ├── admin/tabs/                  # Табы админ-панели
│   │   │   ├── AISettingsTab.tsx
│   │   │   ├── AnalyticsTab.tsx         # Recharts графики
│   │   │   ├── BillingTab.tsx
│   │   │   ├── ChannelDetailTab.tsx     # Instagram/WhatsApp/Telegram
│   │   │   ├── ChatHistoryTab.tsx
│   │   │   ├── ClientInfoTab.tsx
│   │   │   ├── DemoTab.tsx
│   │   │   ├── FilesTab.tsx
│   │   │   ├── KnowledgeTab.tsx
│   │   │   ├── ProactiveTab.tsx
│   │   │   ├── TrainingTab.tsx
│   │   │   └── UsageTab.tsx
│   │   ├── templates/                   # Шаблоны демо-страниц
│   │   │   ├── DentalTemplate.tsx
│   │   │   ├── ConstructionTemplate.tsx
│   │   │   ├── HotelTemplate.tsx
│   │   │   └── ClientWebsiteTemplate.tsx
│   │   └── ui/                          # UI kit (Toast, Pagination, etc.)
│   │
│   ├── lib/                             # Бизнес-логика
│   │   ├── gemini.ts                    # AI: RAG поиск, стриминг, embeddings
│   │   ├── analytics.ts                # Агрегация аналитики
│   │   ├── mongodb.ts                   # Подключение к MongoDB
│   │   ├── widgetScanner.ts             # Сканирование widgets/ и quickwidgets/
│   │   ├── googleSheets.ts              # Google Sheets + Drive API (JWT auth)
│   │   ├── notifications.ts             # Email + Telegram уведомления
│   │   ├── PaymentService.ts            # Единый сервис платежей
│   │   ├── documentParser.ts            # Парсинг PDF/DOCX/TXT
│   │   ├── channelRouter.ts             # Роутинг сообщений по каналам
│   │   ├── telegramBot.ts               # Telegram Bot API
│   │   ├── whatsappService.ts           # WhatsApp (WHAPI)
│   │   ├── instagramService.ts          # Instagram DM
│   │   ├── costGuard.ts                 # Контроль расходов AI
│   │   ├── handoff.ts                   # Передача оператору
│   │   ├── rateLimit.ts                 # Rate limiting
│   │   ├── richMessages.ts              # Markdown, code blocks
│   │   ├── invoiceGenerator.ts          # PDF-инвойсы
│   │   ├── promptTemplates.ts           # Готовые промпты (dental, hotel, etc.)
│   │   ├── paymentProviders/
│   │   │   ├── types.ts                 # PaymentProvider interface
│   │   │   └── cryptomus.ts             # Cryptomus (BTC, ETH, USDT)
│   │   └── ...                          # auth, validation, utils, etc.
│   │
│   └── models/                          # Mongoose модели
│       ├── Client.ts                    # clientType: 'full' | 'quick'
│       ├── AISettings.ts
│       ├── KnowledgeChunk.ts            # text + embedding[768]
│       ├── ChatLog.ts
│       ├── ChannelConfig.ts             # Каналы (telegram, whatsapp, instagram)
│       ├── Feedback.ts
│       ├── ProactiveTrigger.ts
│       ├── Invoice.ts
│       ├── Handoff.ts
│       ├── Webhook.ts
│       ├── AuditLog.ts
│       ├── Correction.ts
│       └── Notification.ts
│
├── scripts/
│   ├── checkPayments.ts                 # CRON: проверка оплат
│   └── setupTelegramBot.ts              # Настройка Telegram webhook
│
└── service_account.json                 # Google API credentials
```

---

## API Routes

### Auth

| Method | Endpoint           | Description   |
| ------ | ------------------ | ------------- |
| POST   | `/api/auth/admin`  | Логин админа  |
| POST   | `/api/auth/client` | Логин клиента |

### Clients

| Method  | Endpoint                     | Description                                   |
| ------- | ---------------------------- | --------------------------------------------- |
| GET     | `/api/clients`               | Список всех клиентов (widgets + quickwidgets) |
| GET/PUT | `/api/clients/[id]`          | Чтение/обновление клиента                     |
| DELETE  | `/api/clients/[id]/delete`   | Удаление quick widget                         |
| GET     | `/api/clients/[id]/channels` | Обнаруженные каналы клиента                   |
| GET     | `/api/clients/me`            | Текущий клиент (по токену)                    |

### AI & Chat

| Method   | Endpoint                      | Description                        |
| -------- | ----------------------------- | ---------------------------------- |
| POST     | `/api/chat`                   | Основной endpoint (RAG + Gemini)   |
| POST     | `/api/chat/stream`            | SSE стриминг ответов               |
| GET/PUT  | `/api/ai-settings/[clientId]` | Настройки AI (промпт, температура) |
| GET/POST | `/api/templates`              | Шаблоны промптов                   |

### Knowledge Base

| Method   | Endpoint                | Description                        |
| -------- | ----------------------- | ---------------------------------- |
| GET/POST | `/api/knowledge`        | CRUD chunks                        |
| POST     | `/api/knowledge/upload` | Загрузка документов (PDF/DOCX/TXT) |

### Chat History & Feedback

| Method     | Endpoint           | Description          |
| ---------- | ------------------ | -------------------- |
| GET/DELETE | `/api/chat-logs`   | История чатов        |
| POST       | `/api/feedback`    | Лайк/дизлайк ответов |
| POST       | `/api/corrections` | Коррекция ответов AI |

### Payments & Credits

| Method | Endpoint                          | Description           |
| ------ | --------------------------------- | --------------------- |
| POST   | `/api/payments/setup`             | Создание подписки     |
| POST   | `/api/payments/cancel`            | Отмена подписки       |
| GET    | `/api/payments/tiers`             | Тарифы (1/3/6/12 мес) |
| POST   | `/api/payments/webhook/cryptomus` | Webhook Cryptomus     |
| GET    | `/api/credits/status`             | Статус AI-кредитов    |
| POST   | `/api/credits/topup`              | Докупить кредиты      |

### Integrations

| Method | Endpoint                          | Description                             |
| ------ | --------------------------------- | --------------------------------------- |
| POST   | `/api/integrations/sheets/export` | Экспорт в Google Sheets                 |
| GET    | `/api/integrations/sheets/read`   | Чтение данных из таблицы                |
| POST   | `/api/integrations/sheets/update` | Обновление ячеек таблицы                |
| GET    | `/api/integrations/sheets/search` | Поиск таблиц по имени (Drive API)       |
| POST   | `/api/telegram/notify`            | Отправка отчёта в Telegram (multi-chat) |
| POST   | `/api/telegram/webhook`           | Webhook Telegram бота                   |

### Channels (Webhooks)

| Method   | Endpoint                  | Description                                 |
| -------- | ------------------------- | ------------------------------------------- |
| GET/POST | `/api/webhooks/instagram` | Instagram webhook (verification + messages) |
| POST     | `/api/webhooks/whatsapp`  | WhatsApp webhook                            |
| POST     | `/api/webhooks/whapi`     | WHAPI webhook                               |
| POST     | `/api/webhooks/manychat`  | ManyChat webhook                            |

### Other

| Method | Endpoint                  | Description          |
| ------ | ------------------------- | -------------------- |
| GET    | `/api/analytics`          | Статистика чатов     |
| GET    | `/api/health`             | Healthcheck          |
| POST   | `/api/handoff`            | Передача оператору   |
| GET    | `/api/proactive-triggers` | Проактивные триггеры |
| GET    | `/api/invoices`           | Инвойсы              |
| GET    | `/api/audit-log`          | Аудит-лог            |
| POST   | `/api/cron/trial-check`   | Проверка триалов     |

---

## Виджет

Виджеты — Preact-приложения, работающие в Shadow DOM. CSS обрабатывается Tailwind v3 + PostCSS и инжектируется через `window.__WIDGET_CSS__`.

**Два типа:**

- **Full** (`widgets/`) — для платящих клиентов, с биллингом и клиентским кабинетом
- **Quick** (`quickwidgets/`) — демо-виджеты для проспектинга, без биллинга

**Embed:**

```html
<script src="https://domain.com/widgets/client-id/script.js"></script>
<!-- или для quick: -->
<script src="https://domain.com/quickwidgets/client-id/script.js"></script>
```

**Build:**

```bash
node .agent/widget-builder/scripts/build.js <client_id>
# Output: .agent/widget-builder/dist/script.js
# Deploy: copy to widgets/<client_id>/ or quickwidgets/<client_id>/
```

---

## AI Agent Skills

Скиллы — SKILL.md файлы с инструкциями для AI-агента. Расположены в `.agent/skills/`.

### create-widget

Полное создание виджета: 20 вопросов discovery → генерация кода → сборка → деплой в `widgets/`. Создаёт кастомные компоненты в `clients/<clientId>/src/`.

### create-quick-widget

Быстрое создание демо-виджета: только URL сайта → автоанализ (цвета, шрифты, контент) → генерация → сборка → деплой в `quickwidgets/`. Без вопросов к клиенту.

### mass-quick-widgets

Массовое создание демо-виджетов из Google Sheets:

1. Ищет таблицу по дате `DD.MM.YYYY Проверенные лиды` (или `Квалифицированные лиды`)
2. Читает leads (email, website, username)
3. Для каждого lead → create-quick-widget процесс
4. Обновляет `hasWidget=TRUE` в таблице
5. Отправляет Telegram-отчёт (поддержка multi-chat)

### create-telegram-bot-assistant

Создание кастомного Telegram-бота: генерирует `script.js` с интеграциями (CRM, календарь, оплата) → деплой в `widgets/<clientId>/channels/telegram-bot/`.

### create-whatsapp-assistant

Создание WhatsApp-ассистента: аналогично Telegram, но для WhatsApp (WHAPI) → деплой в `widgets/<clientId>/channels/whatsapp/`.

### create-instagram-assistant

Создание Instagram DM ассистента: генерирует обработчик сообщений → деплой в `widgets/<clientId>/channels/instagram/`.

---

## Env Variables

```env
MONGODB_URI=mongodb://...
GEMINI_API_KEY=...
ADMIN_SECRET_TOKEN=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Payments
CRYPTOMUS_MERCHANT_ID=...
CRYPTOMUS_API_KEY=...

# Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM=...
TELEGRAM_BOT_TOKEN=...
TELEGRAM_REPORT_CHAT_ID=123456,789012  # comma-separated for multi-chat

# Google Sheets (service account)
GOOGLE_SERVICE_ACCOUNT_PATH=./service_account.json
```

---

## Quick Start

```bash
npm install
cp .env.example .env.local  # fill in values
npm run dev                  # http://localhost:3000
```

Admin panel: `http://localhost:3000/admin`

---

## License

MIT © 2026 ChatBot Fusion
