---
name: create-widget
description: Creates a customized AI chat widget for a client. Use when you need to build a chat bot widget with RAG integration, custom design, streaming responses, quick replies, feedback system, lead collection, and various integrations like CRM, calendars, or payments.
---

# High-Performance AI Widget Builder v2.0

You are an expert React/Preact developer. Your goal is to create unique, high-performance UI components for an AI widget, tailored to the client's specific design and functional needs.

## When to use this skill

- When a user asks to "create a widget" or "create a chat bot".
- When you need to build a custom AI assistant interface.
- To generate the final, optimized `script.js` for a client.

---

---

## Phase 0: global Rules & Constraints (MANDATORY)

These rules apply to the entire skill execution. You MUST follow them strictly.

1.  **Context First**: Always ask for the full business context before writing any code. The AI cannot function effectively without knowing the business domain.
2.  **Verification**: Verify every major step (API endpoints, database connections) before proceeding to the next.
3.  **User Confirmation**: Ask for user confirmation after the Discovery Phase and before writing code.
4.  **Security**: Never hardcode API keys in the client-side code. Use environment variables in the build process or fetch them securely.
5.  **Performance**: The final widget script must be minimized and optimized for loading speed (< 500KB).

## Phase 0.5: Technical Stack Verification (MANDATORY)

Before building the widget, you MUST ensure the backend integration meets these strict requirements:

1.  **AI Model**: MUST use **Gemini 3 Flash** (for speed and cost).
2.  **RAG System**: The `/api/chat` endpoint MUST implement Retrieval-Augmented Generation to use client knowledge.
3.  **Prompt Caching**: The system prompt MUST be cached using Gemini's context caching to save tokens.
4.  **Database**: Request logs and token usage MUST be saved to MongoDB.
5.  **Streaming Endpoint**: If client requested streaming — verify that `/api/chat/stream` endpoint exists and returns `text/event-stream`. If it does NOT exist, you MUST create it before building the widget (see Phase 2.5).
6.  **Feedback Endpoint**: If client requested feedback — verify that `/api/feedback` endpoint exists. If not, create it (see Phase 2.6).
7.  **Lead Collection Endpoint**: If client requested lead collection — verify that `/api/leads` endpoint exists. If not, create it (see Phase 2.7).

If these are not set up, you must configure the backend API first using the `setup-rag-backend` skill (or manually implementing it).

---

## Phase 1: Discovery (MANDATORY)

**You MUST ask ALL questions from ALL sections below.** Present them section by section. Wait for the user to answer each section before proceeding to the next.

### 1.1 Design & Appearance

```text
🎨 ДИЗАЙН ВИДЖЕТА

1. Какой стиль дизайна предпочитаете?
   a) 🌟 Неоновый/Cyberpunk (яркие градиенты, свечение)
   b) 🪟 Glassmorphism (размытый стеклянный эффект)
   c) ⬜ Минималистичный светлый
   d) ⬛ Минималистичный тёмный
   e) 🏢 Корпоративный/Строгий
   f) 🎯 Под стиль сайта (укажите URL сайта и/или цвета)

2. Основные цвета (HEX или название):
   - Главный цвет: ___
   - Акцентный цвет: ___
   - Цвет фона: ___

3. Где разместить кнопку чата?
   a) Справа внизу (рекомендуется)
   b) Слева внизу

4. Размер виджета:
   a) Компактный (350x450px) — для мобильных
   b) Средний (400x550px) — универсальный
   c) Большой (450x650px) — для десктопа

5. Форма кнопки открытия:
   a) Круглая (стандарт)
   b) Pill/Капсула с текстом (например: "💬 Задать вопрос")
   c) Квадратная со скруглением

6. Нужна ли тёмная/светлая тема с переключателем?
   a) Только светлая
   b) Только тёмная
   c) Обе + автоматическое определение по системе пользователя
   d) Обе + ручной переключатель в хедере виджета
```

### 1.2 Bot Personality

```text
🤖 ПОВЕДЕНИЕ БОТА

7. Как зовут бота? (например: "Ассистент Анна", "AI-помощник")

8. Аватар бота:
   a) Эмоджи (укажите какой, например: 🤖, 👩‍💼, 🧠)
   b) Инициалы (например: "AI")
   c) Загрузить иконку (укажите URL)

9. Стартовое приветствие:
   (например: "Привет! Я виртуальный помощник. Чем могу помочь?")

10. Тон общения:
    a) Формальный/деловой
    b) Дружелюбный
    c) Молодёжный/неформальный
    d) Экспертный/профессиональный
```

