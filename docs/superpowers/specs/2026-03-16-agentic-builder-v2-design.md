# Agentic AI Widget Builder v2 — Design Spec

**Date**: 2026-03-16
**Status**: Approved
**Architecture**: Approach C — Single Smart Agent + Tool Registry

---

## 1. Overview

Rewrite the AI Widget Builder from a Gemini-based linear pipeline to an agentic system powered by Claude Sonnet 4.6 (via Anthropic SDK) as the orchestrator, with Gemini 3.1 Pro for design generation. The builder becomes a "living workspace" — not just a creation tool but an ongoing AI partner that proactively suggests improvements, connects any API, and writes custom code.

### Competitive Positioning

No competitor combines all five capabilities:

1. Agentic code generation (AI writes custom widget code)
2. Deep site crawling (30+ pages, auto-populate knowledge)
3. One-embed deployment (single `<script>` tag)
4. Conversational builder UX (describe what you want)
5. Open integration platform (agent web-searches API docs, writes handlers)

### Key Decisions

| Decision           | Choice                                | Rationale                                                   |
| ------------------ | ------------------------------------- | ----------------------------------------------------------- |
| Primary model      | Claude Sonnet 4.6 via Anthropic SDK   | Best code generation, native tool calling                   |
| Design model       | Gemini 3.1 Pro via Google AI SDK      | Strong at visual/design tasks, cheaper for theme generation |
| Architecture       | Single agent + tool registry          | Best UX (one conversation), extensible, proactive           |
| Integration scope  | Open platform (any API)               | Agent web-searches docs, writes handlers                    |
| UX pattern         | "Instant Magic → Proactive Workspace" | Fast initial build, then ongoing AI assistance              |
| Web search         | Brave Search API                      | Required for API doc lookup, competitor analysis            |
| Runtime chat model | Gemini Flash (existing)               | Cheapest for end-user widget conversations                  |

---

## 2. Agent Core Architecture

### Model Router

All user requests go to `POST /api/builder/chat`. Claude Sonnet 4.6 is the orchestrator. Design tasks delegate to Gemini 3.1 Pro internally via tool executors.

```
POST /api/builder/chat
  → Claude Sonnet 4.6 (Anthropic SDK, tool_use loop)
      ├── Design tools → Gemini 3.1 Pro internally
      ├── Code tools → Claude writes code itself
      └── Built-in tools → deterministic executors
```

User sees one agent. Model routing is invisible.

### Tool Registry

New file: `src/lib/builder/toolRegistry.ts`

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  parameters: JSONSchema;
  executor: (args: any, context: ToolContext) => Promise<ToolResult>;
  model_hint?: 'claude' | 'gemini';
  category: 'core' | 'integration' | 'proactive';
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition>;
  register(tool: ToolDefinition): void;
  getToolsForClaude(): AnthropicTool[];
  execute(name: string, args: any, ctx: ToolContext): Promise<ToolResult>;
  registerIntegration(provider: string, handler: string): void;
}
```

### 19 Tools

**CORE (9 tools):**

| Tool                 | Model          | Purpose                                                                                                                    |
| -------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `analyze_site`       | built-in       | Deep crawl (30+ pages via sitemap/WP API/BFS), extract colors, fonts, content, structure, business type, detected features |
| `generate_design`    | Gemini 3.1 Pro | Generate 3 theme.json variants from site profile                                                                           |
| `modify_design`      | Gemini 3.1 Pro | Targeted design tweaks ("darker header", "rounder corners")                                                                |
| `select_theme`       | built-in       | Apply chosen variant to session                                                                                            |
| `build_deploy`       | built-in       | generate-single-theme.js → build.js → copy to quickwidgets/                                                                |
| `crawl_knowledge`    | built-in       | Deep-crawl API, chunk, upload (up to 100 pages)                                                                            |
| `modify_widget_code` | Claude Sonnet  | Read current code, write modification, rebuild, deploy                                                                     |
| `rollback`           | built-in       | Restore previous version from versions/vN.js                                                                               |
| `test_widget`        | built-in       | Load widget in headless iframe, verify renders, check JS errors                                                            |

**INTEGRATION (6 tools):**

| Tool                | Model                | Purpose                                                            |
| ------------------- | -------------------- | ------------------------------------------------------------------ |
| `web_search`        | built-in (Brave API) | Search internet for API docs, tutorials, best practices            |
| `web_fetch`         | built-in             | Fetch and parse any URL, convert HTML to markdown (30K char limit) |
| `search_api_docs`   | Claude Sonnet        | Combo: web_search → web_fetch → extract structured API reference   |
| `write_integration` | Claude Sonnet        | Write server-side handler for any API (Next.js API route)          |
| `test_integration`  | built-in             | Validate API key + test call to external API                       |
| `guide_user`        | Claude Sonnet        | Generate step-by-step instructions (how to get API key, etc.)      |

**PROACTIVE (4 tools):**

| Tool                    | Model               | Purpose                                                        |
| ----------------------- | ------------------- | -------------------------------------------------------------- |
| `analyze_opportunities` | Claude Sonnet       | Analyze site profile + current widget → find improvement areas |
| `suggest_improvements`  | Claude Sonnet       | Format suggestions as interactive cards with accept/dismiss    |
| `check_knowledge_gaps`  | built-in            | Compare crawled pages vs uploaded knowledge → find gaps        |
| `analyze_competitors`   | Claude + web_search | Find competitor sites, compare their chat solutions            |

### Session State (MongoDB)

Extended `BuilderSession` schema:

```typescript
interface BuilderSession {
  // Existing fields
  _id: ObjectId;
  userId: ObjectId;
  widgetName: string;
  status: string;
  stage: BuilderStage;
  messages: Message[];
  themeJson: Record<string, unknown>;
  clientId: string;

