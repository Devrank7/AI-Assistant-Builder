# Agentic AI Widget Builder Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the widget builder into an agentic, streaming system where users provide a URL and the AI autonomously creates, deploys, and iterates on a branded widget with CRM integrations.

**Architecture:** SSE-based streaming chat API with Gemini function calling. Backend tool modules (site analyzer, knowledge crawler, CRM setup) execute server-side and stream results. React frontend with context-aware right panel driven by SSE events. Three-phase delivery: agentic core → smart features → polish.

**Tech Stack:** Next.js 15 (App Router), TypeScript, Tailwind CSS v4, MongoDB/Mongoose, Google Gemini API (`@google/generative-ai`), Server-Sent Events (ReadableStream), Vitest

**Spec:** `docs/superpowers/specs/2026-03-14-agentic-builder-design.md`

---

## File Structure

### New Files

| File                                          | Responsibility                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/lib/builder/types.ts`                    | Shared TypeScript types: SiteProfile, SSE event types, panel modes, stage enum |
| `src/lib/builder/sseUtils.ts`                 | SSE stream helpers: createSSEStream(), writeEvent(), error handling            |
| `src/lib/builder/siteAnalyzer.ts`             | Crawl URL → extract colors, fonts, business info, page content                 |
| `src/lib/builder/knowledgeCrawler.ts`         | Chunk SiteProfile.pages → upload to knowledge base                             |
| `src/lib/builder/crmSetup.ts`                 | CRM provider instructions, API key validation, test contact                    |
| `src/lib/builder/templates.ts`                | 5 industry templates with default themes and knowledge                         |
| `src/lib/builder/agentTools.ts`               | Gemini function calling tool definitions + server-side executors               |
| `src/app/api/builder/test-chat/route.ts`      | Sandbox test chat proxy endpoint                                               |
| `src/app/api/builder/templates/route.ts`      | GET industry templates list                                                    |
| `src/components/builder/ProgressPipeline.tsx` | Horizontal progress stepper component                                          |
| `src/components/builder/BuilderChat.tsx`      | Chat panel with streaming, voice, inline cards                                 |
| `src/components/builder/ContextPanel.tsx`     | Right panel that switches modes via SSE                                        |
| `src/components/builder/LivePreview.tsx`      | Widget iframe with hot-reload via postMessage                                  |
| `src/components/builder/TestSandbox.tsx`      | Embedded test chat + integration status                                        |
| `src/components/builder/ABCompare.tsx`        | 3-variant side-by-side comparison                                              |
| `src/components/builder/TemplateSelector.tsx` | Industry template grid selector                                                |
| `src/components/builder/useBuilderStream.ts`  | Custom hook: SSE connection, event parsing, state management                   |
| `src/components/builder/useVoiceInput.ts`     | Voice input hook for builder chat (Web Speech API)                             |
| `src/test/builder-types.test.ts`              | Type validation tests                                                          |
| `src/test/builder-sseUtils.test.ts`           | SSE utility tests                                                              |
| `src/test/builder-siteAnalyzer.test.ts`       | Site analyzer tests                                                            |
| `src/test/builder-knowledgeCrawler.test.ts`   | Knowledge crawler tests                                                        |
| `src/test/builder-crmSetup.test.ts`           | CRM setup handler tests                                                        |
| `src/test/builder-templates.test.ts`          | Templates data tests                                                           |
| `src/test/builder-agentTools.test.ts`         | Agent tool executor tests                                                      |

### Modified Files

| File                                                      | Changes                                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `src/models/BuilderSession.ts`                            | Add currentStage, siteProfile, knowledgeUploaded, connectedIntegrations, abVariants, selectedVariant, templateUsed fields |
| `src/app/api/builder/chat/route.ts`                       | Full rewrite: SSE streaming with Gemini function calling                                                                  |
| `src/app/dashboard/builder/page.tsx`                      | Full rewrite: ProgressPipeline + BuilderChat + ContextPanel layout                                                        |
| `.claude/widget-builder/scripts/generate-single-theme.js` | Add postMessage listener to Widget.jsx template for live preview hot-reload                                               |

---

## Chunk 1: Foundation — Types, SSE Utils, Model Update, Stream Hook

### Task 1: Shared Types (`src/lib/builder/types.ts`)

**Files:**

- Create: `src/lib/builder/types.ts`
- Test: `src/test/builder-types.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// src/test/builder-types.test.ts
import { describe, it, expect } from 'vitest';
import type { SiteProfile, SSEEvent, BuilderStage, PanelMode, AgentToolName } from '@/lib/builder/types';
import { BUILDER_STAGES, PANEL_MODES, AGENT_TOOL_NAMES } from '@/lib/builder/types';

