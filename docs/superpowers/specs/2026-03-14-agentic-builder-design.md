# Agentic AI Widget Builder — Design Spec

## 1. Overview

Transform the existing chat-based widget builder into an **agentic, streaming, auto-pilot system** where users provide a URL (or pick an industry template) and the AI agent autonomously analyzes the site, generates a branded widget, populates the knowledge base, deploys it, and helps configure CRM integrations — all through a conversational interface with a context-aware right panel.

**Core UX principle:** Agentic — the AI drives the process, the user steers. The right panel shows what's relevant automatically (live preview during design, test sandbox after deploy, CRM status during integration setup). No manual navigation.

**Key decisions:**

- Variant C: "Give URL, AI does everything" with post-deploy iteration via chat
- Contextual right panel (variant B): AI controls what's shown, not user tabs
- All 8 enhancement features included

## 2. User Flow

```
1. INPUT:     User pastes URL  —or—  picks industry template
2. ANALYZE:   Agent crawls site → extracts colors, fonts, business type, content
3. DESIGN:    Agent generates 3 theme variants (A/B compare) → user picks one
4. KNOWLEDGE: Agent crawls site pages → uploads to knowledge base automatically
5. BUILD:     Agent runs build pipeline → deploys widget
6. ITERATE:   User refines via chat ("make header green", "change greeting")
7. INTEGRATE: User says "connect HubSpot" → agent guides setup via chat
8. TEST:      Right panel shows sandbox chat → user tests widget + integrations
```

Each stage updates the progress pipeline at the top. The right panel switches context automatically.

## 3. Streaming Protocol

The chat API returns Server-Sent Events (SSE) via `ReadableStream`. Each event is a JSON line:

```
data: {"type":"text","content":"..."}              // streamed text (char by char)
data: {"type":"tool_start","tool":"analyze_site","args":{...}}
data: {"type":"tool_result","tool":"analyze_site","result":{...}}
data: {"type":"theme_update","theme":{...}}        // live preview update
data: {"type":"ab_variants","variants":[...]}      // 3 design options
data: {"type":"panel_mode","mode":"live_preview"}  // switch right panel
data: {"type":"progress","stage":"design","status":"complete"}
data: {"type":"crm_instruction","provider":"hubspot","steps":[...]}
data: {"type":"done"}
```

Frontend handlers per type:

- `text` → append to current assistant message (streaming effect)
- `theme_update` → update live preview via iframe postMessage
- `panel_mode` → switch right panel context (preview / test / compare / crm)
- `progress` → update progress pipeline
- `tool_start/tool_result` → inline action indicators in chat
- `ab_variants` → show 3 widget variants in compare mode
- `crm_instruction` → render CRM setup card in chat

## 4. Backend Architecture

### 4.1 Agentic Chat API (rewrite `POST /api/builder/chat`)

The current endpoint does simple prompt→response. New version:

- Returns SSE stream instead of JSON
- Uses Gemini function calling with these tools:

```typescript
const AGENT_TOOLS = [
  {
    name: 'analyze_site',
    description: 'Crawl a website URL, extract colors, fonts, business name, type, and page content',
    parameters: { url: 'string' },
  },
  {
    name: 'generate_themes',
    description: 'Generate 3 theme.json variants based on site profile and user preferences',
    parameters: { siteProfile: 'object', preferences: 'object' },
  },
  {
    name: 'select_theme',
    description: 'Apply the selected theme variant',
    parameters: { variantIndex: 'number' },
  },
  {
    name: 'build_widget',
    description: 'Run the build pipeline: generate source files, build, deploy',
    parameters: { clientId: 'string' },
  },
  {
    name: 'crawl_knowledge',
    description: 'Crawl website pages and upload content to knowledge base',
    parameters: { url: 'string', clientId: 'string' },
  },
  {
    name: 'connect_crm',
    description: 'Validate CRM API key and activate integration',
    parameters: { provider: 'string', apiKey: 'string' },
  },
  {
    name: 'set_panel_mode',
    description: 'Switch the right panel context',
    parameters: { mode: "'live_preview' | 'test_sandbox' | 'ab_compare' | 'crm_status'" },
  },
];
```

When Gemini returns a function call, the server:

1. Streams `tool_start` event to client
2. Executes the tool server-side
3. Streams `tool_result` event to client
4. Feeds result back to Gemini for next response
5. Continues streaming text

