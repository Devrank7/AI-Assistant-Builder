// src/lib/builder/geminiWidgetGuide.ts
// Comprehensive technical reference injected into Gemini's context for widget code generation.
// Covers: ctx object, CSS variables, component architecture, hooks, config schemas, patterns.

export const GEMINI_WIDGET_GUIDE = `
## Widget v2 Architecture Reference

The widget uses a **slot-based component architecture**. WidgetShell.jsx is the compositor that owns all hooks and state, builds a \`ctx\` object, and passes it to every child component. Components are small (15-80 lines), self-contained, and receive ALL data via \`ctx\`.

### Tech Stack
- **Preact** (h, render, useState, useEffect, useRef, useCallback, memo)
- **Tailwind CSS v3** (NOT v4) — utility classes only, NO @apply
- **Shadow DOM** — all styles injected via \`window.__WIDGET_CSS__\`
- **framer-motion** (motion, AnimatePresence) — animations
- **lucide-preact** — icons (Sparkles, X, Send, Mic, MicOff, MessageCircle, Phone, Mail, Globe, etc.)
- **react-markdown** (ReactMarkdown) — bot message rendering

---

## 1. The \`ctx\` Object (COMPLETE REFERENCE)

Every component receives \`{ ctx }\` as its only prop. WidgetShell builds ctx from hooks and local state.

### Config & Identity
| Field | Type | Description |
|-------|------|-------------|
| config | object | Full widget.config.json (clientId, botName, welcomeMessage, quickReplies, features, contacts, design, avatar) |
| config.clientId | string | Unique client identifier |
| config.botName | string | Display name of the bot |
| config.welcomeMessage | string | First message shown (supports markdown) |
| config.quickReplies | string[] | Quick reply button labels |
| config.features | object | Feature flags (sound, voiceInput, feedback, streaming, tts, autoLang, richCards, leadForm, memory, proactive) |
| config.features.proactive | {delay: number, message: string} | Proactive nudge settings |
| config.contacts | {phone?, email?, website?} | Contact bar links |
| config.design | {position: 'bottom-right'|'bottom-left'} | Widget position |
| contacts | object | Shortcut for config.contacts |

### Widget State
| Field | Type | Description |
|-------|------|-------------|
| isOpen | boolean | Whether chat panel is open |
| setIsOpen | (v: boolean) => void | Toggle chat panel |
| isMobile | boolean | Screen width < 640px |
| isOffline | boolean | API unreachable |

### Chat (from useChat hook)
| Field | Type | Description |
|-------|------|-------------|
| messages | Array<{role, content, timestamp, isError, imageUrl, richBlocks, suggestions}> | Chat history |
| sendMessage | (text, history?, image?) => void | Send message to API |
| isLoading | boolean | API request in flight |
| isTyping | boolean | Streaming response active |
| retryLastMessage | () => void | Resend last user message |
| clearMessages | () => void | Clear chat & reset session |
| sessionId | string | Current session ID |
| isReturningUser | boolean | Has previous sessions |

### Input State
| Field | Type | Description |
|-------|------|-------------|
| inputValue | string | Current input text |
| setInputValue | (v: string) => void | Update input text |
| selectedImage | {file, previewUrl} | Selected image for upload |
| setSelectedImage | (v) => void | Set selected image |
| expandedImage | string|null | URL of fullscreen image |
| setExpandedImage | (v) => void | Set fullscreen image |

### Refs
| Field | Type | Description |
|-------|------|-------------|
| messagesEndRef | Ref | Scroll anchor at bottom of messages |
| inputRef | Ref | Textarea input element |
| fileInputRef | Ref | Hidden file input element |
| chatContainerRef | Ref | Messages scroll container |
| menuRef | Ref | Settings dropdown container |

### Typewriter Welcome
| Field | Type | Description |
|-------|------|-------------|
| typewriterText | string | Animated welcome text (builds character by character) |
| typewriterDone | boolean | Animation complete |
| welcomeMsg | string | Full welcome message (truncated to 180 chars) |

### Scroll State
| Field | Type | Description |
|-------|------|-------------|
| isAtBottom | boolean | User scrolled to bottom |
| hasNewMessages | boolean | New messages while scrolled up |

### Context Banner
| Field | Type | Description |
|-------|------|-------------|
| contextDismissed | boolean | Banner dismissed by user |
| setContextDismissed | (v: boolean) => void | Dismiss banner |
| pageTitle | string | Current page title (extracted from document.title) |

### Menu & Settings
| Field | Type | Description |
|-------|------|-------------|
| showMenu | boolean | Settings dropdown visible |
| setShowMenu | (v: boolean) => void | Toggle dropdown |
| isMuted | boolean | Sound notifications muted |
| chatFontSize | 'sm'|'md'|'lg' | Chat text size preference |

### Language (from useLanguage hook)
| Field | Type | Description |
|-------|------|-------------|
| uiStrings | object | Localized UI text (placeholder, online, typing, today, yesterday, newChat, mute, unmute, fontSize, exportChat, call, website, contextBanner, isTyping, newMessages, respondsInstantly, offline) |
| lang | string | Current language code ('en', 'ru', 'uk', 'ar') |
| detectLang | (text: string) => void | Auto-detect language from text |
| voiceLocale | string | BCP 47 locale for speech API ('en-US', 'ru-RU', etc.) |

### TTS (from useTTS hook)
| Field | Type | Description |
|-------|------|-------------|
| speak | (text, lang, idx) => void | Play text-to-speech |
| speakingIdx | number|null | Index of speaking message (-1 = welcome) |
| ttsSupported | boolean | TTS available (always true) |

### Proactive Nudge (from useProactive hook)
| Field | Type | Description |
|-------|------|-------------|
| showNudge | boolean | Show nudge bubble |
| nudgeMessage | string | Nudge text |
| unreadCount | number | Unread badge count (0 or 1) |
| dismissNudge | () => void | Hide nudge for 30s |

### Drag (from useDrag hook)
| Field | Type | Description |
|-------|------|-------------|
| isDragging | boolean | User dragging toggle button |
| onPointerDown | (e) => void | Drag start handler |
| onPointerMove | (e) => void | Drag move handler |
| onPointerUp | (e) => void | Drag end handler |
| resetPosition | () => void | Reset to origin |
| dragStyle | object | {transform: \`translate(\${x}px, \${y}px)\`} |

### Voice (from useVoice hook)
| Field | Type | Description |
|-------|------|-------------|
| isListening | boolean | Microphone active |
| voiceSupported | boolean | Web Speech API available |
| handleVoiceToggle | () => void | Start/stop voice recording |

### Swipe (mobile bottom sheet)
| Field | Type | Description |
|-------|------|-------------|
| handleSwipeStart | (e) => void | Touch start handler |
| handleSwipeMove | (e) => void | Touch move handler |
| handleSwipeEnd | () => void | Touch end handler |

### Actions
| Field | Type | Description |
|-------|------|-------------|
| scrollToBottom | () => void | Smooth scroll to bottom |
| handleChatScroll | () => void | Scroll position tracker |
| toggleMute | () => void | Toggle sound notifications |
| cycleFontSize | () => void | Cycle sm → md → lg |
| exportChat | () => void | Download chat as .txt |
| handleImageSelect | (e) => void | File input onChange handler |
| removeSelectedImage | () => void | Clear selected image |
| handleSubmit | (e) => void | Form submit (send message) |
| handleRichAction | (urlOrType, label) => void | Handle rich block button clicks |
| handleKeyDown | (e) => void | Enter to send, Shift+Enter newline |

### Computed Values
| Field | Type | Description |
|-------|------|-------------|
| showQuickReplies | boolean | True when user has sent 0 messages |
| getDayLabel | (timestamp) => string | "Today", "Yesterday", or "Mar 5" |
| getTimeLabel | (timestamp) => string | "14:30" format |
| shouldShowSeparator | (idx) => boolean | True when day changes between messages |

---

## 2. CSS Variable Reference (Tailwind Classes)

ALL colors use CSS custom properties. NEVER use hardcoded hex values in components.

### Surface & Background
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| bg-aw-surface-bg | --aw-surface-bg | Main widget background |
| bg-aw-surface-card | --aw-surface-card | Card/bubble/menu background |
| border-aw-surface-border | --aw-surface-border | All borders |
| bg-aw-surface-input | --aw-surface-input | Input field background |
| bg-aw-surface-input-focus | --aw-surface-input-focus | Input focus background |

### Text
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| text-aw-text-primary | --aw-text-primary | Main text |
| text-aw-text-secondary | --aw-text-secondary | Secondary/placeholder text |
| text-aw-text-muted | --aw-text-muted | Muted/disabled text |

### Header Gradient (use in style={})
| CSS Variable | Purpose |
|-------------|---------|
| --aw-header-from | Gradient start |
| --aw-header-via | Gradient middle |
| --aw-header-to | Gradient end |
Usage: \`className="bg-gradient-to-br from-aw-header-from via-aw-header-via to-aw-header-to"\`

### Toggle Button
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| from-aw-toggle-from | --aw-toggle-from | Gradient start |
| via-aw-toggle-via | --aw-toggle-via | Gradient middle |
| to-aw-toggle-to | --aw-toggle-to | Gradient end |
| shadow-aw-toggle-shadow | --aw-toggle-shadow | Box shadow color |

### Send Button
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| bg-aw-send | --aw-send-from | Send button background |
| bg-aw-send-hover | --aw-send-hover | Send hover state |

### User Messages
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| from-aw-user-msg-from | --aw-user-msg-from | User bubble gradient start |
| to-aw-user-msg-to | --aw-user-msg-to | User bubble gradient end |
| shadow-aw-user-msg-shadow | --aw-user-msg-shadow | User bubble shadow |

### Avatar
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| from-aw-avatar-from | --aw-avatar-from | Avatar gradient start |
| to-aw-avatar-to | --aw-avatar-to | Avatar gradient end |
| border-aw-avatar-border | --aw-avatar-border | Avatar border |
| text-aw-avatar-icon | --aw-avatar-icon | Avatar icon color |

### Quick Reply Chips
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| border-aw-chip-border | --aw-chip-border | Chip border |
| from-aw-chip-from | --aw-chip-from | Chip gradient start |
| to-aw-chip-to | --aw-chip-to | Chip gradient end |
| text-aw-chip-text | --aw-chip-text | Chip text |
| from-aw-chip-hover-from | --aw-chip-hover-from | Chip hover gradient start |
| to-aw-chip-hover-to | --aw-chip-hover-to | Chip hover gradient end |
| border-aw-chip-hover-border | --aw-chip-hover-border | Chip hover border |

### Links & Interactive
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| text-aw-link | --aw-link | Link color |
| text-aw-link-hover | --aw-link-hover | Link hover |
| text-aw-copy-hover | --aw-copy-hover | Copy button hover |
| text-aw-copy-active | --aw-copy-active | Copy button active |

### Focus
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| border-aw-focus-border | --aw-focus-border | Focus border |
| ring-aw-focus-ring | --aw-focus-ring | Focus ring |

### Image Upload Button
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| border-aw-img-active-border | --aw-img-active-border | Active state border |
| bg-aw-img-active-bg | --aw-img-active-bg | Active state bg |
| text-aw-img-active-text | --aw-img-active-text | Active state text |
| text-aw-img-hover-text | --aw-img-hover-text | Hover text |
| border-aw-img-hover-border | --aw-img-hover-border | Hover border |
| bg-aw-img-hover-bg | --aw-img-hover-bg | Hover bg |

### Feedback & Status
| Tailwind Class | CSS Variable | Purpose |
|---------------|-------------|---------|
| text-aw-feedback-active | --aw-feedback-active | Active feedback |
| text-aw-feedback-hover | --aw-feedback-hover | Feedback hover |
| bg-aw-online-dot | --aw-online-dot | Online indicator |
| border-aw-online-dot-border | --aw-online-dot-border | Online dot border |

---

## 3. Component Architecture

### Slot System
WidgetShell renders components into 4 slots based on widget.structure.json:

| Slot | Position | Components |
|------|----------|-----------|
| panel-top | Top of chat panel | Header, ContactBar, ContextBanner |
| panel-body | Scrollable middle | MessageList |
| panel-footer | Bottom of panel | ImagePreview, InputArea, PoweredBy |
| external | Outside panel | ToggleButton, NudgeBubble |

### Component Map

| ID | File | Slot | Lines | Purpose |
|----|------|------|-------|---------|
| header | Header.jsx | panel-top | ~65 | Gradient header, bot name, online status, settings menu |
| contactBar | ContactBar.jsx | panel-top | ~27 | Phone/email/website links |
| contextBanner | ContextBanner.jsx | panel-top | ~18 | "I see you're on: [page]" banner |
| messageList | MessageList.jsx | panel-body | ~80 | Messages, typing indicator, day separators, suggestions |
| imagePreview | ImagePreview.jsx | panel-footer | ~21 | Selected image thumbnail before sending |
| inputArea | InputArea.jsx | panel-footer | ~40 | Text input, send, voice, image upload, quick replies |
| poweredBy | PoweredBy.jsx | panel-footer | ~11 | "Powered by WinBix AI" footer |
| toggleButton | ToggleButton.jsx | external | ~45 | FAB button with drag, pulse, unread badge |
| nudgeBubble | NudgeBubble.jsx | external | ~27 | Proactive message popup |

### Shared Sub-Components (imported by other components, not in structure.json)
| File | Used By | Purpose |
|------|---------|---------|
| ChatMessage.jsx | MessageList | Single message bubble (bot or user) |
| QuickReplies.jsx | InputArea | Quick reply chip buttons |
| MessageFeedback.jsx | MessageList | Thumbs up/down per bot message |
| RichBlocks.jsx | MessageList | Rich cards, forms, buttons from AI |

---

## 4. widget.structure.json Schema

\`\`\`json
{
  "version": 1,
  "layout": { "position": "bottom-right", "mobileMode": "bottom-sheet" },
  "components": [
    { "id": "header", "file": "Header.jsx", "slot": "panel-top", "enabled": true, "props": {} },
    { "id": "contactBar", "file": "ContactBar.jsx", "slot": "panel-top", "enabled": true, "props": {} },
    { "id": "contextBanner", "file": "ContextBanner.jsx", "slot": "panel-top", "enabled": true, "props": {} },
    { "id": "messageList", "file": "MessageList.jsx", "slot": "panel-body", "enabled": true, "props": {} },
    { "id": "imagePreview", "file": "ImagePreview.jsx", "slot": "panel-footer", "enabled": true, "props": {} },
    { "id": "inputArea", "file": "InputArea.jsx", "slot": "panel-footer", "enabled": true, "props": { "voiceInput": true, "imageUpload": true } },
    { "id": "poweredBy", "file": "PoweredBy.jsx", "slot": "panel-footer", "enabled": true, "props": {} },
    { "id": "toggleButton", "file": "ToggleButton.jsx", "slot": "external", "enabled": true, "props": {} },
    { "id": "nudgeBubble", "file": "NudgeBubble.jsx", "slot": "external", "enabled": true, "props": {} }
  ],
  "customComponents": []
}
\`\`\`

- \`enabled: false\` hides a component (deterministic, no AI needed)
- \`props\` are merged into ctx: \`<Comp ctx={{ ...ctx, ...comp.props }} />\`
- \`customComponents\` holds AI-generated components added via add_component tool
- Component render order follows array order within each slot

---

## 5. widget.config.json Schema

\`\`\`json
{
  "clientId": "string",
  "botName": "string",
  "welcomeMessage": "string (supports markdown)",
  "inputPlaceholder": "string",
  "quickReplies": ["string", "string", "string"],
  "avatar": { "type": "initials"|"image", "initials": "AB", "imageUrl": "url" },
  "design": { "position": "bottom-right"|"bottom-left" },
  "features": {
    "sound": true,
    "voiceInput": true,
    "feedback": true,
    "streaming": true,
    "tts": true,
    "autoLang": true,
    "richCards": true,
    "leadForm": true,
    "memory": true,
    "proactive": { "delay": 8, "message": "string" }
  },
  "contacts": { "phone": "string", "email": "string", "website": "url" }
}
\`\`\`

---

## 6. Component Patterns

### Standard Component Template
Every v2 component follows this exact pattern:

\`\`\`jsx
import { IconName } from 'lucide-preact';

export default function MyComponent({ ctx }) {
    // Destructure ONLY what you need from ctx
    const { config, messages, sendMessage, uiStrings } = ctx;

    // Early return if not applicable
    if (!someCondition) return null;

    return (
        <div className="px-4 py-2 bg-aw-surface-bg text-aw-text-primary border-b border-aw-surface-border">
            {/* Use aw-* Tailwind classes for ALL colors */}
            <p className="text-[13px] text-aw-text-secondary">{uiStrings.someString}</p>
        </div>
    );
}
\`\`\`

### Rules for Writing Components
1. **Destructure ctx** — only extract the fields you need
2. **Use aw-* classes** — NEVER hardcode hex colors. Use bg-aw-surface-card, text-aw-text-primary, etc.
3. **Use lucide-preact icons** — import from 'lucide-preact' (Sparkles, X, Send, Mic, etc.)
4. **Tailwind v3 only** — no @apply, no v4 syntax, no CSS modules
5. **Keep it small** — 50-80 lines max. If larger, split into sub-components
6. **No hook imports** — components do NOT import hooks. All hook data comes through ctx
7. **No state management** — components should be mostly presentational. Complex state belongs in WidgetShell
8. **Export default** — always \`export default function ComponentName({ ctx })\`
9. **Animations** — use framer-motion (motion, AnimatePresence) for enter/exit animations
10. **Responsive** — check ctx.isMobile for mobile-specific layouts

### Color Class Quick Reference
- Background: \`bg-aw-surface-bg\`, \`bg-aw-surface-card\`, \`bg-aw-surface-input\`
- Text: \`text-aw-text-primary\`, \`text-aw-text-secondary\`, \`text-aw-text-muted\`
- Border: \`border-aw-surface-border\`
- Gradient header: \`from-aw-header-from via-aw-header-via to-aw-header-to\`
- Gradient toggle: \`from-aw-toggle-from via-aw-toggle-via to-aw-toggle-to\`
- User message: \`from-aw-user-msg-from to-aw-user-msg-to\`
- Send button: \`bg-aw-send hover:bg-aw-send-hover\`
- Avatar: \`from-aw-avatar-from to-aw-avatar-to border-aw-avatar-border text-aw-avatar-icon\`
- Links: \`text-aw-link hover:text-aw-link-hover\`
- Focus: \`focus:border-aw-focus-border focus:ring-aw-focus-ring\`

### Adding a Custom Component
When creating a new component via add_component:
1. Create the .jsx file in components/ directory
2. Add entry to widget.structure.json customComponents array
3. Component receives ctx with all fields listed above
4. Place in appropriate slot (panel-top, panel-body, panel-footer, external)

---

## 7. Hook API Reference

### useChat(config)
\`\`\`
Parameters: config (widget.config.json object)
Returns: { messages, sendMessage, isLoading, isTyping, isOffline, retryLastMessage, clearMessages, sessionId, isReturningUser }

messages[].role: 'user' | 'assistant'
messages[].content: string (markdown)
messages[].timestamp: ISO string
messages[].isError: boolean
messages[].imageUrl: string (uploaded image URL)
messages[].richBlocks: Array<{type, ...}> (rich cards from AI)
messages[].suggestions: string[] (follow-up suggestions)

sendMessage(text: string, history?: array, image?: File)
\`\`\`

### useVoice(voiceLocale)
\`\`\`
Parameters: voiceLocale (BCP 47 string, e.g. 'en-US')
Returns: { isListening, isSupported, transcript, startListening, stopListening }

startListening(onResult: (finalText: string) => void)
\`\`\`

### useDrag(clientId)
\`\`\`
Parameters: clientId (string, for localStorage key)
Returns: { offset, isDragging, onPointerDown, onPointerMove, onPointerUp, resetPosition, dragStyle }

dragStyle: { transform: \`translate(\${x}px, \${y}px)\` }
\`\`\`

### useProactive(config, isOpen)
\`\`\`
Parameters: config (widget.config.json), isOpen (boolean)
Returns: { showNudge, nudgeMessage, unreadCount, dismissNudge }

Nudge appears after config.features.proactive.delay seconds when widget is closed.
dismissNudge() hides it for 30 seconds.
\`\`\`

### useLanguage(clientId)
\`\`\`
Parameters: clientId (string)
Returns: { lang, detect, ui, voiceLocale }

Supported languages: en, ru, uk, ar
ui object keys: placeholder, online, typing, today, yesterday, newChat, mute, unmute, fontSize, exportChat, call, website, contextBanner, isTyping, newMessages, respondsInstantly, offline
\`\`\`

### useTTS()
\`\`\`
Returns: { speak, stop, speakingIdx, isSupported }

speak(text: string, lang: string, messageIndex: number)
- Uses server TTS API first, falls back to browser Web Speech Synthesis
- messageIndex -1 = welcome message
\`\`\`

---

## 8. Available Icons (lucide-preact)

Already bundled: Sparkles, X, Send, Mic, MicOff, MessageCircle, Phone, Mail, Globe, ImagePlus, Copy, Check, RotateCcw, ZoomIn, User, Volume2, VolumeX, MoreVertical, Trash2, Type, Download, ChevronDown, ArrowDown

To use: \`import { IconName } from 'lucide-preact';\` then \`<IconName size={16} />\`

---

## 9. Critical Rules

1. **NEVER hardcode colors** — always use aw-* Tailwind classes
2. **NEVER import hooks** — all hook data is in ctx
3. **NEVER modify WidgetShell.jsx** — it's the compositor, not content
4. **NEVER modify hooks/** — hooks are shared and protected
5. **NEVER use Tailwind v4 syntax** — widget uses v3
6. **NEVER use inline styles for colors** — exception: gradients that need CSS var() in style={}
7. **ALWAYS export default function** — named export for the component
8. **ALWAYS destructure ctx** — extract only what you need
9. **ALWAYS keep components under 80 lines** — split if larger
10. **ALWAYS use existing CSS variable classes** — check the reference above before inventing new ones
`;