### 1.3 Quick Replies (Быстрые ответы)

```text
⚡ БЫСТРЫЕ ОТВЕТЫ (Quick Replies)

11. Нужны ли кнопки быстрых ответов?
    a) Да — стартовые кнопки (показываются при открытии чата)
    b) Да — стартовые + контекстные (AI предлагает кнопки после ответов)
    c) Нет

    Если "Да":

12. Укажите 3-6 стартовых быстрых ответов:
    (например: "📋 Услуги и цены", "📅 Записаться", "📍 Как добраться", "⏰ Часы работы")

13. Стиль кнопок быстрых ответов:
    a) Pill/Капсулы (скруглённые)
    b) Карточки с иконками
    c) Простые текстовые ссылки
```

### 1.4 Streaming (Потоковые ответы)

```text
🌊 СТРИМИНГ ОТВЕТОВ

14. Нужен ли стриминг (потоковый вывод) ответов?
    a) Да — текст появляется посимвольно/по словам в реальном времени (рекомендуется, лучший UX)
    b) Нет — ответ приходит целиком после генерации

    Если "Да":

15. Скорость стриминга:
    a) Быстрая (сразу как приходит от AI) — рекомендуется
    b) Плавная (с небольшой задержкой между символами, имитация печати)
```

### 1.5 Feedback (Оценка ответов)

```text
👍 ОЦЕНКА ОТВЕТОВ (Feedback)

16. Нужна ли система оценки ответов бота?
    a) Да — 👍/👎 кнопки после каждого ответа бота
    b) Да — 👍/👎 + возможность написать комментарий к оценке
    c) Да — 5-звёздочная система (⭐⭐⭐⭐⭐)
    d) Нет

    Если "Да":

17. Показывать благодарность после оценки?
    a) Да — "Спасибо за отзыв!" (анимированное)
    b) Нет — просто подсветить выбранную кнопку
```

### 1.6 Lead Collection (Сбор контактов)

```text
📇 СБОР КОНТАКТОВ (Lead Collection)

18. Нужен ли сбор контактных данных?
    a) Да — перед началом чата (обязательная форма)
    b) Да — после N сообщений (ненавязчивое предложение)
    c) Да — по запросу бота (когда пользователь спрашивает про запись/заказ)
    d) Нет

    Если "Да":

19. Какие поля собирать?
    a) Только имя + телефон
    b) Имя + email
    c) Имя + телефон + email
    d) Кастомные поля (укажите какие: ___)

20. Куда отправлять лиды?
    a) Сохранять в базу данных (MongoDB)
    b) Отправлять на email
    c) Отправлять webhook (укажите URL: ___)
    d) Всё вышеперечисленное
```

### 1.7 Features & Media

```text
📎 ФУНКЦИИ И МЕДИА

21. Нужна ли отправка файлов пользователем?
    a) Да (только изображения)
    b) Да (любые файлы: PDF, DOCX и т.д.)
    c) Нет

22. Должен ли бот показывать изображения в ответах?
    a) Да
    b) Нет

23. Markdown-форматирование ответов бота?
    a) Да — полный Markdown (жирный, курсив, списки, код, ссылки)
    b) Да — базовый (жирный, курсив, ссылки)
    c) Нет — только plain text

24. Звуковые уведомления при новом сообщении?
    a) Да (тонкий звук)
    b) Нет

25. Показывать индикатор "Бот печатает..."?
    a) Да — анимированные точки (стандарт)
    b) Да — текст "Печатает..."
    c) Нет
    ⚠️ Если включён стриминг, индикатор автоматически заменяется потоковым выводом текста.

26. Сохранять историю чата между сессиями? (LocalStorage)
    **MANDATORY: YES** (Required for user experience)

27. Кнопка "Очистить историю"?
    a) Да — в хедере виджета
    b) Да — в меню (три точки)
    c) Нет
```

### 1.8 Advanced Widget Features