describe('Builder Types', () => {
  it('should export all builder stages', () => {
    expect(BUILDER_STAGES).toEqual(['input', 'analysis', 'design', 'knowledge', 'deploy', 'integrations']);
  });

  it('should export all panel modes', () => {
    expect(PANEL_MODES).toEqual(['empty', 'live_preview', 'test_sandbox', 'ab_compare', 'crm_status']);
  });

  it('should export all agent tool names', () => {
    expect(AGENT_TOOL_NAMES).toContain('analyze_site');
    expect(AGENT_TOOL_NAMES).toContain('generate_themes');
    expect(AGENT_TOOL_NAMES).toContain('build_widget');
    expect(AGENT_TOOL_NAMES).toContain('crawl_knowledge');
    expect(AGENT_TOOL_NAMES).toContain('connect_crm');
    expect(AGENT_TOOL_NAMES).toContain('set_panel_mode');
    expect(AGENT_TOOL_NAMES).toContain('select_theme');
    expect(AGENT_TOOL_NAMES.length).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-types.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the types module**

```typescript
// src/lib/builder/types.ts

// --- Stage & Mode constants ---

export const BUILDER_STAGES = ['input', 'analysis', 'design', 'knowledge', 'deploy', 'integrations'] as const;
export type BuilderStage = (typeof BUILDER_STAGES)[number];

export const PANEL_MODES = ['empty', 'live_preview', 'test_sandbox', 'ab_compare', 'crm_status'] as const;
export type PanelMode = (typeof PANEL_MODES)[number];

export const AGENT_TOOL_NAMES = [
  'analyze_site',
  'generate_themes',
  'select_theme',
  'build_widget',
  'crawl_knowledge',
  'connect_crm',
  'set_panel_mode',
] as const;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

// --- Site Profile ---

export interface SiteProfile {
  url: string;
  businessName: string;
  businessType: string;
  colors: string[];
  fonts: string[];
  favicon?: string;
  pages: { url: string; title: string; content: string }[];
  contactInfo?: { phone?: string; email?: string; address?: string };
}

// --- SSE Event Types ---

export type SSEEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; tool: AgentToolName; args: Record<string, unknown> }
  | { type: 'tool_result'; tool: AgentToolName; result: Record<string, unknown> }
  | { type: 'theme_update'; theme: Record<string, unknown> }
  | { type: 'ab_variants'; variants: { label: string; theme: Record<string, unknown> }[] }
  | { type: 'panel_mode'; mode: PanelMode }
  | { type: 'progress'; stage: BuilderStage; status: 'active' | 'complete' }
  | { type: 'crm_instruction'; provider: string; steps: string[] }
  | { type: 'error'; message: string; recoverable: boolean }
  | { type: 'knowledge_progress'; uploaded: number; total: number }
  | { type: 'session'; sessionId: string }
  | { type: 'done' };

// --- CRM Setup ---

export interface CRMSetupConfig {
  provider: string;
  displayName: string;
  instructionSteps: string[];
  requiredScopes?: string[];
  validateKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>;
  createTestContact: (apiKey: string) => Promise<{ id: string }>;
}

// --- Industry Template ---

export interface IndustryTemplate {
  id: string;
  label: string;
  emoji: string;
  defaultColors: string[];
  defaultFont: string;
  sampleQuickReplies: string[];
  sampleKnowledge: string[];
  systemPromptHints: string;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/types.ts src/test/builder-types.test.ts
git commit -m "feat(builder): add shared types for agentic builder"
```

---

### Task 2: SSE Utilities (`src/lib/builder/sseUtils.ts`)

**Files:**

- Create: `src/lib/builder/sseUtils.ts`
- Test: `src/test/builder-sseUtils.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// src/test/builder-sseUtils.test.ts
import { describe, it, expect } from 'vitest';
import { formatSSEEvent, createSSEHeaders } from '@/lib/builder/sseUtils';

describe('SSE Utils', () => {
  it('should format an SSE event as data line', () => {
    const event = { type: 'text', content: 'hello' };
    const formatted = formatSSEEvent(event);
    expect(formatted).toBe('data: {"type":"text","content":"hello"}\n\n');
  });

  it('should format a done event', () => {
    const formatted = formatSSEEvent({ type: 'done' });
    expect(formatted).toBe('data: {"type":"done"}\n\n');
  });

  it('should return correct SSE headers', () => {
    const headers = createSSEHeaders();
    expect(headers['Content-Type']).toBe('text/event-stream');
    expect(headers['Cache-Control']).toBe('no-cache');
    expect(headers['Connection']).toBe('keep-alive');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-sseUtils.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the SSE utils module**

```typescript
// src/lib/builder/sseUtils.ts
import type { SSEEvent } from './types';

export function formatSSEEvent(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export function createSSEHeaders(): Record<string, string> {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  };
}

export function createSSEStream(
  handler: (write: (event: SSEEvent) => void) => Promise<void>
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const write = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(formatSSEEvent(event)));
      };

      try {
        await handler(write);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        write({ type: 'error', message, recoverable: false });
      } finally {
        write({ type: 'done' });
        controller.close();
      }
    },
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-sseUtils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/sseUtils.ts src/test/builder-sseUtils.test.ts
git commit -m "feat(builder): add SSE streaming utilities"
```

---

### Task 3: Update BuilderSession Model

**Files:**

- Modify: `src/models/BuilderSession.ts`

- [ ] **Step 1: Add new fields to the BuilderSession schema and interface**

Add these fields to `IBuilderSession` interface:

```typescript
currentStage: 'input' | 'analysis' | 'design' | 'knowledge' | 'deploy' | 'integrations';
siteProfile: Record<string, unknown> | null;
knowledgeUploaded: boolean;
connectedIntegrations: {
  provider: string;
  status: 'pending' | 'connected' | 'failed';
}
[];
abVariants: {
  label: string;
  themeJson: Record<string, unknown>;
}
[];
selectedVariant: number | null;
templateUsed: string | null;
```

Add these to the Mongoose schema:

```typescript
currentStage: {
  type: String,
  enum: ['input', 'analysis', 'design', 'knowledge', 'deploy', 'integrations'],
  default: 'input',
},
siteProfile: { type: Schema.Types.Mixed, default: null },
knowledgeUploaded: { type: Boolean, default: false },
connectedIntegrations: [{
  provider: String,
  status: { type: String, enum: ['pending', 'connected', 'failed'] },
}],
abVariants: [{ label: String, themeJson: Schema.Types.Mixed }],
selectedVariant: { type: Number, default: null },
templateUsed: { type: String, default: null },
```

Update the `BuilderStatus` type to add `'building'` stages — keep existing values, add `'streaming'` for active SSE:

```typescript
export type BuilderStatus = 'chatting' | 'streaming' | 'building' | 'preview' | 'deployed';
```

- [ ] **Step 2: Verify existing tests still pass**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run`
Expected: All existing tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/models/BuilderSession.ts
git commit -m "feat(builder): extend BuilderSession model with agentic fields"
```

---

### Task 4: Frontend SSE Stream Hook (`src/components/builder/useBuilderStream.ts`)

**Files:**

- Create: `src/components/builder/useBuilderStream.ts`

This is a React hook. No unit test — it will be tested via component integration.

- [ ] **Step 1: Write the SSE stream hook**

```typescript
// src/components/builder/useBuilderStream.ts
'use client';

import { useState, useCallback, useRef } from 'react';
import type { SSEEvent, BuilderStage, PanelMode } from '@/lib/builder/types';

interface BuilderMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCards?: { tool: string; status: 'running' | 'done' | 'error'; result?: Record<string, unknown> }[];
  crmInstruction?: { provider: string; steps: string[] };
}

interface StreamState {
  messages: BuilderMessage[];
  sessionId: string | null;
  stage: BuilderStage;
  panelMode: PanelMode;
  isStreaming: boolean;
  currentTheme: Record<string, unknown> | null;
  abVariants: { label: string; theme: Record<string, unknown> }[] | null;
  knowledgeProgress: { uploaded: number; total: number } | null;
  error: string | null;
}

export function useBuilderStream() {
  const [state, setState] = useState<StreamState>({
    messages: [],
    sessionId: null,
    stage: 'input',
    panelMode: 'empty',
    isStreaming: false,
    currentTheme: null,
    abVariants: null,
    knowledgeProgress: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string, sessionId?: string | null) => {
      // Add user message
      const userMsg: BuilderMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, userMsg],
        isStreaming: true,
        error: null,
      }));

      // Create assistant message placeholder
      const assistantMsg: BuilderMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        toolCards: [],
      };

      setState((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
      }));

      abortRef.current = new AbortController();

      try {
        const res = await fetch('/api/builder/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: sessionId || state.sessionId, message }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to connect');
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const event: SSEEvent = JSON.parse(line.slice(6));
              handleEvent(event);
            } catch {
              /* skip malformed lines */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setState((prev) => ({
            ...prev,
            error: (err as Error).message,
          }));
        }
      } finally {
        setState((prev) => ({ ...prev, isStreaming: false }));
      }
    },
    [state.sessionId]
  );

  const handleEvent = useCallback((event: SSEEvent) => {
    setState((prev) => {
      const msgs = [...prev.messages];
      const lastMsg = msgs[msgs.length - 1];

      switch (event.type) {
        case 'text':
          if (lastMsg?.role === 'assistant') {
            lastMsg.content += event.content;
          }
          return { ...prev, messages: msgs };

        case 'tool_start':
          if (lastMsg?.role === 'assistant') {
            lastMsg.toolCards = [...(lastMsg.toolCards || []), { tool: event.tool, status: 'running' }];
          }
          return { ...prev, messages: msgs };

        case 'tool_result':
          if (lastMsg?.role === 'assistant') {
            const cards = lastMsg.toolCards || [];
            const card = cards.find((c) => c.tool === event.tool && c.status === 'running');
            if (card) {
              card.status = 'done';
              card.result = event.result;
            }
          }
          return { ...prev, messages: msgs };

        case 'session':
          return { ...prev, sessionId: event.sessionId };

        case 'theme_update':
          return { ...prev, currentTheme: event.theme };

        case 'ab_variants':
          return { ...prev, abVariants: event.variants };

        case 'panel_mode':
          return { ...prev, panelMode: event.mode };

        case 'progress':
          return { ...prev, stage: event.stage };

        case 'crm_instruction':
          if (lastMsg?.role === 'assistant') {
            lastMsg.crmInstruction = { provider: event.provider, steps: event.steps };
          }
          return { ...prev, messages: msgs };

        case 'error':
          return { ...prev, error: event.message };

        case 'knowledge_progress':
          return { ...prev, knowledgeProgress: { uploaded: event.uploaded, total: event.total } };

        case 'done':
          return { ...prev, isStreaming: false, knowledgeProgress: null };

        default:
          return prev;
      }
    });
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isStreaming: false }));
  }, []);

  const resetSession = useCallback(() => {
    setState({
      messages: [],
      sessionId: null,
      stage: 'input',
      panelMode: 'empty',
      isStreaming: false,
      currentTheme: null,
      abVariants: null,
      knowledgeProgress: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    sendMessage,
    stopStreaming,
    resetSession,
    setSessionId: (id: string) => setState((prev) => ({ ...prev, sessionId: id })),
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx tsc --noEmit src/components/builder/useBuilderStream.ts 2>&1 | head -20`
Expected: No type errors (or only path alias errors which are handled by Next.js)

- [ ] **Step 3: Commit**

```bash
git add src/components/builder/useBuilderStream.ts
git commit -m "feat(builder): add useBuilderStream SSE hook"
```

---

## Chunk 2: Backend Tools — Site Analyzer, Knowledge Crawler, CRM Setup, Templates

### Task 5: Site Analyzer (`src/lib/builder/siteAnalyzer.ts`)

**Files:**

- Create: `src/lib/builder/siteAnalyzer.ts`
- Test: `src/test/builder-siteAnalyzer.test.ts`

**Context:** This module fetches a URL, parses HTML to extract colors, fonts, business info, and crawls up to 5 subpages. Uses fetch + regex parsing (no cheerio dependency — keep it simple).

- [ ] **Step 1: Write the test file**

```typescript
// src/test/builder-siteAnalyzer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Site Analyzer', () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
  });

  it('should extract business name from title tag', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><head><title>Acme Dental Clinic</title></head><body></body></html>'),
    });

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.businessName).toBe('Acme Dental Clinic');
    expect(profile.url).toBe('https://example.com');
  });

  it('should extract hex colors from inline styles', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><head><title>Test</title><style>body { color: #ff5733; background: #1a1a2e; }</style></head><body></body></html>'
        ),
    });

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.colors).toContain('#ff5733');
    expect(profile.colors).toContain('#1a1a2e');
  });

  it('should extract font families from CSS', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><head><title>Test</title><style>body { font-family: "Inter", sans-serif; }</style></head><body></body></html>'
        ),
    });

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.fonts).toContain('Inter');
  });

  it('should handle fetch errors gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.businessName).toBe('example.com');
    expect(profile.pages).toHaveLength(0);
  });

  it('should extract contact info from page content', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          '<html><head><title>Test</title></head><body>' +
            '<a href="tel:+1234567890">Call us</a>' +
            '<a href="mailto:info@example.com">Email</a>' +
            '</body></html>'
        ),
    });

    const { analyzeSite } = await import('@/lib/builder/siteAnalyzer');
    const profile = await analyzeSite('https://example.com');

    expect(profile.contactInfo?.phone).toBe('+1234567890');
    expect(profile.contactInfo?.email).toBe('info@example.com');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-siteAnalyzer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the site analyzer module**