  // New fields
  siteProfile: {
    url: string;
    pages: { url: string; title: string; content: string; crawled: boolean }[];
    totalPages: number;
    crawledPages: number;
    businessType: string;
    colors: string[];
    fonts: string[];
    contactInfo: Record<string, string>;
    detectedFeatures: string[]; // "booking_page", "pricing_page", "blog", etc.
  };

  integrations: {
    provider: string;
    status: 'suggested' | 'configuring' | 'connected' | 'failed';
    handlerPath?: string;
    apiKeyEncrypted?: string;
  }[];

  opportunities: {
    id: string;
    type: 'knowledge_gap' | 'integration' | 'design' | 'feature';
    description: string;
    status: 'pending' | 'accepted' | 'dismissed';
  }[];

  versions: {
    number: number;
    description: string;
    timestamp: Date;
    scriptPath: string;
  }[];
}
```

---

## 3. User Flow & UX

### 3-Phase Experience

**Phase 1: "30-Second Wow"** (stages: input → analysis → design → deploy)

1. User pastes URL [0s]
2. `analyze_site` — deep crawl, extract everything [2s]
3. `generate_design` (Gemini) — 3 theme variants [5s]
4. User picks variant (click or chat)
5. `select_theme` + `build_deploy` — pipeline runs [15s]
6. Widget deployed → live preview in iframe
7. `crawl_knowledge` — runs in background [20s parallel]

Total: ~45 seconds URL-to-working-widget with full knowledge base.

**Phase 2: "Proactive Intelligence"** (stage: suggestions)

After deploy, agent calls `analyze_opportunities` and presents interactive suggestion cards:

- **Knowledge gaps**: "Your pricing page has 8 plans but only 3 are in knowledge base"
- **Integration opportunities**: "Detected Calendly link on /contact — add booking to chat?"
- **Design improvements**: "Add proactive greeting after 5s?"

Cards rendered via new SSE event type `suggestions`:

```typescript
interface Suggestion {
  id: string;
  category: 'knowledge_gap' | 'integration' | 'design' | 'feature';
  title: string;
  description: string;
  actions: { label: string; action: string }[];
}
```

Clicking a suggestion action sends a chat message — agent processes normally.

**Phase 3: "Living Workspace"** (stage: workspace)

Open-ended conversation. User can:

- Change design: "Make it darker" → `modify_design` → `build_deploy`
- Add integrations: "Connect my Stripe" → `search_api_docs` → `write_integration` → `guide_user` → `test_integration`
- Improve knowledge: "Add FAQ page too" → `crawl_knowledge`
- Change behavior: "Make bot more formal" → `modify_widget_code`

### Integration Flow (any API)

1. User: "Connect my Calendly"
2. Agent: `web_search("Calendly API documentation 2026")`
3. Agent: `web_fetch(docs_url)` → parsed API reference
4. Agent: `guide_user` → step-by-step card for getting API key
5. User pastes API key
6. Agent: `test_integration` → validates key works
7. Agent: `write_integration` → Claude writes server-side handler
8. Agent: `build_deploy` → widget updated with new capability
9. Agent: "Done! Widget now has 'Book Appointment' button"

### Builder Stages (extended)

```typescript
type BuilderStage =
  | 'input'
  | 'analysis'
  | 'design'
  | 'build'
  | 'knowledge'
  | 'suggestions' // NEW
  | 'integrations'
  | 'workspace'; // NEW