```text
🚀 ПРОДВИНУТЫЕ ФУНКЦИИ

28. Нужен ли "Welcome Screen" (экран приветствия) при первом открытии?
    a) Да — карточка с описанием бота + стартовые кнопки
    b) Нет — сразу чат

29. Индикатор непрочитанных сообщений (badge на кнопке)?
    a) Да — числовой бейдж (1, 2, 3...)
    b) Да — просто красная точка
    c) Нет

30. Автоматическое открытие чата?
    a) Да — через N секунд после загрузки страницы (укажите секунды: ___)
    b) Да — при попытке уйти со страницы (exit-intent)
    c) Да — при скролле до определённого процента страницы (укажите %: ___)
    d) Нет — только по клику

31. "Powered by" бренд в футере?
    a) Да — "Powered by [Ваш бренд]"
    b) Нет — без бренда

32. Расписание работы виджета?
    a) Да — показывать "Мы офлайн" в нерабочее время + форма обратной связи
    b) Да — виджет всегда доступен, но в нерабочее время предупреждать об отложенном ответе
    c) Нет — всегда онлайн (AI отвечает 24/7)

33. Мультиязычность?
    a) Только русский
    b) Только английский
    c) Русский + Английский (автоопределение)
    d) Другие языки (укажите: ___)
```

### 1.9 Integrations

```text
🔗 ИНТЕГРАЦИИ

34. Нужна ли интеграция с CRM?
    a) Bitrix24
    b) AmoCRM
    c) HubSpot
    d) Другая (укажите: ___)
    e) Нет

35. Интеграция с календарём?
    a) Google Calendar
    b) Calendly
    c) Другая (укажите: ___)
    d) Нет

36. Интеграция оплаты в чате?
    a) Stripe
    b) YooKassa
    c) Другая (укажите: ___)
    d) Нет

37. Отправка данных на webhook/email при завершении чата?
    a) Да — webhook (укажите URL: ___)
    b) Да — email (укажите адрес: ___)
    c) Да — оба
    d) Нет

38. Интеграция с мессенджерами (единая база знаний)?
    a) Telegram Bot
    b) WhatsApp Business
    c) Оба
    d) Нет (только виджет на сайте)
```

### 1.10 Advanced AI Settings

```text
⚙️ НАСТРОЙКИ AI

39. Максимальная длина ответа (токены)?
    a) Короткие ответы (256 токенов)
    b) Средние (512 токенов)
    c) Длинные (1024 токенов) — по умолчанию
    d) Очень длинные (2048 токенов)

40. Креативность (temperature)?
    a) Низкая (0.3) — точные, фактические ответы
    b) Средняя (0.5) — баланс
    c) Высокая (0.7) — более творческие ответы (по умолчанию)
    d) Очень высокая (0.9) — максимально креативные

41. Ограничить темы разговора?
    a) Нет — бот отвечает на всё
    b) Да — только по тематике бизнеса (укажите границы: ___)
    c) Да — блокировать определённые темы (укажите какие: ___)

42. Fallback-поведение (когда AI не знает ответ)?
    a) Предложить связаться с оператором + показать контакты
    b) Собрать контактные данные для обратного звонка
    c) Перенаправить на страницу FAQ
    d) Просто извиниться и предложить перефразировать вопрос
```

### 1.11 Business Context & Knowledge Base (CRITICAL)

```text
🧠 БАЗА ЗНАНИЙ И КОНТЕКСТ БИЗНЕСА

43. Опишите ваш бизнес максимально подробно:
    (Чем занимаетесь, основные услуги/товары, уникальные преимущества, целевая аудитория)

44. Ключевая информация для клиентов (FAQ):
    (Цены, сроки, гарантии, условия доставки/возврата, адрес, контакты)

45. Есть ли готовые документы или ссылки на базу знаний?
    (Если да — предоставьте ссылки или текст прямо здесь. Я создам из этого базу знаний для AI.)
```

**IMPORTANT Rule:** After receiving the answer to question 43-45, you MUST:

1.  Compile all this information into a structured Markdown file: `.agent/widget-builder/clients/<client_id>/knowledge/context.md`.
2.  Upload this to the RAG system using the `setup-knowledge-base` skill or `/api/knowledge` endpoint.
3.  Confirm to the user: "Business context received and uploaded to AI Knowledge Base."

---

## Phase 2: Configuration & Engineering

### Step 1: Create Client Source Directory (CRITICAL)

You MUST create a dedicated source folder for this client to preserve their unique code for future edits.

```bash
mkdir -p .agent/widget-builder/clients/<client_id>/src/components
mkdir -p .agent/widget-builder/clients/<client_id>/src/hooks
```

### Step 1.5: Process Knowledge Base (AUTOMATED)

Based on the answers from Section 1.11 (Business Context):

1.  **Create Knowledge File**:
    Write the context to `.agent/widget-builder/clients/<client_id>/knowledge/context.md`.
    Structure it with clear headers: `# Business Overview`, `## Services`, `## FAQ`, `## Contacts`.