```typescript
// src/lib/builder/siteAnalyzer.ts
import type { SiteProfile } from './types';

const MAX_SUBPAGES = 5;
const FETCH_TIMEOUT = 10000;

export async function analyzeSite(url: string): Promise<SiteProfile> {
  const profile: SiteProfile = {
    url,
    businessName: new URL(url).hostname.replace('www.', ''),
    businessType: 'general',
    colors: [],
    fonts: [],
    pages: [],
  };

  try {
    const html = await fetchPage(url);
    if (!html) return profile;

    // Extract from main page
    profile.businessName = extractTitle(html) || profile.businessName;
    profile.colors = extractColors(html);
    profile.fonts = extractFonts(html);
    profile.favicon = extractFavicon(html, url);
    profile.contactInfo = extractContactInfo(html);
    profile.businessType = detectBusinessType(html);

    // Add main page content
    const mainContent = extractTextContent(html);
    if (mainContent) {
      profile.pages.push({ url, title: profile.businessName, content: mainContent });
    }

    // Find and crawl subpages
    const links = extractInternalLinks(html, url);
    const subpageUrls = links.slice(0, MAX_SUBPAGES);

    for (const subUrl of subpageUrls) {
      try {
        const subHtml = await fetchPage(subUrl);
        if (!subHtml) continue;
        const title = extractTitle(subHtml) || subUrl;
        const content = extractTextContent(subHtml);
        if (content) {
          profile.pages.push({ url: subUrl, title, content });
        }
      } catch {
        // Skip failed subpages
      }
    }
  } catch {
    // Return partial profile on error
  }

  return profile;
}

async function fetchPage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WinBixAI-Builder/1.0' },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return match ? match[1].trim() : null;
}

function extractColors(html: string): string[] {
  const colorRegex = /#[0-9a-fA-F]{6}\b/g;
  const matches = html.match(colorRegex) || [];
  return [...new Set(matches)].slice(0, 10);
}

function extractFonts(html: string): string[] {
  const fontRegex = /font-family:\s*["']?([^"';,]+)/gi;
  const fonts: string[] = [];
  let match;
  while ((match = fontRegex.exec(html)) !== null) {
    const font = match[1].trim();
    if (!['inherit', 'initial', 'sans-serif', 'serif', 'monospace', 'system-ui'].includes(font.toLowerCase())) {
      fonts.push(font);
    }
  }
  return [...new Set(fonts)].slice(0, 5);
}

function extractFavicon(html: string, baseUrl: string): string | undefined {
  const match = html.match(/<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i);
  if (!match) return undefined;
  try {
    return new URL(match[1], baseUrl).href;
  } catch {
    return undefined;
  }
}

function extractContactInfo(html: string): SiteProfile['contactInfo'] {
  const phone = html.match(/href=["']tel:([^"']+)["']/i)?.[1];
  const email = html.match(/href=["']mailto:([^"']+)["']/i)?.[1];
  if (!phone && !email) return undefined;
  return { phone: phone || undefined, email: email || undefined };
}

function extractTextContent(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 10000);
}

function extractInternalLinks(html: string, baseUrl: string): string[] {
  const linkRegex = /<a[^>]+href=["']([^"'#]+)["']/gi;
  const links: string[] = [];
  const base = new URL(baseUrl);
  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    try {
      const linkUrl = new URL(match[1], baseUrl);
      if (linkUrl.hostname === base.hostname && linkUrl.pathname !== base.pathname) {
        links.push(linkUrl.href);
      }
    } catch {
      /* skip invalid URLs */
    }
  }

  return [...new Set(links)];
}

function detectBusinessType(html: string): string {
  const text = html.toLowerCase();
  const keywords: Record<string, string[]> = {
    dental: ['dental', 'dentist', 'teeth', 'orthodont'],
    restaurant: ['restaurant', 'menu', 'cuisine', 'dining', 'reservation'],
    saas: ['software', 'platform', 'api', 'dashboard', 'analytics'],
    realestate: ['real estate', 'property', 'listing', 'apartment', 'rent'],
    beauty: ['salon', 'beauty', 'spa', 'nail', 'hair', 'cosmetic'],
    medical: ['medical', 'clinic', 'doctor', 'health', 'patient'],
    legal: ['law', 'attorney', 'legal', 'lawyer'],
    fitness: ['gym', 'fitness', 'workout', 'training'],
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (words.some((w) => text.includes(w))) return type;
  }
  return 'general';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-siteAnalyzer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/siteAnalyzer.ts src/test/builder-siteAnalyzer.test.ts
git commit -m "feat(builder): add site analyzer module"
```

---

### Task 6: Knowledge Crawler (`src/lib/builder/knowledgeCrawler.ts`)

**Files:**

- Create: `src/lib/builder/knowledgeCrawler.ts`
- Test: `src/test/builder-knowledgeCrawler.test.ts`

**Context:** Takes SiteProfile.pages (already extracted by site analyzer — no second crawl), chunks content at paragraph boundaries, and uploads via internal API calls. No external fetch needed.

- [ ] **Step 1: Write the test file**

```typescript
// src/test/builder-knowledgeCrawler.test.ts
import { describe, it, expect } from 'vitest';
import { chunkContent } from '@/lib/builder/knowledgeCrawler';

describe('Knowledge Crawler', () => {
  it('should split content at paragraph boundaries', () => {
    const content = 'Paragraph one.\n\nParagraph two.\n\nParagraph three.';
    const chunks = chunkContent(content, 2000);
    expect(chunks.length).toBeGreaterThanOrEqual(1);
    expect(chunks.every((c) => c.length <= 2000)).toBe(true);
  });

  it('should split long paragraphs at sentence boundaries', () => {
    const longParagraph = 'Sentence one. '.repeat(200); // ~2800 chars
    const chunks = chunkContent(longParagraph, 2000);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 2000)).toBe(true);
  });

  it('should handle empty content', () => {
    const chunks = chunkContent('', 2000);
    expect(chunks).toEqual([]);
  });

  it('should handle content shorter than max size', () => {
    const chunks = chunkContent('Short text.', 2000);
    expect(chunks).toEqual(['Short text.']);
  });

  it('should not produce empty chunks', () => {
    const content = '\n\n\n\nActual content.\n\n\n\n';
    const chunks = chunkContent(content, 2000);
    expect(chunks.every((c) => c.trim().length > 0)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-knowledgeCrawler.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the knowledge crawler module**

```typescript
// src/lib/builder/knowledgeCrawler.ts
import type { SiteProfile } from './types';

const MAX_CHUNK_SIZE = 2000;

export function chunkContent(content: string, maxSize: number = MAX_CHUNK_SIZE): string[] {
  if (!content.trim()) return [];

  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim());
  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxSize) {
      // Flush current chunk
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      // Split long paragraph at sentence boundaries
      const sentences = paragraph.match(/[^.!?]+[.!?]+\s*/g) || [paragraph];
      let sentenceChunk = '';
      for (const sentence of sentences) {
        if ((sentenceChunk + sentence).length > maxSize) {
          if (sentenceChunk.trim()) chunks.push(sentenceChunk.trim());
          sentenceChunk = sentence;
        } else {
          sentenceChunk += sentence;
        }
      }
      if (sentenceChunk.trim()) chunks.push(sentenceChunk.trim());
    } else if ((currentChunk + '\n\n' + paragraph).length > maxSize) {
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      currentChunk = currentChunk ? currentChunk + '\n\n' + paragraph : paragraph;
    }
  }

  if (currentChunk.trim()) chunks.push(currentChunk.trim());
  return chunks;
}

export interface CrawlResult {
  uploaded: number;
  failed: number;
  total: number;
}

