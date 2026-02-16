# Configuration Reference

Exact schemas for `widget.config.json` and `info.json`. These formats are validated at runtime — incorrect formats cause widget crashes or admin panel errors.

---

## widget.config.json Schema

**Location**: `.agent/widget-builder/clients/<clientId>/widget.config.json`

This file is embedded into the widget at build time via Vite's `define` plugin. The generated `Widget.jsx` reads config values using fallback patterns that support both flat and nested formats, but **always use the flat format for new widgets**.

### Flat Format (use this for all new widgets)

```json
{
  "clientId": "example-clinic",
  "botName": "Example AI",
  "welcomeMessage": "Welcome to **Example Clinic**! How can I help you today?",
  "inputPlaceholder": "Ask a question...",
  "quickReplies": ["Book an appointment", "View services", "Contact us"],
  "avatar": {
    "type": "initials",
    "initials": "EC"
  },
  "design": {
    "position": "bottom-right"
  },
  "features": {
    "sound": true,
    "voiceInput": true,
    "feedback": true,
    "streaming": true
  }
}
```

### Field Reference

| Field                 | Type       | Required | Description                                        |
| --------------------- | ---------- | -------- | -------------------------------------------------- |
| `clientId`            | `string`   | YES      | Unique identifier, lowercase with hyphens          |
| `botName`             | `string`   | YES      | Display name in widget header                      |
| `welcomeMessage`      | `string`   | YES      | First message shown, supports **markdown**         |
| `inputPlaceholder`    | `string`   | no       | Textarea placeholder text                          |
| `quickReplies`        | `string[]` | YES      | 3-4 quick reply buttons shown before first message |
| `avatar.type`         | `string`   | no       | `"initials"` or `"icon"`                           |
| `avatar.initials`     | `string`   | no       | 2-letter initials for avatar                       |
| `design.position`     | `string`   | no       | `"bottom-right"` (default) or `"bottom-left"`      |
| `features.sound`      | `boolean`  | no       | Notification sound on AI response (default: true)  |
| `features.voiceInput` | `boolean`  | no       | Mic button for speech-to-text (default: true)      |
| `features.feedback`   | `boolean`  | no       | Thumbs up/down on messages (default: true)         |
| `features.streaming`  | `boolean`  | no       | SSE streaming for responses (default: true)        |

### How Widget.jsx Reads Config

The generated template uses fallback patterns:

```jsx
config.botName || config.bot?.name; // header title
config.welcomeMessage || config.bot?.greeting; // welcome message
config.quickReplies || config.features?.quickReplies?.starters; // quick replies
```

This means both flat format (`botName`) and legacy nested format (`bot.name`) work. **But always use flat format for new widgets** to keep things simple and consistent.

### Legacy Nested Format (DO NOT use for new widgets)

Some older production widgets use this format. It still works due to the fallback patterns above, but should NOT be used for new quick widgets:

```json
{
  "clientId": "old-client",
  "bot": {
    "name": "Old Client AI",
    "greeting": "Welcome message here",
    "tone": "professional_friendly"
  },
  "features": {
    "quickReplies": {
      "starters": ["Option 1", "Option 2", "Option 3"]
    }
  }
}
```

---

## info.json Schema

**Location**: `quickwidgets/<clientId>/info.json`

This file is read by the admin panel API to create Client records. The `readQuickWidgetInfo()` function in `widgetScanner.ts` reads it and maps fields to the `ClientInfo` interface.

### Required Format

```json
{
  "clientId": "example-clinic",
  "username": "example-clinic",
  "name": "Example Clinic",
  "email": "info@example.com",
  "website": "https://example.com",
  "phone": "+971501234567",
  "addresses": ["Dubai, UAE"],
  "instagram": null,
  "clientType": "quick",
  "createdAt": "2026-02-13T12:00:00.000Z"
}
```

### Field Reference