```

### Context Panel Modes (extended)

```typescript
type PanelMode =
  | 'empty'
  | 'live_preview'
  | 'ab_compare'
  | 'test_sandbox'
  | 'crm_status'
  | 'site_map' // NEW: visual tree of crawled pages
  | 'knowledge_browser' // NEW: browse uploaded knowledge chunks
  | 'integration_status' // NEW: connected APIs with health
  | 'code_editor'; // NEW: read-only widget source (for devs)
```

---

## 4. Backend Implementation

### API Routes

Existing routes unchanged. New routes added:

```
src/app/api/builder/
  ├── chat/route.ts          ← REWRITE (Gemini → Claude Anthropic SDK)
  ├── build/route.ts         ← KEEP (minor updates)
  ├── sessions/route.ts      ← KEEP
  ├── templates/route.ts     ← KEEP
  ├── test-chat/route.ts     ← KEEP
  ├── search/route.ts        ← NEW (Brave Search API proxy)
  ├── fetch/route.ts         ← NEW (web fetch proxy)
  └── integrations/
       ├── route.ts           ← NEW (list/manage integrations)
       ├── test/route.ts      ← NEW (test API key)
       └── [provider]/route.ts ← NEW (dynamic integration handlers)
```

### `/api/builder/chat` — Rewrite

Replace Gemini SDK with Anthropic SDK. Tool-use loop pattern:

```typescript
import Anthropic from '@anthropic-ai/sdk';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Agent loop: send messages → get response → if tool_use, execute → loop
while (continueLoop && loopCount < MAX_TOOL_LOOPS) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: BUILDER_SYSTEM_PROMPT,
    tools: toolRegistry.getToolsForClaude(),
    messages: session.messages,
  });
  // Process text blocks → SSE stream
  // Process tool_use blocks → execute → add results → loop
}
```

### `/api/builder/search` — Web Search Proxy

Brave Search API. Free tier: 2000 queries/month, paid: $5/1000.

### Tool Executors

- `generate_design` / `modify_design`: Call Gemini 3.1 Pro internally via Google AI SDK
- `write_integration`: Claude writes the code itself (it IS Claude)
- `web_search` / `web_fetch`: HTTP calls to Brave API / direct fetch
- All existing tools (build_deploy, crawl_knowledge, etc.): Reformat from Gemini declarations to Anthropic tool format, executors stay same

### System Prompt

Instructs Claude to:

1. Follow the 3-phase workflow (analyze → build → suggest → workspace)
2. Route design tasks to generate_design/modify_design tools (Gemini handles internally)
3. Write code itself for integrations and widget modifications
4. Always web_search before writing integration handlers (never guess API endpoints)
5. Be proactive: after deploy, always call analyze_opportunities
6. Keep messages concise — users want results, not essays

### Data Flow

```
Browser → POST /api/builder/chat
  → Anthropic SDK (Claude Sonnet 4.6)
      → Tool calls → executors
          → Gemini 3.1 Pro (design only)
          → Brave Search API (web search)
          → HTTP fetch (web pages/API docs)
          → Node.js scripts (build pipeline)
          → MongoDB (session, knowledge, integrations)
      → SSE stream → Browser
          text, tool_start, tool_result, ab_variants,
          suggestions, panel_mode, progress, knowledge_progress