export async function uploadKnowledge(
  pages: SiteProfile['pages'],
  clientId: string,
  baseUrl: string,
  cookie: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<CrawlResult> {
  const allChunks: { content: string; title: string }[] = [];

  for (const page of pages) {
    if (!page.content) continue;
    const chunks = chunkContent(page.content);
    for (const chunk of chunks) {
      allChunks.push({ content: chunk, title: page.title });
    }
  }

  const result: CrawlResult = { uploaded: 0, failed: 0, total: allChunks.length };

  for (const chunk of allChunks) {
    try {
      const res = await fetch(`${baseUrl}/api/knowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
        body: JSON.stringify({
          clientId,
          content: chunk.content,
          title: chunk.title,
          source: 'builder-crawler',
        }),
      });

      if (res.ok) {
        result.uploaded++;
      } else {
        result.failed++;
      }
    } catch {
      result.failed++;
    }

    onProgress?.(result.uploaded, result.total);
  }

  return result;
}

export async function setAIPrompt(
  clientId: string,
  businessType: string,
  businessName: string,
  baseUrl: string,
  cookie: string
): Promise<void> {
  const nicheHints: Record<string, string> = {
    dental: 'Focus on appointments, insurance, dental procedures, and patient comfort.',
    restaurant: 'Focus on menu, reservations, hours, dietary restrictions, and delivery.',
    saas: 'Focus on features, pricing, integrations, API, and onboarding.',
    realestate: 'Focus on listings, viewings, buying/selling process, and market conditions.',
    beauty: 'Focus on services, appointments, pricing, products, and gift cards.',
    medical: 'Focus on appointments, services, insurance, and patient care.',
  };
  const hint = nicheHints[businessType] || 'Answer questions helpfully based on the knowledge base.';

  const systemPrompt = `You are an AI assistant for ${businessName}. You are helpful, friendly, and knowledgeable about the business. ${hint} Answer questions based on the knowledge base provided. If you don't know something, say so honestly and suggest contacting the business directly.`;

  await fetch(`${baseUrl}/api/ai-settings/${clientId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify({
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1024,
    }),
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-knowledgeCrawler.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/knowledgeCrawler.ts src/test/builder-knowledgeCrawler.test.ts
git commit -m "feat(builder): add knowledge crawler with paragraph chunking"
```

---

### Task 7: CRM Setup Handler (`src/lib/builder/crmSetup.ts`)

**Files:**

- Create: `src/lib/builder/crmSetup.ts`
- Test: `src/test/builder-crmSetup.test.ts`

**Context:** Uses existing HubSpot adapter from `src/lib/integrations/hubspot.ts`. Provides step-by-step instructions and validates API keys.

- [ ] **Step 1: Write the test file**

```typescript
// src/test/builder-crmSetup.test.ts
import { describe, it, expect } from 'vitest';
import { getCRMSetup, getSupportedProviders } from '@/lib/builder/crmSetup';

describe('CRM Setup Handler', () => {
  it('should return HubSpot setup config', () => {
    const setup = getCRMSetup('hubspot');
    expect(setup).toBeDefined();
    expect(setup!.displayName).toBe('HubSpot');
    expect(setup!.instructionSteps.length).toBeGreaterThan(0);
  });

  it('should return null for unsupported provider', () => {
    const setup = getCRMSetup('unknown-crm');
    expect(setup).toBeNull();
  });

  it('should list supported providers', () => {
    const providers = getSupportedProviders();
    expect(providers).toContain('hubspot');
  });

  it('should have instruction steps as strings', () => {
    const setup = getCRMSetup('hubspot');
    expect(setup!.instructionSteps.every((s) => typeof s === 'string')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-crmSetup.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the CRM setup module**

```typescript
// src/lib/builder/crmSetup.ts
import type { CRMSetupConfig } from './types';

const crmConfigs: Record<string, CRMSetupConfig> = {
  hubspot: {
    provider: 'hubspot',
    displayName: 'HubSpot',
    instructionSteps: [
      'Go to your HubSpot account at app.hubspot.com',
      'Click Settings (gear icon) in the top navigation',
      'Navigate to Integrations → Private Apps',
      'Click "Create a private app"',
      'Name it "WinBix AI" and go to the Scopes tab',
      'Enable these scopes: crm.objects.contacts.read, crm.objects.contacts.write',
      'Click "Create app" and copy the access token',
      'Paste the access token here',
    ],
    requiredScopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
    async validateKey(apiKey: string) {
      try {
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) return { valid: true };
        const data = await res.json();
        return { valid: false, error: data.message || 'Invalid API key' };
      } catch (err) {
        return { valid: false, error: (err as Error).message };
      }
    },
    async createTestContact(apiKey: string) {
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            email: `test-${Date.now()}@winbixai.com`,
            firstname: 'WinBix',
            lastname: 'Test Contact',
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to create test contact');
      const data = await res.json();
      return { id: data.id };
    },
  },
};

export function getCRMSetup(provider: string): CRMSetupConfig | null {
  return crmConfigs[provider] || null;
}

export function getSupportedProviders(): string[] {
  return Object.keys(crmConfigs);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-crmSetup.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/crmSetup.ts src/test/builder-crmSetup.test.ts
git commit -m "feat(builder): add CRM setup handler with HubSpot config"
```

---

### Task 8: Industry Templates (`src/lib/builder/templates.ts`)

**Files:**

- Create: `src/lib/builder/templates.ts`
- Test: `src/test/builder-templates.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// src/test/builder-templates.test.ts
import { describe, it, expect } from 'vitest';
import { INDUSTRY_TEMPLATES, getTemplateById } from '@/lib/builder/templates';

describe('Industry Templates', () => {
  it('should have 5 templates', () => {
    expect(INDUSTRY_TEMPLATES.length).toBe(5);
  });

  it('should have required fields on each template', () => {
    for (const t of INDUSTRY_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.label).toBeTruthy();
      expect(t.emoji).toBeTruthy();
      expect(t.defaultColors.length).toBeGreaterThanOrEqual(3);
      expect(t.defaultFont).toBeTruthy();
      expect(t.sampleQuickReplies.length).toBeGreaterThanOrEqual(3);
      expect(t.sampleKnowledge.length).toBeGreaterThanOrEqual(1);
      expect(t.sampleKnowledge.every((k) => k.length <= 2000)).toBe(true);
      expect(t.systemPromptHints).toBeTruthy();
    }
  });

  it('should include dental, restaurant, saas, realestate, beauty', () => {
    const ids = INDUSTRY_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('dental');
    expect(ids).toContain('restaurant');
    expect(ids).toContain('saas');
    expect(ids).toContain('realestate');
    expect(ids).toContain('beauty');
  });

  it('should find template by id', () => {
    const template = getTemplateById('dental');
    expect(template).toBeDefined();
    expect(template!.label).toContain('Dental');
  });

  it('should return undefined for unknown id', () => {
    expect(getTemplateById('unknown')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-templates.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the templates module**

```typescript
// src/lib/builder/templates.ts
import type { IndustryTemplate } from './types';

export const INDUSTRY_TEMPLATES: IndustryTemplate[] = [
  {
    id: 'dental',
    label: 'Dental Clinic',
    emoji: '🦷',
    defaultColors: ['#1e40af', '#3b82f6', '#eff6ff'],
    defaultFont: 'Inter',
    sampleQuickReplies: ['Book appointment', 'Our services', 'Insurance info', 'Contact us'],
    sampleKnowledge: [
      'We offer comprehensive dental services including general dentistry, cosmetic procedures, orthodontics, and emergency dental care. Our team of experienced dentists is committed to providing the highest quality care in a comfortable environment.',
      'Our office hours are Monday through Friday, 9 AM to 6 PM, and Saturday 9 AM to 2 PM. We accept most dental insurance plans and offer flexible payment options including financing through CareCredit.',
    ],
    systemPromptHints: 'dental clinic, focus on appointments, insurance, dental procedures, patient comfort',
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    emoji: '🍕',
    defaultColors: ['#dc2626', '#f97316', '#fef3c7'],
    defaultFont: 'Playfair Display',
    sampleQuickReplies: ['See the menu', 'Make a reservation', 'Hours & location', 'Delivery options'],
    sampleKnowledge: [
      'Welcome to our restaurant! We serve authentic cuisine made with fresh, locally sourced ingredients. Our menu features appetizers, main courses, desserts, and a curated selection of wines and cocktails.',
      'We are open for lunch (11:30 AM - 2:30 PM) and dinner (5:30 PM - 10:00 PM), Tuesday through Sunday. Reservations are recommended for dinner, especially on weekends. We also offer takeout and delivery.',
    ],
    systemPromptHints: 'restaurant, focus on menu, reservations, hours, dietary restrictions, delivery',
  },
  {
    id: 'saas',
    label: 'SaaS / Tech',
    emoji: '💻',
    defaultColors: ['#7c3aed', '#a78bfa', '#f5f3ff'],
    defaultFont: 'Space Grotesk',
    sampleQuickReplies: ['Pricing plans', 'Book a demo', 'Technical support', 'API documentation'],
    sampleKnowledge: [
      'Our platform helps businesses streamline their operations with powerful automation tools, real-time analytics, and seamless integrations. We offer three plans: Starter (free), Pro ($49/mo), and Enterprise (custom pricing).',
      'Getting started is easy: sign up for a free account, connect your existing tools via our API or pre-built integrations, and start automating workflows in minutes. Our support team is available 24/7 via chat and email.',
    ],
    systemPromptHints: 'SaaS product, focus on features, pricing, integrations, API, onboarding',
  },
  {
    id: 'realestate',
    label: 'Real Estate',
    emoji: '🏠',
    defaultColors: ['#059669', '#34d399', '#ecfdf5'],
    defaultFont: 'DM Sans',
    sampleQuickReplies: ['View listings', 'Schedule viewing', 'Sell my property', 'Market report'],
    sampleKnowledge: [
      'We are a full-service real estate agency helping clients buy, sell, and rent properties. Our experienced agents provide personalized service, market analysis, and negotiation expertise to ensure the best outcomes.',
      'Browse our current listings on our website or contact an agent for a personalized property search. We offer free market valuations for sellers and can guide first-time buyers through every step of the process.',
    ],
    systemPromptHints: 'real estate, focus on listings, viewings, buying/selling process, market conditions',
  },
  {
    id: 'beauty',
    label: 'Beauty Salon',
    emoji: '💅',
    defaultColors: ['#db2777', '#f472b6', '#fdf2f8'],
    defaultFont: 'Cormorant Garamond',
    sampleQuickReplies: ['Book appointment', 'Our services', 'Pricing', 'Products we use'],
    sampleKnowledge: [
      'Welcome to our beauty salon! We offer a full range of services including haircuts, coloring, styling, manicures, pedicures, facials, and waxing. Our skilled team uses premium products to ensure the best results.',
      'Walk-ins are welcome but appointments are recommended to guarantee your preferred time slot. We are open Tuesday through Saturday, 10 AM to 7 PM. Gift cards are available for purchase online and in-salon.',
    ],
    systemPromptHints: 'beauty salon, focus on services, appointments, pricing, products, gift cards',
  },
];

export function getTemplateById(id: string): IndustryTemplate | undefined {
  return INDUSTRY_TEMPLATES.find((t) => t.id === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-templates.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/templates.ts src/test/builder-templates.test.ts
git commit -m "feat(builder): add 5 industry templates"
```

---

### Task 9: Agent Tools Registry (`src/lib/builder/agentTools.ts`)

**Files:**

- Create: `src/lib/builder/agentTools.ts`
- Test: `src/test/builder-agentTools.test.ts`

**Context:** Defines Gemini function calling tool declarations and maps tool names to server-side executors. Each executor calls the appropriate module (siteAnalyzer, knowledgeCrawler, etc.) and returns results.

- [ ] **Step 1: Write the test file**

```typescript
// src/test/builder-agentTools.test.ts
import { describe, it, expect } from 'vitest';
import { GEMINI_TOOL_DECLARATIONS, getToolExecutor } from '@/lib/builder/agentTools';

describe('Agent Tools', () => {
  it('should have 7 tool declarations', () => {
    expect(GEMINI_TOOL_DECLARATIONS.length).toBe(7);
  });

  it('should have name and description on each tool', () => {
    for (const tool of GEMINI_TOOL_DECLARATIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
    }
  });

  it('should return executor for known tools', () => {
    expect(getToolExecutor('analyze_site')).toBeDefined();
    expect(getToolExecutor('build_widget')).toBeDefined();
    expect(getToolExecutor('set_panel_mode')).toBeDefined();
  });

  it('should return undefined for unknown tool', () => {
    expect(getToolExecutor('nonexistent' as never)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-agentTools.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the agent tools module**

```typescript
// src/lib/builder/agentTools.ts
import type { SSEEvent, AgentToolName, PanelMode, SiteProfile } from './types';
import { analyzeSite } from './siteAnalyzer';
import { uploadKnowledge, setAIPrompt } from './knowledgeCrawler';
import { getCRMSetup } from './crmSetup';

// Gemini function declaration format
export interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
}

export const GEMINI_TOOL_DECLARATIONS: GeminiToolDeclaration[] = [
  {
    name: 'analyze_site',
    description: 'Crawl a website URL, extract colors, fonts, business name, type, and page content',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The website URL to analyze' },
      },
      required: ['url'],
    },
  },
  {
    name: 'generate_themes',
    description: 'Generate 3 theme.json variants based on site profile and user preferences',
    parameters: {
      type: 'object',
      properties: {
        siteProfile: { type: 'string', description: 'JSON stringified SiteProfile object' },
        preferences: { type: 'string', description: 'JSON stringified user preferences' },
      },
      required: ['siteProfile'],
    },
  },
  {
    name: 'select_theme',
    description: 'Apply the selected theme variant (0, 1, or 2)',
    parameters: {
      type: 'object',
      properties: {
        variantIndex: { type: 'string', description: 'Index of the selected variant (0, 1, or 2)' },
      },
      required: ['variantIndex'],
    },
  },
  {
    name: 'build_widget',
    description: 'Run the build pipeline: generate source files, build, and deploy the widget',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID for the widget' },
      },
      required: ['clientId'],
    },
  },
  {
    name: 'crawl_knowledge',
    description: 'Upload website content to the knowledge base for the widget AI',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The website URL (site must have been analyzed first)' },
        clientId: { type: 'string', description: 'The client ID to upload knowledge for' },
      },
      required: ['url', 'clientId'],
    },
  },
  {
    name: 'connect_crm',
    description: 'Validate a CRM API key and activate the integration',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'CRM provider name (e.g., hubspot)' },
        apiKey: { type: 'string', description: 'The API key or access token' },
      },
      required: ['provider', 'apiKey'],
    },
  },
  {
    name: 'set_panel_mode',
    description: 'Switch the right panel context to show a different view',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          description: 'Panel mode to switch to',
          enum: ['empty', 'live_preview', 'test_sandbox', 'ab_compare', 'crm_status'],
        },
      },
      required: ['mode'],
    },
  },
];

