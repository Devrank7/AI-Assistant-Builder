# Advanced Widget Features Reference

Read this file when implementing: proactive chat, rich messages, voice I/O, feedback, or handoff.

---

## 1. Proactive Chat (Smart Triggers)

The widget can auto-open with a contextual message based on server-configured triggers.

### How It Works

1. On mount, widget fetches triggers: `GET /api/proactive-triggers?clientId=<clientId>`
2. Response: `{ triggers: [{ triggerType, config, maxShowsPerSession, cooldownMinutes, priority }] }`
3. Widget evaluates triggers client-side and shows a notification bubble when one fires

### Trigger Types

| Type           | Config Fields   | Behavior                                      |
| -------------- | --------------- | --------------------------------------------- |
| `time_on_page` | `delayMs`       | Show after N ms on page                       |
| `scroll_depth` | `scrollPercent` | Show when user scrolls past N%                |
| `exit_intent`  | —               | Show on `mouseleave` from top of viewport     |
| `url_match`    | `urlPattern`    | Show if current URL matches pattern           |
| `inactivity`   | `delayMs`       | Show after N ms of no mouse/keyboard activity |

### Implementation

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

Config: `"features": { "proactiveChat": true }`

---

## 2. Rich Messages (Cards, Buttons, Carousels)

The AI can respond with structured rich blocks that render as interactive cards, button groups, and carousels.

### SSE Stream Format Extension

After all text tokens and `[DONE]`, the server may send:

```
data: {"rich": [{"type": "card", "title": "...", ...}, ...]}
```

### Rich Block Types

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

### Components

- **`RichCard.jsx`** — Card with optional image, title, description, CTA button
- **`ButtonGroup.jsx`** — Row of action buttons (links or quick-replies)
- **`Carousel.jsx`** — Horizontal scroll of RichCards with `snap-x`

### useChat.js SSE Parser Update

```javascript
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

Config: `"features": { "richMessages": true }`

---

## 3. Voice Input/Output

Widget supports speech-to-text input and text-to-speech output using the browser's Web Speech API.

### Voice Button (`VoiceButton.jsx`)

```jsx
const VoiceButton = ({ onResult, lang = 'ru-RU' }) => {
  const [listening, setListening] = useState(false);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

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

  if (!window.SpeechRecognition && !window.webkitSpeechRecognition) return null;

  return (
    <button onClick={startListening} className={listening ? 'voice-btn active' : 'voice-btn'}>
      <Mic size={18} />
    </button>
  );
};
```

### Text-to-Speech (TTS)

```javascript
if (config.voice?.autoSpeak && 'speechSynthesis' in window) {
  const utterance = new SpeechSynthesisUtterance(assistantMessage);
  utterance.lang = config.voice.lang || 'ru-RU';
  utterance.rate = 1.0;
  speechSynthesis.speak(utterance);
}
```

### Graceful Degradation

- Check `window.SpeechRecognition || window.webkitSpeechRecognition` before rendering mic button
- Check `'speechSynthesis' in window` before attempting TTS
- If not supported, hide voice features entirely

Config: `"features": { "voice": { "enabled": true, "autoSpeak": false, "lang": "ru-RU" } }`

---

## 4. Message Feedback

Thumbs up/down on assistant messages for satisfaction tracking.

### API

```
POST /api/feedback
Body: { clientId, sessionId, messageIndex, rating: "up"|"down" }
```

### Implementation

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

Config: `"features": { "feedback": true }`

---

## 5. Handoff to Human (Opt-in)

Allows customers to request a live human operator. Only activates when `handoffEnabled: true` in AI Settings.

### How It Works

1. Customer types a handoff keyword ("оператор", "человек", "менеджер", "human", "operator", "live agent", etc.)
2. `channelRouter` detects the keyword (only if `handoffEnabled` is true)
3. Handoff record created with status `pending`
4. Operator notified via Telegram + admin panel
5. Bot responds with "human is coming" message until admin resolves

### Handoff Keywords (Server-side, case-insensitive)

- Russian: оператор, человек, менеджер, живой человек, поговорить с человеком, соединить с оператором, позвать менеджера, нужен человек
- English: human, operator, agent, talk to human, real person, support agent, live agent

### Widget Implementation

**Handoff Button:**

```jsx
<button onClick={() => sendMessage('Соединить с оператором')}>
  <UserCheck size={16} /> Оператор
</button>
```

**Handoff State Detection in ChatMessage.jsx:**

```jsx
const isHandoffMessage =
  message.content.includes('Передаю вашу беседу оператору') ||
  message.content.includes('Ваш запрос уже передан оператору');

if (isHandoffMessage) {
  return (
    <div className="handoff-card">
      <div className="animate-pulse">🤝</div>
      <p>{message.content}</p>
    </div>
  );
}
```

### Admin API (reference only)

- `GET /api/handoff?clientId=X` — list handoffs
- `PATCH /api/handoff` — `{ handoffId, action: 'assign' | 'resolve' }`

Config: `"features": { "handoff": true }`

**IMPORTANT**: Requires admin to enable `handoffEnabled` in AI Settings for the specific client.