2.  **Upload to RAG System**:
    Use the `knowledge_base` tool or `curl` to upload this file to the vector database.

    ```bash
    # Example upload logic (pseudocode - adapt to actual API)
    curl -X POST "http://localhost:3000/api/knowledge" \
         -F "clientId=<client_id>" \
         -F "file=@.agent/widget-builder/clients/<client_id>/knowledge/context.md"
    ```

3.  **Verify**: Ensure at least one chunk was created in the database.

### Step 2: Create Configuration

Write the config to the client's folder: `.agent/widget-builder/clients/<client_id>/widget.config.json`

The config MUST include all new feature flags based on the Discovery answers:

```json
{
  "clientId": "<client_id>",
  "apiEndpoint": "https://your-domain.com/api/chat",
  "streamEndpoint": "https://your-domain.com/api/chat/stream",
  "feedbackEndpoint": "https://your-domain.com/api/feedback",
  "leadsEndpoint": "https://your-domain.com/api/leads",
  "theme": {
    "primary": "#HEX",
    "accent": "#HEX",
    "background": "#HEX"
  },
  "design": {
    "style": "neon|glass|light|dark|corporate",
    "position": "bottom-right|bottom-left",
    "size": "compact|medium|large",
    "buttonShape": "circle|pill|rounded-square",
    "darkMode": "light-only|dark-only|auto|toggle"
  },
  "bot": {
    "name": "Bot Name",
    "avatar": "🤖",
    "greeting": "Hello message",
    "tone": "formal|friendly|casual|expert"
  },
  "features": {
    "streaming": true,
    "streamingSpeed": "fast|smooth",
    "quickReplies": true,
    "quickRepliesStyle": "pill|card|text",
    "contextualReplies": false,
    "feedback": true,
    "feedbackType": "thumbs|thumbs-comment|stars",
    "feedbackThankYou": true,
    "leadCollection": false,
    "leadCollectionTrigger": "before-chat|after-n-messages|on-demand",
    "leadCollectionMessages": 3,
    "leadFields": ["name", "phone", "email"],
    "leadDestination": ["database", "email", "webhook"],
    "leadWebhookUrl": "",
    "leadEmail": "",
    "fileUpload": false,
    "fileUploadType": "images|all",
    "imageDisplay": false,
    "markdown": true,
    "markdownLevel": "full|basic|none",
    "sound": false,
    "typingIndicator": true,
    "persistHistory": true,
    "clearHistory": true,
    "clearHistoryPosition": "header|menu",
    "welcomeScreen": false,
    "unreadBadge": false,
    "unreadBadgeStyle": "number|dot",
    "autoOpen": false,
    "autoOpenTrigger": "delay|exit-intent|scroll",
    "autoOpenDelay": 0,
    "autoOpenScrollPercent": 0,
    "poweredBy": false,
    "poweredByText": "",
    "schedule": false,
    "scheduleMode": "offline-form|warning|always-online",
    "language": "ru",
    "multilingual": false,
    "fallbackBehavior": "contact-operator|collect-contact|faq-redirect|apologize"
  },
  "quickRepliesData": [
    { "text": "📋 Услуги и цены", "icon": "📋" },
    { "text": "📅 Записаться", "icon": "📅" },
    { "text": "📍 Как добраться", "icon": "📍" },
    { "text": "⏰ Часы работы", "icon": "⏰" }
  ],
  "integrations": {
    "crm": null,
    "calendar": null,
    "payment": null,
    "webhook": null,
    "email": null,
    "telegram": false,
    "whatsapp": false
  },
  "ai": {
    "maxTokens": 1024,
    "temperature": 0.7,
    "topicRestriction": null,
    "blockedTopics": []
  }
}
```

### Step 3: Write Custom Hook — `useChat.js`

**Target**: `.agent/widget-builder/clients/<client_id>/src/hooks/useChat.js`

The hook MUST implement ALL enabled features. Below is the implementation guide for each feature:

#### 3.1 Streaming Support (SSE)

If `config.features.streaming === true`, replace the standard `fetch` call with `EventSource` / `fetch` + `ReadableStream`:

```javascript
// STREAMING IMPLEMENTATION PATTERN
const sendMessageStreaming = async (text) => {
  const userMsg = { role: 'user', content: text };
  setMessages((prev) => [...prev, userMsg]);
  setIsLoading(true);

  // Create a placeholder for the streaming response
  const botMsgId = Date.now();
  setMessages((prev) => [...prev, { id: botMsgId, role: 'assistant', content: '', streaming: true }]);

  try {
    const response = await fetch(config.streamEndpoint || config.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: config.clientId,
        message: text,
        conversationHistory: messages.slice(-10),
        sessionId,
        metadata: { page: window.location.href, userAgent: navigator.userAgent },
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // Parse SSE format: "data: {...}\n\n"
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            if (parsed.token) {
              fullText += parsed.token;
              setMessages((prev) => prev.map((m) => (m.id === botMsgId ? { ...m, content: fullText } : m)));
            }
          } catch (e) {
            /* skip malformed chunks */
          }
        }
      }
    }

    // Finalize: remove streaming flag
    setMessages((prev) => prev.map((m) => (m.id === botMsgId ? { ...m, streaming: false } : m)));
  } catch (err) {
    console.error(err);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === botMsgId ? { ...m, content: 'Произошла ошибка. Попробуйте ещё раз.', streaming: false } : m
      )
    );
  } finally {
    setIsLoading(false);
  }
};
```

#### 3.2 Feedback Support

The hook must expose a `sendFeedback` function:

```javascript
const sendFeedback = useCallback(
  async (messageIndex, rating, comment = '') => {
    try {
      await fetch(config.feedbackEndpoint || `${config.apiEndpoint.replace('/chat', '/feedback')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: config.clientId,
          sessionId,
          messageIndex,
          rating, // 'up' | 'down' | 1-5
          comment,
          messageContent: messages[messageIndex]?.content || '',
        }),
      });
      // Update local message state to mark feedback as given
      setMessages((prev) => prev.map((m, i) => (i === messageIndex ? { ...m, feedback: rating } : m)));
    } catch (err) {
      console.error('Feedback failed:', err);
    }
  },
  [config, sessionId, messages]
);
```

#### 3.3 Lead Collection Support

The hook must expose a `submitLead` function:

```javascript
const [leadCollected, setLeadCollected] = useState(() => {
  return localStorage.getItem(`lead_${config.clientId}`) === 'true';
});
const [showLeadForm, setShowLeadForm] = useState(false);

// Trigger lead form based on config
useEffect(() => {
  if (!config.features?.leadCollection || leadCollected) return;

  const trigger = config.features.leadCollectionTrigger;
  if (trigger === 'before-chat') {
    setShowLeadForm(true);
  } else if (trigger === 'after-n-messages') {
    const userMsgCount = messages.filter((m) => m.role === 'user').length;
    if (userMsgCount >= (config.features.leadCollectionMessages || 3)) {
      setShowLeadForm(true);
    }
  }
  // 'on-demand' is triggered by the AI via a special response token
}, [messages, config, leadCollected]);