// Tool executor context passed from the route handler
export interface ToolContext {
  sessionId: string;
  userId: string;
  baseUrl: string;
  cookie: string;
  write: (event: SSEEvent) => void;
}

type ToolExecutor = (args: Record<string, unknown>, ctx: ToolContext) => Promise<Record<string, unknown>>;

const executors: Record<AgentToolName, ToolExecutor> = {
  async analyze_site(args, ctx) {
    const url = args.url as string;
    const profile = await analyzeSite(url);
    ctx.write({ type: 'panel_mode', mode: 'live_preview' });
    ctx.write({ type: 'progress', stage: 'analysis', status: 'complete' });
    return { success: true, profile };
  },

  async generate_themes(args, ctx) {
    // Theme generation is handled by Gemini itself — this tool just signals the UI
    ctx.write({ type: 'panel_mode', mode: 'ab_compare' });
    ctx.write({ type: 'progress', stage: 'design', status: 'active' });
    return { success: true, message: 'Generate 3 theme variants in your response as JSON' };
  },

  async select_theme(args, ctx) {
    const variantIndex = parseInt(args.variantIndex as string, 10);
    ctx.write({ type: 'panel_mode', mode: 'live_preview' });
    ctx.write({ type: 'progress', stage: 'design', status: 'complete' });
    return { success: true, selectedVariant: variantIndex };
  },

  async build_widget(args, ctx) {
    const clientId = args.clientId as string;
    ctx.write({ type: 'progress', stage: 'deploy', status: 'active' });

    // Call the existing build API internally
    const res = await fetch(`${ctx.baseUrl}/api/builder/build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: ctx.cookie,
      },
      body: JSON.stringify({ sessionId: ctx.sessionId }),
    });

    const data = await res.json();
    if (!data.success) {
      return { success: false, error: data.error || 'Build failed' };
    }

    ctx.write({ type: 'progress', stage: 'deploy', status: 'complete' });
    ctx.write({ type: 'panel_mode', mode: 'test_sandbox' });
    return { success: true, clientId, previewUrl: data.data?.previewUrl };
  },

  async crawl_knowledge(args, ctx) {
    const clientId = args.clientId as string;
    ctx.write({ type: 'progress', stage: 'knowledge', status: 'active' });

    // Retrieve stored site profile from session (saved during analyze_site)
    const BuilderSession = (await import('@/models/BuilderSession')).default;
    const session = await BuilderSession.findById(ctx.sessionId);
    const siteProfile = session?.siteProfile as SiteProfile | null;

    if (!siteProfile?.pages?.length) {
      return { success: false, error: 'No site profile found. Run analyze_site first.' };
    }

    const result = await uploadKnowledge(siteProfile.pages, clientId, ctx.baseUrl, ctx.cookie, (uploaded, total) => {
      ctx.write({ type: 'knowledge_progress', uploaded, total });
    });

    await setAIPrompt(clientId, siteProfile.businessType, siteProfile.businessName, ctx.baseUrl, ctx.cookie);

    ctx.write({ type: 'progress', stage: 'knowledge', status: 'complete' });
    return { success: true, ...result };
  },

  async connect_crm(args, ctx) {
    const provider = args.provider as string;
    const apiKey = args.apiKey as string;

    const setup = getCRMSetup(provider);
    if (!setup) {
      return { success: false, error: `Unsupported CRM provider: ${provider}` };
    }

    const validation = await setup.validateKey(apiKey);
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid API key' };
    }

    // Create test contact to verify write access
    try {
      const testContact = await setup.createTestContact(apiKey);
      ctx.write({ type: 'panel_mode', mode: 'crm_status' });
      return { success: true, provider, testContactId: testContact.id };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },

  async set_panel_mode(args, ctx) {
    const mode = args.mode as PanelMode;
    ctx.write({ type: 'panel_mode', mode });
    return { success: true, mode };
  },
};

export function getToolExecutor(name: AgentToolName): ToolExecutor | undefined {
  return executors[name];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run src/test/builder-agentTools.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/agentTools.ts src/test/builder-agentTools.test.ts
git commit -m "feat(builder): add agent tool declarations and executors"
```

---

## Chunk 3: API Routes — Chat Rewrite, Test Chat, Templates

### Task 10: Rewrite Agentic Chat API (`src/app/api/builder/chat/route.ts`)

**Files:**

- Modify: `src/app/api/builder/chat/route.ts` (full rewrite)

**Context:** This is the core agentic endpoint. It takes a user message, creates an SSE stream, calls Gemini with function calling tools, executes tools server-side, and streams results back. The current endpoint (199 lines) does simple prompt→response — this replaces it entirely.

**Reference:** Current Gemini API usage pattern in existing file. Existing model import: `import { GoogleGenerativeAI } from '@google/generative-ai'`. Existing helper: `getDefaultModel()` from `@/lib/aiModel`.

- [ ] **Step 1: Rewrite the chat API route**

Replace the entire file with the SSE streaming implementation:

````typescript
// src/app/api/builder/chat/route.ts
import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { Errors } from '@/lib/apiResponse';
import { getDefaultModel } from '@/lib/aiModel';
import BuilderSession from '@/models/BuilderSession';
import { createSSEStream, createSSEHeaders } from '@/lib/builder/sseUtils';
import { GEMINI_TOOL_DECLARATIONS, getToolExecutor } from '@/lib/builder/agentTools';
import type { SSEEvent, AgentToolName } from '@/lib/builder/types';

// Track active streams per session to prevent concurrent connections
const activeStreams = new Map<string, boolean>();

const SYSTEM_PROMPT = `You are an AI widget builder agent for WinBix AI. You help users create customized chat widgets for their businesses.

Your capabilities (use the available tools):
- analyze_site: Crawl a website to extract colors, fonts, and content
- generate_themes: Signal the UI to show theme variant comparison
- select_theme: Apply a selected theme variant
- build_widget: Build and deploy the widget
- crawl_knowledge: Upload website content to the widget's knowledge base
- connect_crm: Validate and activate CRM integrations
- set_panel_mode: Switch the right panel view

WORKFLOW:
1. When user provides a URL, call analyze_site immediately
2. After analysis, generate 3 theme.json variants and present them (call generate_themes, then output the 3 variants as JSON in your response)
3. When user picks a variant, call select_theme
4. Call crawl_knowledge to populate the knowledge base
5. Call build_widget to build and deploy
6. After deployment, help the user iterate (color changes, greeting updates)
7. If user asks about CRM, provide instructions and call connect_crm when they give an API key

When generating theme variants, output them as a JSON block with this format:
\`\`\`json
{"variants": [{"label": "Name", "theme": {theme.json fields...}}, ...]}
\`\`\`

Always be conversational and explain what you're doing. Use the tools proactively.`;

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { sessionId, message } = body;

    if (!message || typeof message !== 'string') {
      return Errors.badRequest('message is required');
    }

    await connectDB();

    // Get or create session
    let session;
    if (sessionId) {
      session = await BuilderSession.findOne({ _id: sessionId, userId: auth.userId });
      if (!session) return Errors.notFound('Session not found');

      // Check for concurrent stream
      if (activeStreams.get(sessionId)) {
        return new Response(JSON.stringify({ success: false, error: 'Another stream is active for this session' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      session = await BuilderSession.create({
        userId: auth.userId,
        messages: [],
        status: 'chatting',
        currentStage: 'input',
      });
    }

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    session.status = 'streaming';
    await session.save();

    const currentSessionId = session._id.toString();
    activeStreams.set(currentSessionId, true);

    // Build conversation history for Gemini
    const conversationHistory = session.messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const baseUrl = request.nextUrl.origin;
    const cookie = request.headers.get('cookie') || '';

    const stream = createSSEStream(async (write) => {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const modelId = getDefaultModel();
        const model = genAI.getGenerativeModel({
          model: modelId,
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS }],
        });

        const chat = model.startChat({
          history: conversationHistory.slice(0, -1), // All except last user message
        });

        let response = await chat.sendMessage(message);
        let fullAssistantText = '';

        // Process response — may include function calls
        while (true) {
          const candidate = response.response.candidates?.[0];
          if (!candidate) break;

          for (const part of candidate.content.parts) {
            if (part.text) {
              fullAssistantText += part.text;
              write({ type: 'text', content: part.text });

              // Check for theme variants JSON in text
              const variantsMatch = part.text.match(/```json\s*\n([\s\S]*?)```/);
              if (variantsMatch) {
                try {
                  const parsed = JSON.parse(variantsMatch[1]);
                  if (parsed.variants && Array.isArray(parsed.variants)) {
                    write({ type: 'ab_variants', variants: parsed.variants });
                    // Store variants in session
                    session.abVariants = parsed.variants.map(
                      (v: { label: string; theme: Record<string, unknown> }) => ({
                        label: v.label,
                        themeJson: v.theme,
                      })
                    );
                  }
                } catch {
                  /* not valid JSON, skip */
                }
              }
            }

            if (part.functionCall) {
              const toolName = part.functionCall.name as AgentToolName;
              const toolArgs = part.functionCall.args as Record<string, unknown>;

              write({ type: 'tool_start', tool: toolName, args: toolArgs });

              const executor = getToolExecutor(toolName);
              let toolResult: Record<string, unknown>;

              if (executor) {
                try {
                  toolResult = await executor(toolArgs, {
                    sessionId: currentSessionId,
                    userId: auth.userId,
                    baseUrl,
                    cookie,
                    write,
                  });
                } catch (err) {
                  toolResult = { success: false, error: (err as Error).message };
                  write({ type: 'error', message: (err as Error).message, recoverable: true });
                }
              } else {
                toolResult = { success: false, error: `Unknown tool: ${toolName}` };
              }

              write({ type: 'tool_result', tool: toolName, result: toolResult });

              // Update session based on tool results
              if (toolName === 'analyze_site' && toolResult.success) {
                session.siteProfile = toolResult.profile;
                session.currentStage = 'analysis';
              } else if (toolName === 'select_theme' && toolResult.success) {
                const idx = toolResult.selectedVariant as number;
                session.selectedVariant = idx;
                if (session.abVariants?.[idx]) {
                  session.themeJson = session.abVariants[idx].themeJson;
                }
                session.currentStage = 'design';
              } else if (toolName === 'build_widget' && toolResult.success) {
                session.clientId = toolResult.clientId as string;
                session.currentStage = 'deploy';
                session.status = 'deployed';
              } else if (toolName === 'crawl_knowledge' && toolResult.success) {
                session.knowledgeUploaded = true;
                session.currentStage = 'knowledge';
              } else if (toolName === 'connect_crm' && toolResult.success) {
                const provider = toolArgs.provider as string;
                const existing = session.connectedIntegrations?.find(
                  (i: { provider: string }) => i.provider === provider
                );
                if (existing) {
                  existing.status = 'connected';
                } else {
                  session.connectedIntegrations = [
                    ...(session.connectedIntegrations || []),
                    { provider, status: 'connected' },
                  ];
                }
                session.currentStage = 'integrations';
              }

              // Feed tool result back to Gemini for continuation
              response = await chat.sendMessage([
                {
                  functionResponse: {
                    name: toolName,
                    response: toolResult,
                  },
                },
              ]);

              // Don't break — continue processing the new response
              continue;
            }
          }

          // No more function calls — break the loop
          break;
        }

        // Save assistant response to session
        if (fullAssistantText) {
          session.messages.push({
            role: 'assistant',
            content: fullAssistantText,
            timestamp: new Date(),
          });
        }

        if (session.status === 'streaming') {
          session.status = 'chatting';
        }
        await session.save();

        // Send sessionId to frontend
        write({ type: 'session', sessionId: currentSessionId });
      } finally {
        activeStreams.delete(currentSessionId);
      }
    });

    return new Response(stream, { headers: createSSEHeaders() });
  } catch (error) {
    console.error('Builder chat error:', error);
    return Errors.internal('Failed to process chat message');
  }
}
````

- [ ] **Step 2: Verify existing tests still pass**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/app/api/builder/chat/route.ts
git commit -m "feat(builder): rewrite chat API with SSE streaming and Gemini function calling"
```

---

### Task 11: Test Chat API (`src/app/api/builder/test-chat/route.ts`)

**Files:**

- Create: `src/app/api/builder/test-chat/route.ts`

**Context:** Proxies chat messages to the deployed widget's AI endpoint. Used by the TestSandbox component to let users test their widget without leaving the builder.

- [ ] **Step 1: Write the test chat route**

```typescript
// src/app/api/builder/test-chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { clientId, message, conversationId } = body;

    if (!clientId || !message) {
      return Errors.badRequest('clientId and message are required');
    }

    await connectDB();

    // Proxy to the main chat stream API, marking it as a test message
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        message,
        conversationId: conversationId || `test-${Date.now()}`,
        isTest: true,
      }),
    });

    if (!res.ok) {
      return Errors.internal('Failed to get AI response');
    }

    // Read the streamed response and return as JSON
    const text = await res.text();
    return successResponse({ response: text, conversationId: conversationId || `test-${Date.now()}` });
  } catch (error) {
    console.error('Test chat error:', error);
    return Errors.internal('Failed to process test message');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/builder/test-chat/route.ts
git commit -m "feat(builder): add test-chat sandbox proxy endpoint"
```

---

### Task 12: Templates API (`src/app/api/builder/templates/route.ts`)

**Files:**

- Create: `src/app/api/builder/templates/route.ts`

- [ ] **Step 1: Write the templates route**

```typescript
// src/app/api/builder/templates/route.ts
import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { successResponse, Errors } from '@/lib/apiResponse';
import { INDUSTRY_TEMPLATES } from '@/lib/builder/templates';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    // Return templates without sampleKnowledge (too verbose for listing)
    const templates = INDUSTRY_TEMPLATES.map(({ sampleKnowledge, systemPromptHints, ...rest }) => rest);
    return successResponse(templates);
  } catch (error) {
    console.error('Templates error:', error);
    return Errors.internal('Failed to fetch templates');
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/builder/templates/route.ts
git commit -m "feat(builder): add templates listing endpoint"
```

---

## Chunk 4: Frontend Components — Builder Page Rewrite

### Task 13: ProgressPipeline Component

**Files:**

- Create: `src/components/builder/ProgressPipeline.tsx`

- [ ] **Step 1: Write the ProgressPipeline component**

```typescript
// src/components/builder/ProgressPipeline.tsx
'use client';

import type { BuilderStage } from '@/lib/builder/types';
import { BUILDER_STAGES } from '@/lib/builder/types';

interface Props {
  currentStage: BuilderStage;
}

const STAGE_LABELS: Record<BuilderStage, string> = {
  input: 'Input',
  analysis: 'Analysis',
  design: 'Design',
  knowledge: 'Knowledge',
  deploy: 'Deploy',
  integrations: 'Integrations',
};

const STAGE_ICONS: Record<BuilderStage, string> = {
  input: '🔗',
  analysis: '🔍',
  design: '🎨',
  knowledge: '📚',
  deploy: '🚀',
  integrations: '🔌',
};

export default function ProgressPipeline({ currentStage }: Props) {
  const currentIndex = BUILDER_STAGES.indexOf(currentStage);

  return (
    <div className="flex items-center justify-between px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-gray-200">
      {BUILDER_STAGES.map((stage, i) => {
        const isComplete = i < currentIndex;
        const isActive = i === currentIndex;
        const isPending = i > currentIndex;

        return (
          <div key={stage} className="flex items-center">
            {i > 0 && (
              <div
                className={`h-0.5 w-8 mx-2 transition-colors duration-500 ${
                  isComplete ? 'bg-green-500' : 'bg-gray-200'
                }`}
              />
            )}
            <div className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all duration-500 ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                    ? 'bg-blue-500 text-white ring-2 ring-blue-200'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isComplete ? '✓' : STAGE_ICONS[stage]}
              </div>
              <span
                className={`text-xs font-medium hidden sm:block transition-colors ${
                  isComplete
                    ? 'text-green-600'
                    : isActive
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}
              >
                {STAGE_LABELS[stage]}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/ProgressPipeline.tsx
git commit -m "feat(builder): add ProgressPipeline component"
```

---

### Task 14: Voice Input Hook

**Files:**

- Create: `src/components/builder/useVoiceInput.ts`

**Context:** Adapts the pattern from `.claude/widget-builder/src/hooks/useVoice.js` (Web Speech API) for the builder chat input.

- [ ] **Step 1: Write the voice input hook**

```typescript
// src/components/builder/useVoiceInput.ts
'use client';

import { useState, useCallback, useRef } from 'react';

interface VoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
}

export function useVoiceInput(onTranscript?: (text: string) => void): VoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const isSupported =
    typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startListening = useCallback(() => {
    if (!isSupported) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = navigator.language || 'en-US';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const result = Array.from(event.results)
        .map((r) => r[0].transcript)
        .join('');
      setTranscript(result);

      if (event.results[0]?.isFinal) {
        onTranscript?.(result);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript('');
  }, [isSupported, onTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, isSupported, transcript, startListening, stopListening };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/useVoiceInput.ts
git commit -m "feat(builder): add voice input hook for builder chat"
```

---

### Task 15: BuilderChat Component

**Files:**

- Create: `src/components/builder/BuilderChat.tsx`

**Context:** Chat panel with streaming text display, voice input, inline tool action cards, CRM instruction cards, and suggestion chips.

- [ ] **Step 1: Write the BuilderChat component**

````typescript
// src/components/builder/BuilderChat.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useVoiceInput } from './useVoiceInput';

interface ToolCard {
  tool: string;
  status: 'running' | 'done' | 'error';
  result?: Record<string, unknown>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCards?: ToolCard[];
  crmInstruction?: { provider: string; steps: string[] };
}

interface Props {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  knowledgeProgress: { uploaded: number; total: number } | null;
  onSendMessage: (message: string) => void;
  suggestions?: string[];
}

const TOOL_LABELS: Record<string, string> = {
  analyze_site: 'Analyzing website',
  generate_themes: 'Generating designs',
  select_theme: 'Applying theme',
  build_widget: 'Building widget',
  crawl_knowledge: 'Uploading knowledge',
  connect_crm: 'Connecting CRM',
  set_panel_mode: 'Updating view',
};

function formatContent(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeContent = '';

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        parts.push(
          <pre key={`code-${i}`} className="bg-gray-900 text-gray-100 rounded-lg p-3 my-2 text-xs overflow-x-auto">
            <code>{codeContent}</code>
          </pre>
        );
        codeContent = '';
      }
      inCodeBlock = !inCodeBlock;
      return;
    }
    if (inCodeBlock) {
      codeContent += (codeContent ? '\n' : '') + line;
      return;
    }

    // Bold and inline code
    const formatted = line
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');

    parts.push(
      <p key={i} className="mb-1" dangerouslySetInnerHTML={{ __html: formatted || '&nbsp;' }} />
    );
  });

  return parts;
}

export default function BuilderChat({ messages, isStreaming, error, knowledgeProgress, onSendMessage, suggestions }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const { isListening, isSupported, startListening, stopListening } = useVoiceInput(
    (text) => setInput(prev => prev + ' ' + text)
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-800'
            }`}>
              <div className="text-sm">{formatContent(msg.content)}</div>

              {/* Tool action cards */}
              {msg.toolCards?.map((card, j) => (
                <div key={j} className="mt-2 flex items-center gap-2 text-xs bg-white/80 rounded-lg px-3 py-2 border border-gray-200">
                  {card.status === 'running' && <span className="animate-spin">⏳</span>}
                  {card.status === 'done' && <span className="text-green-500">✓</span>}
                  {card.status === 'error' && <span className="text-red-500">✗</span>}
                  <span className="text-gray-600">{TOOL_LABELS[card.tool] || card.tool}</span>
                </div>
              ))}

              {/* CRM instruction card */}
              {msg.crmInstruction && (
                <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3">
                  <p className="font-medium text-sm mb-2 capitalize">{msg.crmInstruction.provider} Setup</p>
                  <ol className="list-decimal list-inside text-xs text-gray-600 space-y-1">
                    {msg.crmInstruction.steps.map((step, k) => (
                      <li key={k}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Streaming indicator */}
        {isStreaming && messages[messages.length - 1]?.role === 'assistant' && (
          <div className="flex gap-1 px-4">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Knowledge progress */}
        {knowledgeProgress && (
          <div className="px-4">
            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              <p className="mb-1">Uploading knowledge... {knowledgeProgress.uploaded}/{knowledgeProgress.total}</p>
              <div className="w-full h-1.5 bg-blue-200 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${(knowledgeProgress.uploaded / knowledgeProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4">
            <div className="bg-red-50 text-red-600 text-xs rounded-lg p-3">{error}</div>
          </div>
        )}

        {/* Suggestion chips */}
        {suggestions && suggestions.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-2 px-4">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(s)}
                className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-blue-300 transition-colors text-gray-600"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 flex items-center gap-2">
        {isSupported && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-2 rounded-full transition-colors ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            🎤
          </button>
        )}
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={isStreaming ? 'AI is working...' : 'Type a message...'}
          disabled={isStreaming}
          className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ➤
        </button>
      </form>
    </div>
  );
}
````

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/BuilderChat.tsx
git commit -m "feat(builder): add BuilderChat component with streaming and voice"
```

---

### Task 16: LivePreview Component

**Files:**

- Create: `src/components/builder/LivePreview.tsx`

- [ ] **Step 1: Write the LivePreview component**

```typescript
// src/components/builder/LivePreview.tsx
'use client';

import { useEffect, useRef } from 'react';

interface Props {
  clientId: string | null;
  currentTheme: Record<string, unknown> | null;
}

export default function LivePreview({ clientId, currentTheme }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send theme updates to iframe via postMessage
  useEffect(() => {
    if (!currentTheme || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage(
      { type: 'theme_update', theme: currentTheme },
      '*'
    );
  }, [currentTheme]);

  if (!clientId) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-3">👁️</div>
          <p className="text-sm">Preview will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Live Preview</span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-600">Live</span>
        </div>
      </div>
      <div className="flex-1 relative bg-gray-100 overflow-hidden">
        <iframe
          ref={iframeRef}
          src={`/quickwidgets/${clientId}/preview.html`}
          className="absolute inset-0 w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Widget Preview"
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/LivePreview.tsx
git commit -m "feat(builder): add LivePreview component with hot-reload"
```

---

### Task 17: TestSandbox Component

**Files:**

- Create: `src/components/builder/TestSandbox.tsx`

- [ ] **Step 1: Write the TestSandbox component**

```typescript
// src/components/builder/TestSandbox.tsx
'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  clientId: string;
  connectedIntegrations: { provider: string; status: string }[];
}

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function TestSandbox({ clientId, connectedIntegrations }: Props) {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/builder/test-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, message: userMsg, conversationId }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.data.response }]);
        setConversationId(data.data.conversationId);
        setLogs(prev => [...prev, `✓ Response received at ${new Date().toLocaleTimeString()}`]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error: Could not get response' }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setLogs([]);
    setConversationId(null);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">Test Sandbox</span>
        <button onClick={reset} className="text-xs text-red-500 hover:text-red-700">Reset</button>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-xs text-gray-400 mt-8">Send a message to test your widget</p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`text-xs p-2 rounded-lg max-w-[85%] ${
            msg.role === 'user'
              ? 'bg-blue-100 text-blue-800 ml-auto'
              : 'bg-gray-100 text-gray-700'
          }`}>
            {msg.content}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400 animate-pulse">Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Test your widget..."
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-gray-300 focus:border-blue-400 outline-none"
          />
          <button onClick={sendMessage} disabled={loading} className="px-3 py-2 bg-blue-600 text-white text-xs rounded-lg disabled:opacity-50">
            Send
          </button>
        </div>
      </div>

      {/* Integration status */}
      {connectedIntegrations.length > 0 && (
        <div className="border-t border-gray-200 p-3">
          <p className="text-xs font-medium text-gray-500 mb-2">Integrations</p>
          {connectedIntegrations.map((int, i) => (
            <div key={i} className="flex items-center gap-2 text-xs py-1">
              <div className={`w-2 h-2 rounded-full ${int.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
              <span className="capitalize">{int.provider}</span>
            </div>
          ))}
        </div>
      )}

      {/* Logs */}
      {logs.length > 0 && (
        <div className="border-t border-gray-200 p-3 max-h-24 overflow-y-auto">
          <p className="text-xs font-medium text-gray-500 mb-1">Log</p>
          {logs.map((log, i) => (
            <p key={i} className="text-xs text-gray-400">{log}</p>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/TestSandbox.tsx
git commit -m "feat(builder): add TestSandbox component"
```

---

### Task 18: ABCompare Component

**Files:**

- Create: `src/components/builder/ABCompare.tsx`

- [ ] **Step 1: Write the ABCompare component**

```typescript
// src/components/builder/ABCompare.tsx
'use client';

import { useState } from 'react';

interface Variant {
  label: string;
  theme: Record<string, unknown>;
}

interface Props {
  variants: Variant[];
  onSelect: (index: number) => void;
}

export default function ABCompare({ variants, onSelect }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const handleSelect = (index: number) => {
    setSelected(index);
    onSelect(index);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <span className="text-xs font-medium text-gray-500">Choose a Design</span>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="grid gap-4">
          {variants.map((variant, i) => {
            const colors = (variant.theme.headerFrom as string) || '#3b82f6';
            const isSelected = selected === i;

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-lg"
                    style={{ background: `linear-gradient(135deg, ${colors}, ${(variant.theme.headerTo as string) || colors})` }}
                  />
                  <div>
                    <p className="font-medium text-sm">{variant.label}</p>
                    <p className="text-xs text-gray-500">
                      {(variant.theme.font as string) || 'Default font'}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="ml-auto text-blue-500 text-lg">✓</span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  {[variant.theme.headerFrom, variant.theme.headerVia, variant.theme.headerTo, variant.theme.sendFrom, variant.theme.userMsgFrom]
                    .filter(Boolean)
                    .slice(0, 5)
                    .map((color, j) => (
                      <div
                        key={j}
                        className="w-6 h-6 rounded-full border border-gray-200"
                        style={{ backgroundColor: color as string }}
                      />
                    ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/ABCompare.tsx
git commit -m "feat(builder): add ABCompare variant selector component"
```

---

### Task 19: TemplateSelector Component

**Files:**

- Create: `src/components/builder/TemplateSelector.tsx`

- [ ] **Step 1: Write the TemplateSelector component**

```typescript
// src/components/builder/TemplateSelector.tsx
'use client';

import { useState, useEffect } from 'react';

interface TemplateOption {
  id: string;
  label: string;
  emoji: string;
  defaultColors: string[];
  defaultFont: string;
  sampleQuickReplies: string[];
}

interface Props {
  onSelectTemplate: (templateId: string) => void;
  onSubmitUrl: (url: string) => void;
}

export default function TemplateSelector({ onSelectTemplate, onSubmitUrl }: Props) {
  const [url, setUrl] = useState('');
  const [templates, setTemplates] = useState<TemplateOption[]>([]);

  // Fetch templates on mount
  useEffect(() => {
    fetch('/api/builder/templates')
      .then(r => r.json())
      .then(d => { if (d.success) setTemplates(d.data); })
      .catch(() => {});
  }, []);

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    // Normalize URL
    let normalized = url.trim();
    if (!normalized.startsWith('http')) normalized = 'https://' + normalized;
    onSubmitUrl(normalized);
  };

  return (
    <div className="flex flex-col items-center justify-center h-full px-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Widget</h2>
      <p className="text-gray-500 mb-8 text-center">
        Paste your website URL and I&apos;ll create a branded AI chat widget automatically
      </p>

      <form onSubmit={handleUrlSubmit} className="w-full max-w-md mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://your-website.com"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!url.trim()}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
          >
            Start
          </button>
        </div>
      </form>

      {templates.length > 0 && (
        <>
          <p className="text-xs text-gray-400 mb-4">Or pick an industry template</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-md">
            {templates.map(t => (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t.id)}
                className="p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-center"
              >
                <div className="text-3xl mb-2">{t.emoji}</div>
                <p className="text-sm font-medium text-gray-700">{t.label}</p>
                <div className="flex justify-center gap-1 mt-2">
                  {t.defaultColors.slice(0, 3).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full" style={{ backgroundColor: c }} />
                  ))}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/TemplateSelector.tsx
git commit -m "feat(builder): add TemplateSelector component"
```

---

### Task 20: ContextPanel Component

**Files:**

- Create: `src/components/builder/ContextPanel.tsx`

- [ ] **Step 1: Write the ContextPanel component**

```typescript
// src/components/builder/ContextPanel.tsx
'use client';

import type { PanelMode } from '@/lib/builder/types';
import LivePreview from './LivePreview';
import TestSandbox from './TestSandbox';
import ABCompare from './ABCompare';

interface Props {
  mode: PanelMode;
  clientId: string | null;
  currentTheme: Record<string, unknown> | null;
  abVariants: { label: string; theme: Record<string, unknown> }[] | null;
  connectedIntegrations: { provider: string; status: string }[];
  onSelectVariant: (index: number) => void;
}

export default function ContextPanel({
  mode,
  clientId,
  currentTheme,
  abVariants,
  connectedIntegrations,
  onSelectVariant,
}: Props) {
  return (
    <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full">
      {mode === 'empty' && (
        <div className="flex items-center justify-center h-full text-gray-400">
          <div className="text-center">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-sm">Preview will appear here</p>
            <p className="text-xs text-gray-300 mt-1">Paste a URL to get started</p>
          </div>
        </div>
      )}

      {mode === 'live_preview' && (
        <LivePreview clientId={clientId} currentTheme={currentTheme} />
      )}

      {mode === 'ab_compare' && abVariants && (
        <ABCompare variants={abVariants} onSelect={onSelectVariant} />
      )}

      {mode === 'test_sandbox' && clientId && (
        <TestSandbox clientId={clientId} connectedIntegrations={connectedIntegrations} />
      )}

      {mode === 'crm_status' && (
        <div className="p-4">
          <h3 className="font-medium text-sm mb-4">Connected Integrations</h3>
          {connectedIntegrations.length === 0 ? (
            <p className="text-sm text-gray-400">No integrations connected yet</p>
          ) : (
            <div className="space-y-3">
              {connectedIntegrations.map((integration, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200">
                  <div className={`w-3 h-3 rounded-full ${
                    integration.status === 'connected' ? 'bg-green-500' :
                    integration.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm font-medium capitalize">{integration.provider}</p>
                    <p className="text-xs text-gray-500 capitalize">{integration.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/ContextPanel.tsx
git commit -m "feat(builder): add ContextPanel with mode switching"
```

---

### Task 21: Rewrite BuilderPage

**Files:**

- Modify: `src/app/dashboard/builder/page.tsx` (full rewrite)

**Context:** Current page is 545 lines with chat + sessions sidebar + preview. New version uses the component architecture: ProgressPipeline at top, BuilderChat on left, ContextPanel on right. All state managed by useBuilderStream hook.

- [ ] **Step 1: Rewrite the builder page**

Replace the entire file with:

```typescript
// src/app/dashboard/builder/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBuilderStream } from '@/components/builder/useBuilderStream';
import ProgressPipeline from '@/components/builder/ProgressPipeline';
import BuilderChat from '@/components/builder/BuilderChat';
import ContextPanel from '@/components/builder/ContextPanel';
import TemplateSelector from '@/components/builder/TemplateSelector';

interface SessionSummary {
  _id: string;
  widgetName: string | null;
  status: string;
  updatedAt: string;
}

const STAGE_SUGGESTIONS: Record<string, string[]> = {
  input: [],
  analysis: ['Change colors', 'Different style'],
  design: ['I like this one', 'Show different options'],
  knowledge: ['Add more content', 'Skip knowledge base'],
  deploy: ['Test the widget', 'Connect CRM', 'Change colors'],
  integrations: ['Test CRM integration', 'Add another CRM'],
};

export default function BuilderPage() {
  const stream = useBuilderStream();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [showSessions, setShowSessions] = useState(false);

  // Load session list
  useEffect(() => {
    fetch('/api/builder/sessions')
      .then(r => r.json())
      .then(d => { if (d.success) setSessions(d.data); })
      .catch(() => {});
  }, []);

  const handleUrlSubmit = useCallback((url: string) => {
    stream.sendMessage(`Create a widget for ${url}`);
  }, [stream]);

  const handleTemplateSelect = useCallback((templateId: string) => {
    stream.sendMessage(`Use the ${templateId} industry template to create my widget`);
  }, [stream]);

  const handleVariantSelect = useCallback((index: number) => {
    stream.sendMessage(`I choose variant ${index + 1}`);
  }, [stream]);

  const loadSession = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/builder/sessions?id=${id}`);
      const data = await res.json();
      if (data.success) {
        stream.setSessionId(id);
        // Messages will be loaded from session
        setShowSessions(false);
      }
    } catch {}
  }, [stream]);

  const startNewSession = useCallback(() => {
    stream.resetSession();
    setShowSessions(false);
  }, [stream]);

  const isEmptyState = stream.stage === 'input' && stream.messages.length === 0;

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col bg-gray-50">
      {/* Progress Pipeline */}
      {!isEmptyState && <ProgressPipeline currentStage={stream.stage} />}

      <div className="flex-1 flex overflow-hidden">
        {/* Sessions Sidebar (mobile toggle) */}
        <div className={`${showSessions ? 'block' : 'hidden'} md:block w-64 border-r border-gray-200 bg-white flex-shrink-0 overflow-y-auto`}>
          <div className="p-4 border-b border-gray-200">
            <button
              onClick={startNewSession}
              className="w-full py-2 px-4 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              + New Widget
            </button>
          </div>
          <div className="p-2">
            {sessions.map(s => (
              <button
                key={s._id}
                onClick={() => loadSession(s._id)}
                className={`w-full text-left p-3 rounded-lg text-sm hover:bg-gray-50 transition-colors ${
                  stream.sessionId === s._id ? 'bg-blue-50 border border-blue-200' : ''
                }`}
              >
                <p className="font-medium text-gray-800 truncate">{s.widgetName || 'Untitled'}</p>
                <p className="text-xs text-gray-400 mt-1">{new Date(s.updatedAt).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {isEmptyState ? (
            <div className="flex-1">
              <TemplateSelector
                onSubmitUrl={handleUrlSubmit}
                onSelectTemplate={handleTemplateSelect}
              />
            </div>
          ) : (
            <>
              {/* Chat Panel */}
              <div className="flex-1 flex flex-col">
                <BuilderChat
                  messages={stream.messages}
                  isStreaming={stream.isStreaming}
                  error={stream.error}
                  knowledgeProgress={stream.knowledgeProgress}
                  onSendMessage={(msg) => stream.sendMessage(msg)}
                  suggestions={STAGE_SUGGESTIONS[stream.stage]}
                />
              </div>

              {/* Context Panel */}
              <ContextPanel
                mode={stream.panelMode}
                clientId={stream.sessionId}
                currentTheme={stream.currentTheme}
                abVariants={stream.abVariants}
                connectedIntegrations={[]}
                onSelectVariant={handleVariantSelect}
              />
            </>
          )}
        </div>
      </div>

      {/* Mobile sessions toggle */}
      <button
        onClick={() => setShowSessions(!showSessions)}
        className="md:hidden fixed bottom-4 left-4 p-3 bg-white rounded-full shadow-lg border border-gray-200"
      >
        📋
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx next build 2>&1 | tail -20`
Expected: Build succeeds (or only non-blocking warnings)

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/builder/page.tsx
git commit -m "feat(builder): rewrite builder page with agentic component architecture"
```

---

### Task 22: Widget postMessage Listener

**Files:**

- Modify: `.claude/widget-builder/scripts/generate-single-theme.js`

**Context:** The Widget.jsx template needs a `message` event listener that accepts `{ type: 'theme_update', theme: ThemeJSON }` from the parent window and applies CSS variable changes without a full reload. This enables the LivePreview hot-reload feature.

- [ ] **Step 1: Add postMessage listener to the Widget.jsx template**

In the `genWidget(c)` function of `generate-single-theme.js`, find the `useEffect` section and add a new `useEffect` block that:

1. Adds a `message` event listener on `window`
2. Checks `event.data.type === 'theme_update'`
3. Extracts `event.data.theme` as the new theme object
4. Updates CSS custom properties on the Shadow DOM host element:
   - `--aw-primary` → `theme.cssPrimary`
   - `--aw-accent` → `theme.cssAccent`
5. Cleans up listener on unmount

Add this inside the Widget component function body, after the existing useEffect hooks:

```javascript
// Live preview hot-reload via postMessage
useEffect(() => {
  const handler = (event) => {
    if (event.data?.type === 'theme_update' && event.data.theme) {
      const theme = event.data.theme;
      const root = document.querySelector('[data-widget-root]');
      if (root) {
        if (theme.cssPrimary) root.style.setProperty('--aw-primary', theme.cssPrimary);
        if (theme.cssAccent) root.style.setProperty('--aw-accent', theme.cssAccent);
      }
    }
  };
  window.addEventListener('message', handler);
  return () => window.removeEventListener('message', handler);
}, []);
```

Also ensure the widget root element has `data-widget-root` attribute in the template.

- [ ] **Step 2: Verify the widget builder still works**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && node .claude/widget-builder/scripts/generate-single-theme.js alrawimc 2>&1 | tail -5`
Expected: "Generated 7 files" or similar success message

- [ ] **Step 3: Commit**

```bash
git add .claude/widget-builder/scripts/generate-single-theme.js
git commit -m "feat(widget): add postMessage listener for live preview hot-reload"
```

---

### Task 23: Run All Tests and Verify

- [ ] **Step 1: Run the full test suite**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx vitest run`
Expected: All tests PASS (existing 141 + new builder tests)

- [ ] **Step 2: Verify build compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant/.worktrees/saas-platform && npx next build 2>&1 | tail -30`
Expected: Build succeeds

- [ ] **Step 3: Final commit with all changes**

If any uncommitted fixes remain:

```bash
git add -A
git commit -m "fix(builder): address remaining build/test issues"
```