### 4.2 Site Analyzer (`src/lib/builder/siteAnalyzer.ts`)

New module. Accepts URL, returns site profile:

```typescript
interface SiteProfile {
  url: string;
  businessName: string;
  businessType: string; // detected niche
  colors: string[]; // extracted hex colors from CSS
  fonts: string[]; // font families
  favicon?: string;
  pages: { url: string; title: string; content: string }[];
  contactInfo?: { phone?: string; email?: string; address?: string };
}
```

Implementation: uses the existing internal WebFetch pattern (fetch HTML, parse with regex/cheerio for meta tags, CSS colors, font-family declarations, nav links). Crawls up to 5 subpages for content.

### 4.3 Knowledge Crawler (`src/lib/builder/knowledgeCrawler.ts`)

New module. Crawls site pages, chunks content, uploads via existing `POST /api/knowledge` endpoint:

1. Takes SiteProfile.pages
2. Splits content into chunks (max 2000 chars each)
3. POSTs each chunk to `/api/knowledge` with clientId
4. Sets AI system prompt via `PUT /api/ai-settings/{clientId}` with niche-appropriate prompt

### 4.4 CRM Setup Handler (`src/lib/builder/crmSetup.ts`)

New module. Per-provider instructions and validation:

```typescript
interface CRMSetupConfig {
  provider: string;
  displayName: string;
  instructionSteps: string[]; // human-readable steps to get API key
  requiredScopes?: string[];
  validateKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>;
  createTestContact: (apiKey: string) => Promise<{ id: string }>;
}
```

Validation: makes a lightweight API call to the CRM to verify the key works. Creates a test contact to confirm write access. Uses existing adapter pattern from `src/lib/integrations/`.

### 4.5 New API Endpoints

| Endpoint                 | Method | Purpose                                              |
| ------------------------ | ------ | ---------------------------------------------------- |
| `/api/builder/chat`      | POST   | Rewritten: SSE streaming with agentic tool calls     |
| `/api/builder/analyze`   | POST   | Standalone site analysis (for non-streaming use)     |
| `/api/builder/test-chat` | POST   | Sandbox chat — proxies to widget's AI with test flag |
| `/api/builder/templates` | GET    | Returns industry templates list                      |

### 4.6 Updated BuilderSession Model

Add fields to existing model:

```typescript
// New fields
currentStage: {
  type: String,
  enum: ['input', 'analyzing', 'designing', 'knowledge', 'integrations', 'deployed'],
  default: 'input'
},
siteProfile: { type: Schema.Types.Mixed },          // SiteProfile object
knowledgeUploaded: { type: Boolean, default: false },
connectedIntegrations: [{
  provider: String,
  status: { type: String, enum: ['pending', 'connected', 'failed'] }
}],
abVariants: [{ label: String, themeJson: Schema.Types.Mixed }],
selectedVariant: { type: Number },
templateUsed: { type: String }
```

## 5. Frontend Components

### 5.1 BuilderPage (rewrite `src/app/dashboard/builder/page.tsx`)

Top-level layout:

- **ProgressPipeline** — fixed at top
- **BuilderChat** — left panel (flex-1)
- **ContextPanel** — right panel (w-[400px])

### 5.2 ProgressPipeline

Horizontal stepper showing: Input → Analysis → Design → Knowledge → Deploy

- Each step has icon, label, status (pending/active/complete)
- Clicking a completed step scrolls chat to that stage's messages
- Subtle animation on transitions

### 5.3 BuilderChat

Chat interface with enhancements:

- **Streaming text** — characters appear one by one
- **Voice input** — mic button using Web Speech API (reuse pattern from `useVoice.js`)
- **URL input mode** — empty state with URL field + template selector grid
- **Inline action cards** — when AI calls tools, show status cards ("Analyzing site...", "Building widget...")
- **CRM setup cards** — structured step-by-step instructions with API key input field inline
- **A/B selection** — when compare is active, user's click on a variant auto-sends selection message
- **Suggestion chips** — contextual quick actions ("Change colors", "Connect CRM", "Test widget")

### 5.4 ContextPanel

Switches between modes automatically (via `panel_mode` SSE events):