```

### New Files

```
src/lib/builder/toolRegistry.ts         — Tool registry + model router
src/lib/builder/anthropicAgent.ts       — Claude agent loop
src/lib/builder/webSearch.ts            — Brave Search wrapper
src/lib/builder/webFetch.ts             — URL fetch + html-to-markdown
src/lib/builder/integrationManager.ts   — Integration CRUD + encryption
src/lib/builder/opportunityAnalyzer.ts  — Proactive suggestions engine
src/lib/builder/costTracker.ts          — Token usage tracking
src/app/api/builder/search/route.ts     — Brave API proxy
src/app/api/builder/fetch/route.ts      — Web fetch proxy
src/app/api/builder/integrations/route.ts
src/app/api/builder/integrations/test/route.ts
```

### Modified Files

```
src/app/api/builder/chat/route.ts       — Full rewrite (Gemini → Claude)
src/lib/builder/agentTools.ts           — Convert to ToolRegistry format
src/lib/builder/types.ts                — Add new types
src/app/dashboard/builder/page.tsx      — Add new SSE event handlers
src/components/builder/BuilderChat.tsx   — Add suggestion cards
src/components/builder/ContextPanel.tsx  — Add new panel modes
src/components/builder/ProgressPipeline.tsx — Add new stages
```

### Environment Variables

```env
ANTHROPIC_API_KEY=sk-ant-...
BRAVE_SEARCH_API_KEY=BSA...
INTEGRATION_ENCRYPTION_KEY=...  # 32-byte hex for AES-256-GCM
```

Existing `GEMINI_API_KEY` stays for design delegation.

---

## 5. Error Handling

### 3 Levels

**Level 1: Tool-level (self-healing)**
Tool errors return TO the agent, not the user. Agent decides: retry, try alternative, or inform user.

- `build_deploy` fails → agent reads error, fixes code, retries (max 2)
- `web_fetch` timeout → agent tries alternative URL from search results
- `test_integration` 401 → agent tells user "API key invalid"

**Level 2: Agent-level (graceful degradation)**

- Max 15 tool loops per request (prevent infinite loops)
- 2-minute timeout per request
- If Anthropic API returns 529 (overloaded) → fallback to Gemini for that request

**Level 3: API-level (rate limiting)**

- `builder/chat`: 10 messages/min per user
- `builder/search`: 20 searches/min per user
- `builder/build`: 5 builds/5min per user

---

## 6. Security

### API Key Encryption

User-provided API keys (Calendly, Stripe, etc.) encrypted with AES-256-GCM before MongoDB storage. Decrypted only at runtime when integration handler needs them.

```typescript
// IntegrationKey MongoDB schema
{
  clientId: string,
  provider: string,
  encryptedKey: string,
  iv: string,
  authTag: string,
  userId: ObjectId,
  createdAt: Date
}
```

### Generated Code Validation

Before writing any agent-generated integration handler:

- Block `child_process`, `fs`, `eval`, `Function()` patterns
- Only allow `process.env.INTEGRATION_*` env var access
- Block private IP ranges and internal hostnames in web_fetch (SSRF prevention)

### Auth

All builder endpoints require authenticated session with `userId`. Existing admin token auth preserved for backward compatibility.

---

## 7. Cost Estimates

| Operation                           | Models Used                                          | Est. Cost |
| ----------------------------------- | ---------------------------------------------------- | --------- |
| Full widget creation (URL → deploy) | Claude Sonnet (~8K tokens) + Gemini Pro (~4K tokens) | ~$0.15    |
| Design modification                 | Gemini Pro (~2K tokens)                              | ~$0.03    |
| Integration connection              | Claude Sonnet (~10K tokens) + Brave Search (1 query) | ~$0.20    |
| Proactive analysis                  | Claude Sonnet (~3K tokens)                           | ~$0.06    |
| Knowledge crawl                     | Built-in (no LLM cost)                               | ~$0.00    |

Average session cost: **$0.15-0.40** depending on complexity.

Token usage tracked per session in `tokenUsage` MongoDB collection for monitoring.

---

## 8. Migration Strategy

This is a **rewrite of the agent layer**, not the build pipeline. The widget generation scripts (generate-single-theme.js, build.js) and the Preact template system remain untouched.

Key migration points:

1. `@anthropic-ai/sdk` added as dependency
2. `/api/builder/chat` route fully rewritten
3. Tool declarations converted from Gemini format to Anthropic format
4. Tool executors reused (logic unchanged, only interface adapts)
5. New SSE event types added (suggestions)
6. Frontend components updated to handle new events and stages
7. Brave Search API key provisioned

Existing `/api/generate-demo` (30-second self-service) stays on Gemini — no changes needed. Only the dashboard builder agent switches to Claude.
