---
name: create-widget
description: Creates a customized AI chat widget for a client. Use when you need to build a chat bot widget with RAG integration, custom design, and various integrations like CRM, calendars, or payments.
---

# High-Performance AI Widget Builder

You are an expert React/Preact developer. Your goal is to create unique, high-performance UI components for an AI widget, tailored to the client's specific design needs.

## When to use this skill
- When a user asks to "create a widget" or "create a chat bot".
- When you need to build a custom AI assistant interface.
- To generate the final, optimized `script.js` for a client.

---

## Phase 0: Technical Stack Verification (MANDATORY)

Before building the widget, you MUST ensure the backend integration meets these strict requirements:

1.  **AI Model**: MUST use **Gemini 3 Fast** (for speed and cost).
2.  **RAG System**: The `/api/chat` endpoint MUST implement Retrieval-Augmented Generation to use client knowledge.
3.  **Prompt Caching**: The system prompt MUST be cached using Gemini's context caching to save tokens.
4.  **Database**: Request logs and token usage MUST be saved to MongoDB.

If these are not set up, you must configure the backend API first using the `setup-rag-backend` skill (or manually implementing it).

---

## Phase 1: Discovery (MANDATORY)

**You MUST ask ALL 20 questions below.** Do not skip any. Wait for the user to answer all of them.

### 1.1 Design & Appearance
```text
🎨 ДИЗАЙН ВИДЖЕТА

1. Какой стиль дизайна предпочитаете?
   a) 🌟 Неоновый/Cyberpunk (яркие градиенты, свечение)
   b) 🪟 Glassmorphism (размытый стеклянный эффект)
   c) ⬜ Минималистичный светлый
   d) ⬛ Минималистичный тёмный
   e) 🎯 Под стиль сайта (укажите цвета)

2. Основные цвета (HEX или название):
   - Главный цвет: ___
   - Акцентный цвет: ___
   - Цвет фона: ___

3. Где разместить кнопку чата?
   a) Справа внизу
   b) Слева внизу

4. Размер виджета:
   a) Компактный (350x450px)
   b) Средний (400x550px)
   c) Большой (450x650px)
```

### 1.2 Bot Personality
```text
🤖 ПОВЕДЕНИЕ БОТА

5. Как зовут бота? (например: "Ассистент Анна", "AI-помощник")

6. Стартовое приветствие:
   (например: "Привет! Я виртуальный помощник. Чем могу помочь?")

7. Тон общения:
   a) Формальный/деловой
   b) Дружелюбный
   c) Молодёжный/неформальный
   
8. Укажите 3-4 стартовых вопроса-подсказки:
   (например: "Какие у вас услуги?", "Как записаться?", "Часы работы")
```

### 1.3 Features
```text
📎 ФУНКЦИИ И МЕДИА

9. Нужна ли отправка файлов пользователем?
   a) Да (изображения)
   b) Да (любые файлы)
   c) Нет

10. Должен ли бот показывать изображения в ответах?
    a) Да
    b) Нет

11. Звуковые уведомления при новом сообщении?
    a) Да
    b) Нет

12. Показывать индикатор "Бот печатает..."?
    a) Да
    b) Нет

13. Сохранять историю чата между сессиями? (LocalStorage)
    **MANDATORY: YES** (Required for user experience)
```

### 1.4 Integrations
```text
🔗 ИНТЕГРАЦИИ

14. Нужна ли интеграция с CRM? (Bitrix24, AmoCRM, HubSpot, др.)
15. Интеграция с календарём? (Google Calendar, Calendly)
16. Интеграция оплаты? (Stripe, YooKassa)
17. Отправка данных на webhook/email при завершении?
```

### 1.5 Advanced AI
```text
⚙️ НАСТРОЙКИ AI

18. Максимальная длина ответа (токены)?
19. Креативность (temperature)?
20. Ограничить темы разговора?
```

---

## Phase 2: Configuration & Engineering

### Step 1: Create Client Source Directory (CRITICAL)
You MUST create a dedicated source folder for this client to preserve their unique code for future edits.

```bash
mkdir -p .agent/widget-builder/clients/<client_id>/src/components
```

### Step 2: Create Configuration
Write the config to the client's folder: `.agent/widget-builder/clients/<client_id>/widget.config.json`

### Step 3: Write Custom Component Code
**Write the React components directly into the client's folder.**

Target Files:
- `.agent/widget-builder/clients/<client_id>/src/components/Widget.jsx`
- `.agent/widget-builder/clients/<client_id>/src/components/ChatMessage.jsx`

**Instructions:**
1.  Take the default code (or previous client code).
2.  **Rewrite it** adding the specific styles (Neon/Glass) and logic (LocalStorage, etc.) required.
3.  **IMPORTANT:** Ensure `useChat.js` logic is imported accurately. If `useChat.js` is standard, you don't need to copy it, unless you customized it.

*   **LocalStorage**: Verify `localStorage` logic is present.
*   **Gemini/RAG**: Verify API calls go to `/api/chat`.

### Step 4: Run the Build Engine
Use the custom build script that injects the client's code.

```bash
node .agent/widget-builder/scripts/build.js <client_id>
```

---

## Phase 3: Delivery

### Step 5: Deploy Artifact
Copy the generated file to the public widgets folder.

```bash
mkdir -p widgets/<client_id>
cp .agent/widget-builder/dist/script.js widgets/<client_id>/script.js
```

### Step 5: Notify User
Tell the user the widget is ready and provide the installation code.

```html
<script src="https://your-domain.com/widgets/<client_id>/script.js"></script>
```
