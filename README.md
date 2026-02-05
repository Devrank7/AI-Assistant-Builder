# 🤖 AI Widget — RAG-Powered Chat System

> **Полнофункциональная SaaS-платформа для создания AI-виджетов чат-ботов с RAG (Retrieval-Augmented Generation), мультитенантной архитектурой и системой подписок.**

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![MongoDB](https://img.shields.io/badge/MongoDB-6-green?logo=mongodb)
![Gemini](https://img.shields.io/badge/Gemini-AI-purple)

---

## 📋 Содержание

- [Обзор проекта](#-обзор-проекта)
- [Архитектура](#-архитектура)
- [Быстрый старт](#-быстрый-старт)
- [Конфигурация](#-конфигурация)
- [Структура проекта](#-структура-проекта)
- [API Endpoints](#-api-endpoints)
- [Модели данных](#-модели-данных)
- [Функциональность](#-функциональность)
- [Виджет](#-виджет)
- [AI-Agent Widget Builder](#-ai-agent-widget-builder)
- [Admin Panel](#-admin-panel)
- [Система платежей](#-система-платежей)
- [Аналитика](#-аналитика)
- [Интеграции](#-интеграции)
- [Деплой](#-деплой)

---

## 🌟 Обзор проекта

**AI Widget** — это платформа для создания кастомизируемых AI чат-ботов, которые:

- ✅ Используют **RAG** (база знаний + векторный поиск)
- ✅ Работают на **Google Gemini** (gemini-2.0-flash, text-embedding-004)
- ✅ Поддерживают **мультитенантность** (множество клиентов на одной платформе)
- ✅ Имеют **систему подписок** с крипто-платежами (Cryptomus)
- ✅ Предоставляют **полную аналитику** и экспорт в Google Sheets

### Ключевые возможности

| Функция | Описание |
|---------|----------|
| 🤖 **AI Chat** | Ответы на основе базы знаний клиента |
| 📚 **Knowledge Base** | Векторный поиск по embeddings |
| 📄 **Document Upload** | Загрузка PDF, DOCX, TXT файлов |
| 📊 **Analytics** | Статистика чатов, популярные вопросы |
| 💳 **Payments** | Рекуррентные криптоплатежи (Cryptomus) |
| 📧 **Notifications** | Email + Telegram уведомления |
| 📤 **Google Sheets** | Экспорт данных в таблицы |

---

## 🏗 Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        КЛИЕНТСКИЕ САЙТЫ                         │
│                   (embed: <script src="...">)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI Widget Platform                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │   Widget     │  │  Admin Panel │  │   API Routes         │   │
│  │   (Preact)   │  │   (Next.js)  │  │   (/api/*)           │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │               │
│         └─────────────────┴──────────────────────┘               │
│                           │                                      │
│  ┌────────────────────────┼────────────────────────────────────┐ │
│  │                 Business Logic Layer                        │ │
│  ├─────────────┬─────────────┬─────────────┬──────────────────┤ │
│  │  gemini.ts  │ analytics.ts│PaymentSvc.ts│ notifications.ts │ │
│  └─────────────┴─────────────┴─────────────┴──────────────────┘ │
│                           │                                      │
│  ┌────────────────────────▼────────────────────────────────────┐ │
│  │                    Data Layer (MongoDB)                     │ │
│  ├───────────────┬───────────────┬───────────────┬────────────┤ │
│  │    Client     │  AISettings   │ KnowledgeChunk│   ChatLog  │ │
│  └───────────────┴───────────────┴───────────────┴────────────┘ │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                             │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│  Gemini AI  │  Cryptomus  │    SMTP     │    Telegram Bot       │
│  (Google)   │  (Payments) │   (Email)   │    (Notifications)    │
└─────────────┴─────────────┴─────────────┴───────────────────────┘
```

---

## 🚀 Быстрый старт

### Требования

- Node.js 18+
- MongoDB 6+
- pnpm / npm / yarn

### Установка

```bash
# Клонирование
git clone https://github.com/your-repo/ai-widget.git
cd ai-widget

# Установка зависимостей
npm install

# Создание .env.local
cp .env.example .env.local
# Заполните переменные окружения (см. ниже)

# Запуск в dev-режиме
npm run dev
```

Приложение будет доступно на `http://localhost:3000`

---

## ⚙️ Конфигурация

### Переменные окружения (.env.local)

```env
# ═══════════════════════════════════════════════════════════════
# DATABASE
# ═══════════════════════════════════════════════════════════════
MONGODB_URI=mongodb://mongo:boot@localhost:7878/ai-widget-admin?authSource=admin

# ═══════════════════════════════════════════════════════════════
# AI / GEMINI
# ═══════════════════════════════════════════════════════════════
GEMINI_API_KEY=your_gemini_api_key_here

# ═══════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════
ADMIN_SECRET_TOKEN=your-secure-admin-token

# ═══════════════════════════════════════════════════════════════
# PAYMENTS (Cryptomus)
# ═══════════════════════════════════════════════════════════════
CRYPTOMUS_MERCHANT_ID=your_merchant_id
CRYPTOMUS_API_KEY=your_api_key

# ═══════════════════════════════════════════════════════════════
# EMAIL NOTIFICATIONS (SMTP)
# ═══════════════════════════════════════════════════════════════
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=your_app_password
SMTP_FROM=ChatBot Fusion <your@email.com>

# ═══════════════════════════════════════════════════════════════
# TELEGRAM NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════
TELEGRAM_BOT_TOKEN=your_telegram_bot_token

# ═══════════════════════════════════════════════════════════════
# GOOGLE SHEETS (Optional)
# ═══════════════════════════════════════════════════════════════
GOOGLE_SHEETS_CLIENT_EMAIL=service@project.iam.gserviceaccount.com
GOOGLE_SHEETS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...key...\n-----END PRIVATE KEY-----\n"

# ═══════════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════════
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

---

## 📁 Структура проекта

```
AIWidget/
├── .agent/                          # Skills и workflows для AI агента
│   └── widget-builder/              # Сборщик виджетов
│       └── src/
│           ├── components/          # Preact компоненты виджета
│           ├── hooks/               # useChat hook
│           └── styles/              # CSS стили
│
├── scripts/
│   └── checkPayments.ts             # CRON job для проверки оплат
│
├── src/
│   ├── app/                         # Next.js App Router
│   │   ├── admin/                   # Админ-панель
│   │   │   ├── page.tsx             # Dashboard со списком клиентов
│   │   │   └── client/[id]/page.tsx # Детали клиента (табы)
│   │   │
│   │   └── api/                     # API Routes
│   │       ├── analytics/           # GET - Статистика чатов
│   │       ├── ai-settings/[id]/    # GET/POST - Настройки AI
│   │       ├── auth/                # POST - Авторизация
│   │       ├── chat/                # POST - Главный endpoint чата
│   │       ├── chat-logs/           # GET/DELETE - История чатов
│   │       ├── clients/             # CRUD клиентов
│   │       ├── integrations/
│   │       │   └── sheets/export/   # POST - Экспорт в Google Sheets
│   │       ├── knowledge/           # CRUD базы знаний
│   │       ├── payments/            # Платежи
│   │       │   ├── setup/           # POST - Создание подписки
│   │       │   ├── cancel/          # POST - Отмена
│   │       │   └── webhook/         # Webhooks от провайдеров
│   │       └── templates/           # GET/POST - Шаблоны промптов
│   │
│   ├── components/                  # React компоненты
│   │   └── ClientCard.tsx           # Карточка клиента
│   │
│   ├── lib/                         # Бизнес-логика
│   │   ├── gemini.ts                # AI + RAG логика
│   │   ├── analytics.ts             # Агрегация аналитики
│   │   ├── mongodb.ts               # Подключение к MongoDB
│   │   ├── notifications.ts         # Email + Telegram
│   │   ├── PaymentService.ts        # Единый сервис платежей
│   │   ├── googleSheets.ts          # Google Sheets API
│   │   ├── documentParser.ts        # Парсинг PDF/DOCX
│   │   ├── promptTemplates.ts       # Готовые промпты
│   │   └── paymentProviders/        # Провайдеры платежей
│   │       ├── types.ts             # Интерфейсы
│   │       └── cryptomus.ts         # Cryptomus реализация
│   │
│   └── models/                      # Mongoose модели
│       ├── Client.ts                # Клиент + подписка
│       ├── AISettings.ts            # Настройки AI
│       ├── KnowledgeChunk.ts        # Chunks базы знаний
│       └── ChatLog.ts               # История чатов
│
└── public/
    └── widgets/                     # Скомпилированные виджеты
        └── [clientFolder]/
            ├── script.js            # Embed-скрипт
            └── config.json          # Конфиг виджета
```

---

## 🔌 API Endpoints

### 🔐 Аутентификация

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Вход админа (token → cookie) |
| POST | `/api/auth/logout` | Выход |

### 👥 Клиенты

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/clients` | Список всех клиентов |
| POST | `/api/clients` | Создать клиента |
| GET | `/api/clients/[id]` | Детали клиента |
| PUT | `/api/clients/[id]` | Обновить клиента |
| DELETE | `/api/clients/[id]` | Удалить клиента |

### 🤖 AI & Chat

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Главный endpoint чата |
| GET | `/api/ai-settings/[clientId]` | Получить настройки AI |
| POST | `/api/ai-settings/[clientId]` | Сохранить настройки AI |
| GET | `/api/templates` | Список шаблонов промптов |
| POST | `/api/templates` | Применить шаблон |

### 📚 Knowledge Base

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/knowledge?clientId=X` | Получить chunks |
| POST | `/api/knowledge` | Добавить chunk |
| DELETE | `/api/knowledge/[id]` | Удалить chunk |
| POST | `/api/knowledge/upload` | Загрузить документ |

### 💬 Chat History

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat-logs?clientId=X` | Список чатов |
| GET | `/api/chat-logs/[id]` | Детали чата |
| DELETE | `/api/chat-logs/[id]` | Удалить чат |

### 📊 Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics?clientId=X` | Полная аналитика |
| GET | `/api/analytics?clientId=X&quick=true` | Быстрая статистика |

### 💳 Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments/setup` | Создать подписку |
| GET | `/api/payments/setup?clientId=X` | Статус подписки |
| POST | `/api/payments/cancel` | Отменить подписку |
| POST | `/api/payments/webhook/cryptomus` | Webhook Cryptomus |

### 📤 Integrations

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations/sheets/export` | Статус конфигурации |
| POST | `/api/integrations/sheets/export` | Экспорт в Sheets |

---

## 📊 Модели данных

### Client

```typescript
{
  clientId: string;           // Уникальный ID
  clientToken: string;        // Токен для API
  username: string;
  email: string;
  website: string;
  phone?: string;
  telegram?: string;          // Для уведомлений
  
  // Подписка
  isActive: boolean;
  subscriptionStatus: 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';
  paymentMethod: 'cryptomus' | 'dodo' | 'liqpay' | null;
  nextPaymentDate: Date | null;
  lastPaymentDate: Date | null;
  paymentFailedCount: number;
  gracePeriodEnd: Date | null;
  cryptomusSubscriptionId: string | null;
  
  folderPath: string;         // Путь к файлам виджета
  startDate: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### AISettings

```typescript
{
  clientId: string;
  systemPrompt: string;       // Системный промпт
  greeting: string;           // Приветствие
  temperature: number;        // 0.0 - 1.0
  maxTokens: number;          // Макс. токенов ответа
  language: string;           // 'ru', 'en', 'uk'
}
```

### KnowledgeChunk

```typescript
{
  clientId: string;
  text: string;               // Текст chunk'а
  embedding: number[];        // 768-размерный вектор
  source: string;             // Источник
  metadata: {
    filename?: string;
    page?: number;
  };
}
```

### ChatLog

```typescript
{
  clientId: string;
  sessionId: string;          // ID сессии браузера
  messages: [{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }];
  metadata: {
    userAgent?: string;
    page?: string;
  };
}
```

---

## 🎯 Функциональность

### RAG (Retrieval-Augmented Generation)

1. **Добавление знаний**: Текст разбивается на chunks по 500 символов
2. **Embedding**: Каждый chunk преобразуется в 768-мерный вектор через `text-embedding-004`
3. **Поиск**: При вопросе находятся топ-3 релевантных chunks через cosine similarity
4. **Генерация**: Контекст + вопрос отправляются в `gemini-2.0-flash`

```
Вопрос пользователя
        │
        ▼
┌───────────────────┐
│  Embedding Model  │  ──► Vector [768]
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Vector Search    │  ──► Top 3 relevant chunks
│  (MongoDB)        │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│  Gemini Model     │  ──► Ответ на основе контекста
│  (gemini-2.0)     │
└───────────────────┘
```

### Система подписок

```
Регистрация клиента
        │
        ▼
┌─────────────────────┐
│ Trial Period (30 д) │
│ subscriptionStatus: │
│ 'trial'             │
└─────────┬───────────┘
          │
          │ 3 дня ДО окончания: напоминание
          │
          ▼
┌─────────────────────┐           ┌─────────────────────┐
│ Оплата прошла       │  ──────►  │ Active Subscription │
│                     │           │ Следующий платёж    │
└─────────────────────┘           │ через 30 дней       │
          │                       └─────────────────────┘
          │
          ▼ Оплата НЕ прошла
┌─────────────────────┐
│ Grace Period (3 д)  │
│ subscriptionStatus: │
│ 'past_due'          │
└─────────┬───────────┘
          │
          │ 3 дня прошло, оплаты нет
          ▼
┌─────────────────────┐
│ Suspended           │  ──► Виджет не работает
│ isActive: false     │
└─────────────────────┘
```

---

## 🧩 Виджет

### Embed-код

```html
<div id="ai-widget-chatbot"></div>
<script src="https://your-domain.com/widgets/client-folder/script.js"></script>
```

### Структура виджета (Preact)

```
widget-builder/src/
├── components/
│   ├── Widget.jsx          # Главный компонент
│   ├── ChatBubble.jsx      # Кнопка открытия
│   ├── ChatWindow.jsx      # Окно чата
│   ├── MessageList.jsx     # Список сообщений
│   └── MessageInput.jsx    # Поле ввода
│
├── hooks/
│   └── useChat.js          # Логика чата + API
│
└── styles/
    └── widget.css          # Стили
```

### useChat Hook

```javascript
const { messages, isLoading, sendMessage } = useChat(apiUrl, clientToken);

// Автоматически:
// - Сохраняет sessionId в sessionStorage
// - Отправляет metadata (URL, userAgent)
// - Логирует в ChatLog на сервере
```

---

## 🤖 AI-Agent Widget Builder

> **Уникальная особенность платформы** — виджеты создаются AI-агентами, генерирующими исходный код. Это даёт **полную кастомизацию** и возможность легко добавлять любые фичи.

### Как это работает

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AI AGENT WORKFLOW                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. DISCOVERY (20 вопросов)                                         │
│     ┌──────────────────────────────────────────────────────────┐    │
│     │ 🎨 Дизайн: стиль, цвета, позиция, размер                 │    │
│     │ 🤖 Бот: имя, приветствие, тон общения                    │    │
│     │ 📎 Функции: файлы, звуки, история, изображения           │    │
│     │ 🔗 Интеграции: CRM, календарь, оплата, webhooks          │    │
│     │ ⚙️ AI: температура, лимит токенов, ограничения           │    │
│     └──────────────────────────────────────────────────────────┘    │
│                            │                                         │
│                            ▼                                         │
│  2. CODE GENERATION                                                  │
│     ┌──────────────────────────────────────────────────────────┐    │
│     │ AI-агент пишет исходный код компонентов:                 │    │
│     │                                                          │    │
│     │ .agent/widget-builder/clients/<client_id>/               │    │
│     │ ├── widget.config.json    ← Конфигурация                 │    │
│     │ └── src/                                                 │    │
│     │     └── components/                                      │    │
│     │         ├── Widget.jsx    ← Главный компонент            │    │
│     │         └── ChatMessage.jsx ← Сообщения                  │    │
│     └──────────────────────────────────────────────────────────┘    │
│                            │                                         │
│                            ▼                                         │
│  3. BUILD & DEPLOY                                                   │
│     ┌──────────────────────────────────────────────────────────┐    │
│     │ node .agent/widget-builder/scripts/build.js <client_id>  │    │
│     │                                                          │    │
│     │ Output: public/widgets/<client_id>/script.js             │    │
│     └──────────────────────────────────────────────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Skill File: `.agent/skills/create-widget/SKILL.md`

AI-агент использует этот skill для создания виджетов:

```yaml
---
name: create-widget
description: Creates a customized AI chat widget for a client.
---

# Phases:
1. Phase 0: Technical Stack Verification
2. Phase 1: Discovery (20 обязательных вопросов)
3. Phase 2: Configuration & Code Generation
4. Phase 3: Build & Delivery
```

### 20 Обязательных вопросов при создании

| Категория | Вопросы |
|-----------|---------|
| **Дизайн** | Стиль (Neon/Glass/Light/Dark), цвета (HEX), позиция кнопки, размер окна |
| **Бот** | Имя бота, приветствие, тон общения, подсказки-вопросы |
| **Функции** | Отправка файлов, изображения в ответах, звуки, typing-индикатор, сохранение истории |
| **Интеграции** | CRM, календарь, оплата, webhook/email |
| **AI** | Лимит токенов, температура, ограничение тем |

### Структура исходного кода виджета

```
.agent/widget-builder/
├── src/                        # Базовый шаблон
│   ├── main.jsx                # Entry point (Preact)
│   ├── index.css               # Базовые стили
│   ├── components/
│   │   ├── Widget.jsx          # Главный компонент
│   │   └── ChatMessage.jsx     # Рендер сообщений
│   └── hooks/
│       └── useChat.js          # Логика API + состояние
│
├── clients/                    # Кастомный код для каждого клиента
│   └── <client_id>/
│       ├── widget.config.json  # Конфиг клиента
│       └── src/
│           └── components/
│               ├── Widget.jsx      # Переопределённый компонент
│               └── ChatMessage.jsx # Кастомные стили сообщений
│
└── scripts/
    └── build.js                # Сборщик (Vite/esbuild)
```

### Как добавить новую фичу

#### Пример 1: Добавить кнопку "Позвонить"

```jsx
// Файл: .agent/widget-builder/clients/<client_id>/src/components/Widget.jsx

// Добавляем в header виджета:
<button 
  onClick={() => window.open('tel:+380991234567')}
  className="call-button"
>
  📞 Позвонить
</button>
```

#### Пример 2: Интеграция с Calendly

```jsx
// Добавляем в ChatMessage.jsx обработку специальных сообщений:

if (message.content.includes('/calendar')) {
  return (
    <div 
      className="calendly-inline-widget" 
      data-url="https://calendly.com/your-link"
      style={{ minWidth: '320px', height: '400px' }}
    />
  );
}
```

#### Пример 3: Webhook при завершении чата

```javascript
// В useChat.js добавляем:

const endChat = async () => {
  await fetch('https://your-webhook.com/chat-ended', {
    method: 'POST',
    body: JSON.stringify({
      clientId,
      sessionId,
      messages,
      metadata,
    }),
  });
};
```

### Процесс редактирования существующего виджета

```bash
# 1. Найти исходники клиента
ls .agent/widget-builder/clients/

# 2. Открыть и отредактировать компоненты
# .agent/widget-builder/clients/<client_id>/src/components/Widget.jsx

# 3. Пересобрать виджет
node .agent/widget-builder/scripts/build.js <client_id>

# 4. Скопировать в public
cp .agent/widget-builder/dist/script.js public/widgets/<client_id>/script.js
```

### Почему это лучше чем no-code?

| No-Code конструкторы | AI Widget Builder |
|---------------------|-------------------|
| ❌ Ограниченные шаблоны | ✅ **Полный контроль** над кодом |
| ❌ Невозможно добавить свою логику | ✅ **Любая кастомизация** — это просто JSX |
| ❌ Vendor lock-in | ✅ **Исходники у вас** — можете форкнуть |
| ❌ Стандартный дизайн | ✅ **Уникальный дизайн** под каждого клиента |
| ❌ Платные интеграции | ✅ **Бесплатные интеграции** — пишете сами |

### Доступные стили дизайна

| Стиль | Описание | Пример CSS |
|-------|----------|------------|
| 🌟 **Neon/Cyberpunk** | Яркие градиенты, свечение | `box-shadow: 0 0 20px var(--neon-cyan)` |
| 🪟 **Glassmorphism** | Размытый стеклянный эффект | `backdrop-filter: blur(20px)` |
| ⬜ **Light Minimal** | Чистый светлый фон | `background: #ffffff` |
| ⬛ **Dark Minimal** | Тёмный элегантный | `background: #1a1a2e` |
| 🎯 **Custom** | Под цвета сайта клиента | Любые HEX |

### Конфигурационный файл виджета

```json
// .agent/widget-builder/clients/<client_id>/widget.config.json
{
  "clientId": "dental-clinic-kyiv",
  "clientToken": "token_xxxxx",
  "apiUrl": "https://your-domain.com/api/chat",
  
  "design": {
    "style": "glassmorphism",
    "primaryColor": "#00d4ff",
    "accentColor": "#7c3aed",
    "position": "bottom-right",
    "size": "medium"
  },
  
  "bot": {
    "name": "Ассистент Анна",
    "greeting": "Привет! Я помогу записать вас к врачу 🦷",
    "tone": "friendly",
    "suggestedQuestions": [
      "Какие услуги вы предоставляете?",
      "Как записаться на приём?",
      "Сколько стоит консультация?"
    ]
  },
  
  "features": {
    "fileUpload": false,
    "imageDisplay": true,
    "soundNotifications": true,
    "typingIndicator": true,
    "persistHistory": true
  },
  
  "integrations": {
    "crm": null,
    "calendar": "https://calendly.com/dental-clinic",
    "payment": null,
    "webhook": "https://hooks.zapier.com/xxx"
  },
  
  "ai": {
    "maxTokens": 500,
    "temperature": 0.7,
    "restrictedTopics": []
  }
}
```

## 🖥 Admin Panel

### Вкладки клиента

| Tab | Описание |
|-----|----------|
| **Info** | Контактные данные, embed-код |
| **📊 Analytics** | Графики, статистика, экспорт |
| **💳 Billing** | Статус подписки, оплата |
| **🤖 AI Settings** | Промпт, температура, шаблоны |
| **📚 Knowledge** | База знаний, загрузка файлов |
| **💬 History** | История чатов |
| **Files** | Файлы виджета |
| **Usage** | Использование токенов |
| **Demo** | Превью виджета |

### Шаблоны промптов

Готовые шаблоны для разных бизнесов:
- 🦷 Стоматология
- 🏨 Отель
- 🛒 E-commerce
- 🏠 Недвижимость
- 💇 Салон красоты
- 🍽️ Ресторан

---

## 💳 Система платежей

### Поддерживаемые провайдеры

| Провайдер | Статус | Описание |
|-----------|--------|----------|
| **Cryptomus** | ✅ Реализован | Крипто-платежи (BTC, ETH, USDT) |
| **Dodo Payments** | 🔜 Планируется | Карты без юр.лица |
| **LiqPay** | 🔜 Планируется | Украинские карты |

### Архитектура

```typescript
// PaymentProvider interface — единый интерфейс
interface PaymentProvider {
  createSubscription(...): Promise<SubscriptionResult>;
  cancelSubscription(...): Promise<void>;
  getSubscriptionStatus(...): Promise<SubscriptionStatus>;
  handleWebhook(...): Promise<WebhookResult>;
}

// PaymentService — роутинг к нужному провайдеру
class PaymentService {
  setupSubscription(clientId, provider) { ... }
  cancelSubscription(clientId) { ... }
}
```

### CRON Job

Ежедневная проверка платежей:

```bash
# Добавить в crontab
0 9 * * * cd /path/to/AIWidget && npx ts-node scripts/checkPayments.ts
```

---

## 📊 Аналитика

### Метрики

- **Всего чатов** за 30 дней
- **Всего сообщений** за 30 дней
- **Среднее** сообщений на чат
- **График** чатов по дням
- **Распределение** по часам
- **ТОП-10** популярных вопросов

### Экспорт в Google Sheets

1. Создайте проект в [Google Cloud Console](https://console.cloud.google.com/)
2. Включите Google Sheets API
3. Создайте Service Account и скачайте JSON ключ
4. Добавьте ключ в `.env.local`
5. Поделитесь таблицей с email service account

---

## 🔔 Уведомления

### Email

- 📧 Напоминание за 3 дня до оплаты
- ❌ Уведомление о неудачной оплате
- 🚫 Уведомление о приостановке
- ✅ Подтверждение успешной оплаты

### Telegram

Аналогичные уведомления в Telegram бот.

```typescript
// lib/notifications.ts
sendPaymentReminder(email, telegram, daysUntil, url);
sendPaymentFailedNotice(email, telegram, graceDays, url);
sendSuspensionNotice(email, telegram, url);
sendPaymentSuccessNotice(email, telegram, nextDate);
```

---

## 🚀 Деплой

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    depends_on:
      - mongo

  mongo:
    image: mongo:6
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: mongo
      MONGO_INITDB_ROOT_PASSWORD: boot

volumes:
  mongo_data:
```

### Vercel

```bash
vercel deploy
# Добавьте все переменные окружения в Vercel Dashboard
```

---

## 📝 Changelog

### v1.0.0 (Февраль 2026)
- ✅ Базовая функциональность виджета
- ✅ Admin Panel с табами
- ✅ RAG с Gemini
- ✅ Загрузка документов
- ✅ Шаблоны промптов
- ✅ История чатов
- ✅ Система подписок с Cryptomus
- ✅ Email + Telegram уведомления
- ✅ Analytics Dashboard
- ✅ Google Sheets интеграция

---

## 🤝 Поддержка

- 📧 Email: chatbotfusion@gmail.com
- 💬 Telegram: @chatbotfusion

---

## 📄 Лицензия

MIT License © 2026 ChatBot Fusion