const submitLead = useCallback(
  async (leadData) => {
    try {
      await fetch(config.leadsEndpoint || `${config.apiEndpoint.replace('/chat', '/leads')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: config.clientId,
          sessionId,
          ...leadData,
          page: window.location.href,
          timestamp: new Date().toISOString(),
        }),
      });
      setLeadCollected(true);
      setShowLeadForm(false);
      localStorage.setItem(`lead_${config.clientId}`, 'true');
    } catch (err) {
      console.error('Lead submission failed:', err);
    }
  },
  [config, sessionId]
);
```

#### 3.4 Sound Notification

```javascript
const playNotificationSound = useCallback(() => {
  if (!config.features?.sound) return;
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    oscillator.connect(gain);
    gain.connect(audioCtx.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gain.gain.value = 0.1;
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    /* silent fail */
  }
}, [config]);
```

The hook MUST return ALL of these:

```javascript
return {
  messages,
  sendMessage: config.features?.streaming ? sendMessageStreaming : sendMessageStandard,
  sendFeedback,
  submitLead,
  isLoading,
  typing,
  starters: config.quickRepliesData || config.starterQuestions || [],
  showLeadForm,
  setShowLeadForm,
  leadCollected,
  clearHistory,
};
```

### Step 4: Write Custom Components

**Target Files:**

- `.agent/widget-builder/clients/<client_id>/src/components/Widget.jsx`
- `.agent/widget-builder/clients/<client_id>/src/components/ChatMessage.jsx`
- `.agent/widget-builder/clients/<client_id>/src/components/QuickReplies.jsx` (if enabled)
- `.agent/widget-builder/clients/<client_id>/src/components/FeedbackButtons.jsx` (if enabled)
- `.agent/widget-builder/clients/<client_id>/src/components/LeadForm.jsx` (if enabled)
- `.agent/widget-builder/clients/<client_id>/src/components/WelcomeScreen.jsx` (if enabled)
- `.agent/widget-builder/clients/<client_id>/src/components/MarkdownRenderer.jsx` (if enabled)

#### 4.1 Widget.jsx — Core Structure

The Widget component MUST conditionally render all enabled features:

```
Widget Layout:
┌─────────────────────────┐
│ Header (bot name/avatar)│  ← dark mode toggle (if enabled)
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │     clear history button (if enabled)
│                         │
│ Welcome Screen (first   │  ← Only if features.welcomeScreen && first visit
│ open, replaces messages)│
│                         │
│ Lead Form (overlay)     │  ← Only if features.leadCollection && trigger met
│                         │
│ Messages Area           │
│  ├ ChatMessage          │
│  │  └ FeedbackButtons   │  ← Only on bot messages if features.feedback
│  ├ ChatMessage          │
│  └ Typing indicator /   │  ← Streaming text replaces dots
│    Streaming text       │
│                         │
│ Quick Replies           │  ← Below messages if features.quickReplies
│                         │
│ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│ Input + Send button     │
│ Powered by (footer)     │  ← Only if features.poweredBy
└─────────────────────────┘
```

**Key Implementation Notes for Widget.jsx:**

- If `config.features.autoOpen` is enabled, use `useEffect` with `setTimeout`, `scroll` event listener, or `mouseleave` event on `document` based on `autoOpenTrigger`.
- If `config.features.unreadBadge` is enabled, track unread count and show badge on the toggle button when widget is closed.
- If `config.features.schedule` is enabled, check current time against business hours before rendering the normal chat vs. the offline form.
- If `config.design.darkMode === 'toggle'`, add a toggle button (sun/moon icon) in the header and maintain theme state in localStorage.
- If `config.design.darkMode === 'auto'`, use `window.matchMedia('(prefers-color-scheme: dark)')`.

#### 4.2 ChatMessage.jsx — Enhanced Messages

The ChatMessage component MUST support:

1. **Markdown Rendering** — If `config.features.markdown` is enabled:
   - `full`: Parse and render headings, bold, italic, lists, code blocks, links, tables
   - `basic`: Only bold (`**text**`), italic (`*text*`), and links (`[text](url)`)
   - Use a lightweight Markdown parser (write inline — do NOT add npm dependencies for this)

2. **Streaming Animation** — If message has `streaming: true` flag:
   - Show a blinking cursor `▊` at the end of the text
   - Optionally apply smooth word-by-word reveal animation if `streamingSpeed === 'smooth'`

3. **Feedback Buttons** — Render after each bot message if `config.features.feedback` is enabled:
   - Show 👍/👎 buttons or ⭐ rating below the message bubble
   - Once clicked, show the selected state and disable further clicks
   - If `feedbackType === 'thumbs-comment'`, show a small text input on 👎 click

4. **Timestamp** — Show message timestamp (optional, can be toggled)

#### 4.3 QuickReplies.jsx — Quick Reply Buttons

```jsx
// IMPLEMENTATION PATTERN:
export function QuickReplies({ replies, onSelect, style, config }) {
  // style: 'pill' | 'card' | 'text'
  // Show as horizontally scrollable row
  // On click: call onSelect(reply.text) which triggers sendMessage
  // After first user message, hide starters and show contextual replies (if enabled)
}
```

**Rules:**

- Starters show ONLY before the first user message or when chat is empty
- If `contextualReplies` is enabled, after each bot response, check if the response contains `[QUICK_REPLIES: "option1", "option2", "option3"]` pattern and render those as buttons
- Quick reply buttons must match the widget's theme (neon glow for neon, transparent for glass, etc.)

#### 4.4 FeedbackButtons.jsx — Feedback Component

```jsx
export function FeedbackButtons({ messageIndex, feedback, onFeedback, type, config }) {
  // type: 'thumbs' | 'thumbs-comment' | 'stars'
  // feedback: current feedback state ('up' | 'down' | 1-5 | null)
  // Show thank you message after feedback is given (if config.features.feedbackThankYou)
  // Animate the transition
}
```

#### 4.5 LeadForm.jsx — Lead Collection Form

```jsx
export function LeadForm({ fields, onSubmit, onSkip, config }) {
  // fields: ['name', 'phone', 'email'] or custom fields
  // Renders as an overlay card inside the widget
  // Validates fields (phone format, email format)
  // onSubmit: calls submitLead(data)
  // onSkip: closes the form (if not mandatory before-chat)
  // If trigger === 'before-chat', there is NO skip button
  // Style must match widget theme
}
```

#### 4.6 WelcomeScreen.jsx — Welcome Screen

```jsx
export function WelcomeScreen({ config, onStartChat, onQuickReply }) {
  // Shows bot avatar, name, description
  // Shows starter quick replies as large cards
  // "Start chatting" button
  // Only shown on first open (track in localStorage)
}
```

#### 4.7 MarkdownRenderer.jsx — Inline Markdown Parser

**IMPORTANT**: Do NOT use npm packages for Markdown. Write a lightweight inline parser:

````jsx
export function MarkdownRenderer({ text, level = 'full' }) {
  // level: 'full' | 'basic'
  // Basic: **bold**, *italic*, [links](url)
  // Full: + ## headings, - lists, `code`, ```code blocks```, > blockquotes
  // Return rendered JSX
  // Sanitize HTML to prevent XSS
}
````

### Step 4.5: Create Backend Endpoints (if needed)

#### Streaming Endpoint — `/api/chat/stream/route.ts`

If the client chose streaming AND the endpoint does not exist, create it:

```typescript
// PATTERN FOR STREAMING ENDPOINT:
// - Accept same body as /api/chat
// - Return Response with ReadableStream
// - Content-Type: 'text/event-stream'
// - Send tokens as: data: {"token": "word "}\n\n
// - End with: data: [DONE]\n\n
// - Use Gemini's streaming API: model.generateContentStream()
```

#### Feedback Endpoint — `/api/feedback/route.ts`

If feedback is enabled AND the endpoint does not exist, create it:

```typescript
// PATTERN:
// POST: Save feedback to MongoDB
// Schema: { clientId, sessionId, messageIndex, rating, comment, messageContent, timestamp }
// GET: Retrieve feedback stats for a client (for admin dashboard)
```

#### Leads Endpoint — `/api/leads/route.ts`

If lead collection is enabled AND the endpoint does not exist, create it:

```typescript
// PATTERN:
// POST: Save lead to MongoDB + optional webhook/email
// Schema: { clientId, sessionId, name, phone, email, customFields, page, timestamp }
// GET: Retrieve leads for a client (for admin dashboard)
// Also send to webhook/email if configured
```

### Step 5: Run the Build Engine

Use the custom build script that injects the client's code.

```bash
node .agent/widget-builder/scripts/build.js <client_id>
```

**IMPORTANT:** After building, verify the output:

1. Check that `dist/script.js` exists and is not empty
2. Check file size — should be between 50KB and 500KB
3. If build fails, read the error output carefully and fix the component code

---

## Phase 3: Delivery

### Step 6: Deploy Artifact

Copy the generated file to the public widgets folder.

```bash
mkdir -p widgets/<client_id>
cp .agent/widget-builder/dist/script.js widgets/<client_id>/script.js
```

### Step 7: Create info.json

Write the client metadata:

```bash
# Write info.json with client details
```

```json
{
  "name": "Client Name",
  "clientId": "<client_id>",
  "features": ["streaming", "quick-replies", "feedback", "lead-collection", "markdown"],
  "createdAt": "ISO_DATE",
  "version": "2.0"
}
```

### Step 8: Notify User

Tell the user the widget is ready and provide:

1. **Installation Code:**

```html
<script src="https://your-domain.com/api/widgets/<client_id>/script.js"></script>
```

2. **Feature Summary Table:**

```text
✅ Enabled Features:
├── 🌊 Streaming ответов: Да/Нет
├── ⚡ Быстрые ответы: Да (N кнопок) / Нет
├── 👍 Оценка ответов: Thumbs/Stars/Нет
├── 📇 Сбор контактов: Да (trigger) / Нет
├── 📝 Markdown: Full/Basic/Нет
├── 🔔 Звуковые уведомления: Да/Нет
├── 💾 Сохранение истории: Да
├── 🌙 Тёмная тема: Auto/Toggle/Light/Dark
├── 🏠 Welcome Screen: Да/Нет
├── 📎 Загрузка файлов: Да/Нет
└── 🔗 Интеграции: CRM/Calendar/Payment/Webhook
```

3. **Test Instructions:**

```text
Для тестирования:
1. Откройте ваш сайт с установленным скриптом
2. Нажмите на кнопку чата в правом/левом нижнем углу
3. Проверьте стартовое приветствие
4. Отправьте тестовое сообщение
5. Проверьте быстрые ответы (если включены)
6. Проверьте стриминг (если включён)
7. Оцените ответ кнопками 👍/👎 (если включены)
```

---

## Appendix A: Design System Reference

### Neon/Cyberpunk Style

- Background: `#0a0a0f` to `#1a1a2e`
- Borders: `border-cyan-500/30` with `shadow-[0_0_40px_rgba(0,217,255,0.2)]`
- Text: white/90
- Accents: cyan, magenta, electric blue gradients
- Quick Reply buttons: transparent with neon border + glow on hover
- Feedback buttons: subtle glow animation on hover

### Glassmorphism Style

- Background: `bg-white/80 backdrop-blur-xl`
- Borders: `border-white/20`
- Shadow: `shadow-2xl`
- Quick Reply buttons: frosted glass effect
- Feedback buttons: glass pill shape

### Minimal Light

- Background: white
- Borders: `border-gray-100`
- Clean shadows: `shadow-sm`
- Quick Reply buttons: outlined with primary color
- Feedback buttons: simple outline

### Minimal Dark

- Background: `#1a1a1a`
- Borders: `border-gray-800`
- Text: `text-gray-100`
- Quick Reply buttons: dark card with light border
- Feedback buttons: dark with subtle highlight

### Corporate Style

- Background: white with subtle gray header
- Borders: solid, no rounded corners
- Professional font stack
- Quick Reply buttons: rectangular, business-like
- Feedback buttons: text-based ("Полезно" / "Не полезно")

---

## Appendix B: Contextual Quick Replies Protocol

When `contextualReplies` is enabled, instruct the AI (via system prompt addition) to append quick reply suggestions to its responses using a special format:

**Addition to System Prompt:**

```
Когда это уместно, в конце своего ответа добавь предложения для быстрых ответов в формате:
[QUICK_REPLIES: "Вариант 1", "Вариант 2", "Вариант 3"]
Это поможет пользователю продолжить диалог. Не используй этот формат в каждом ответе — только когда есть логичные варианты продолжения.
```

The widget must parse this format from the AI response, strip it from the displayed text, and render as clickable quick reply buttons.

---

## Appendix C: Streaming Backend Implementation

When creating `/api/chat/stream/route.ts`, use this pattern:

```typescript
import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
// ... other imports same as /api/chat/route.ts

export async function POST(request: NextRequest) {
  // 1. Parse request body (same as /api/chat)
  // 2. Get AI settings, knowledge chunks, build context (same as /api/chat)
  // 3. Instead of generateResponse(), use streaming:

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash',
    generationConfig: { temperature, maxOutputTokens: maxTokens },
  });

  const prompt = `${systemPrompt}\n\n---\nБАЗА ЗНАНИЙ:\n${context}\n---\n\nВопрос: ${message}\n\nОтвет:`;

  const result = await model.generateContentStream(prompt);

  // 4. Create SSE stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';
      for await (const chunk of result.stream) {
        const token = chunk.text();
        if (token) {
          fullResponse += token;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        }
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();

      // 5. Log full response to ChatLog (async)
      // Same logging logic as /api/chat
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
```

---

## Appendix D: Feature Dependencies

Some features have dependencies. Validate these before building:

| Feature                  | Requires                           |
| ------------------------ | ---------------------------------- |
| Streaming                | `/api/chat/stream` endpoint        |
| Feedback                 | `/api/feedback` endpoint           |
| Lead Collection          | `/api/leads` endpoint              |
| Contextual Quick Replies | System prompt modification         |
| Markdown (full)          | MarkdownRenderer component         |
| Sound                    | Web Audio API (no dependency)      |
| File Upload              | `/api/upload` endpoint + storage   |
| Dark Mode (auto)         | `prefers-color-scheme` media query |
| Schedule                 | Business hours config in DB        |
| CRM Integration          | CRM API credentials in env         |
| Webhook                  | Valid webhook URL                  |

---

## Appendix E: Error Handling & Edge Cases

1. **Streaming fails mid-response**: Show partial text + "Соединение прервано. Попробуйте ещё раз." message
2. **Feedback endpoint unavailable**: Silently fail, don't show error to user
3. **Lead form submission fails**: Show inline error, keep form open for retry
4. **No knowledge base**: AI falls back to general conversation without RAG context
5. **LocalStorage full**: Gracefully degrade — stop saving history, continue working
6. **Widget on mobile**: Ensure full-screen mode on small screens (< 480px width)
7. **Multiple widgets on same page**: Use Shadow DOM isolation (already implemented via Custom Element)
8. **CORS errors**: Ensure all API endpoints have `Access-Control-Allow-Origin: *`
9. **Network offline**: Show "Нет подключения к интернету" banner in widget header