| Field        | Type       | Required     | Description                                                                                        |
| ------------ | ---------- | ------------ | -------------------------------------------------------------------------------------------------- |
| `clientId`   | `string`   | YES          | Must match the folder name                                                                         |
| `username`   | `string`   | **CRITICAL** | Admin panel uses this to create Client record. **Without it, admin panel crashes with 500 error.** |
| `name`       | `string`   | YES          | Human-readable brand name                                                                          |
| `email`      | `string`   | YES          | Client email (empty string `""` if unknown)                                                        |
| `website`    | `string`   | YES          | Full URL with https://                                                                             |
| `phone`      | `string`   | no           | Phone number or `null`                                                                             |
| `addresses`  | `string[]` | no           | Array of addresses or `[]`                                                                         |
| `instagram`  | `string`   | no           | Instagram handle or `null`                                                                         |
| `clientType` | `string`   | YES          | Must be `"quick"` for demo widgets                                                                 |
| `createdAt`  | `string`   | no           | ISO date string                                                                                    |

### Why `username` is Critical

The admin panel API (`/api/clients` GET handler) scans `quickwidgets/` folders and creates MongoDB Client documents. The Mongoose schema has `username: { type: String, required: true }`. If `username` is missing from info.json, Mongoose validation fails and the entire API returns a 500 error, breaking the admin panel for ALL clients.

The `readQuickWidgetInfo()` function has a fallback: `raw.username || raw.name || folderName`. But **always include `username` explicitly** — don't rely on fallbacks.

---

## Quick Replies by Business Type

| Business Type    | EN                                                | RU                                                 | UK                                                    | AR                                    |
| ---------------- | ------------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------- | ------------------------------------- |
| Dental           | Book appointment, Service prices, How to find us  | Записаться на приём, Цены на услуги, Как добраться | Записатися на прийом, Ціни на послуги, Як дістатися   | حجز موعد, أسعار الخدمات, كيفية الوصول |
| Real Estate      | Buy a property, Rent a property, Get consultation | Купить недвижимость, Аренда, Консультация          | Купити нерухомість, Оренда, Консультація              | شراء عقار, إيجار, استشارة             |
| Auto/Tuning      | Book service, Get pricing, Working hours          | Записать авто на ТО, Узнать цены, Часы работы      | Записати авто на ТО, Дізнатися ціни, Години роботи    | حجز خدمة, الأسعار, ساعات العمل        |
| Hotel            | Book a room, View rooms, Airport transfer         | Забронировать номер, Посмотреть номера, Трансфер   | Забронювати номер, Переглянути номери, Трансфер       | حجز غرفة, عرض الغرف, نقل المطار       |
| Construction     | Get a quote, Our projects, Timeline               | Рассчитать стоимость, Наши проекты, Сроки работ    | Розрахувати вартість, Наші проєкти, Терміни робіт     | احصل على عرض, مشاريعنا, الجدول الزمني |
| Photography      | View portfolio, Book a session, Pricing           | Посмотреть портфолио, Забронировать съёмку, Цены   | Переглянути портфоліо, Забронювати зйомку, Ціни       | عرض المحفظة, حجز جلسة, الأسعار        |
| Medical/Clinic   | Book appointment, Our services, Insurance         | Записаться на приём, Наши услуги, Страховка        | Записатися на прийом, Наші послуги, Страховка         | حجز موعد, خدماتنا, التأمين            |
| Snagging/Inspect | Book an inspection, View services, Get a quote    | Заказать инспекцию, Наши услуги, Получить расчёт   | Замовити інспекцію, Наші послуги, Отримати розрахунок | حجز فحص, خدماتنا, احصل على عرض سعر    |
| Generic          | About us, Our services, Contact                   | О компании, Наши услуги, Контакты                  | Про компанію, Наші послуги, Контакти                  | من نحن, خدماتنا, اتصل بنا             |

Choose quick replies that match the detected language AND business type. If the business type isn't in this table, create contextually appropriate options following the same pattern.