| Mode           | Content                                                 |
| -------------- | ------------------------------------------------------- |
| `empty`        | "Preview will appear here" placeholder                  |
| `live_preview` | Widget iframe, hot-reloads on theme_update events       |
| `ab_compare`   | 3 miniature widget previews with radio selection        |
| `test_sandbox` | Embedded chat with the widget + integration status logs |
| `crm_status`   | Connected integrations list + test results              |

The mode is driven by SSE events from the backend — the AI agent decides what to show based on conversation context.

### 5.5 LivePreview

Widget preview with hot-reload:

- Renders widget in iframe
- Listens for `theme_update` SSE events
- Sends updated theme to iframe via `postMessage`
- Widget iframe has a listener that applies theme changes without full reload
- Shows widget toggle button + expanded chat view

### 5.6 TestSandbox

Full test environment:

- Embedded chat that talks to the widget's AI (via `/api/builder/test-chat`)
- Integration status panel below: shows which integrations are connected, last test result
- Real-time log: "Lead created in HubSpot ✓", "Calendar event created ✓"
- Reset button to clear test data

### 5.7 ABCompare

Three widget variants side by side:

- Each shows a mini preview (scaled-down widget)
- Label below each (e.g., "Modern Blue", "Classic White", "Bold Dark")
- Radio button selection
- On select: sends auto-message to chat, panel switches to live_preview with chosen theme

### 5.8 TemplateSelector

Grid of industry templates on empty state:

- 5 templates: Dental (🦷), Restaurant (🍕), SaaS (💻), Real Estate (🏠), Beauty Salon (💅)
- Each card: emoji, label, sample color palette
- Click → starts session with template, skips site analysis
- "Or paste your website URL" input below

## 6. Industry Templates

Static data in `src/lib/builder/templates.ts`:

```typescript
interface IndustryTemplate {
  id: string;
  label: string;
  emoji: string;
  defaultColors: string[];
  defaultFont: string;
  sampleQuickReplies: string[];
  sampleKnowledge: string[]; // typical FAQs for the niche
  systemPromptHints: string; // hints for AI system prompt
}
```

5 templates at launch: dental, restaurant, saas, realestate, beauty.

When selected, AI skips `analyze_site` and uses template defaults, asking 1-2 follow-up questions (business name, color preferences).

## 7. Voice Input

Mic button in chat input area. Uses Web Speech API (same pattern as `useVoice.js` in widget hooks):

- Click to start recording, click again to stop
- Transcribed text fills the input field
- User can edit before sending
- Visual indicator: pulsing red dot while recording

## 8. Implementation Phases

### Phase 1 — Agentic Core

- Streaming chat API with SSE and Gemini function calling
- Site analyzer module
- Auto knowledge base crawler
- Progress pipeline UI component
- Context panel with live preview + test sandbox modes
- Voice input in chat
- Rewrite BuilderPage with new component architecture

### Phase 2 — Smart Features

- Industry templates (5 templates + selector UI)
- A/B compare (3 variants generation + compare panel)
- CRM setup via chat (instructions + key validation + test contact)
- Integration status logs in test sandbox

### Phase 3 — Polish

- Inline clickable cards in chat (color palettes, font selectors)
- Smooth animations between panel mode transitions
- Session save/restore with full state (stage, profile, integrations)
- Mobile-responsive builder layout

Each phase deploys independently and delivers user value. Phase 1 is the core wow-product. Phases 2-3 enhance it.

## 9. Technical Notes

- **Gemini function calling**: Use `tools` parameter in Gemini API. The model returns `functionCall` parts which the server executes, then feeds `functionResponse` back. This is natively supported.
- **SSE format**: Use `ReadableStream` with `TextEncoder`, write `data: ${JSON.stringify(event)}\n\n` for each event. Set `Content-Type: text/event-stream`.
- **Live preview hot-reload**: The widget iframe needs a `message` listener that accepts theme updates and re-renders. This requires a small addition to the widget's `script.js` template.
- **Build pipeline**: Reuse existing `generate-single-theme.js` + `build.js`. No changes needed.
- **Knowledge upload**: Reuse existing `POST /api/knowledge` and `PUT /api/ai-settings` endpoints.
- **CRM validation**: Reuse existing adapter pattern from `src/lib/integrations/`. HubSpot adapter already implemented; others follow same interface.
- **Voice input**: Client-side only (Web Speech API). No server changes. Pattern exists in `useVoice.js`.
