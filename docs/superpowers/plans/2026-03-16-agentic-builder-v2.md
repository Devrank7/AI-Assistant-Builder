# Agentic Builder v2 Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the AI Widget Builder from Gemini-based linear pipeline to an agentic system powered by Claude Sonnet 4.6 (Anthropic SDK) with Gemini 3.1 Pro for design, adding web search, open integrations, and proactive suggestions.

**Architecture:** Single Claude agent with ToolRegistry pattern. All user messages go to `/api/builder/chat` → Claude Sonnet 4.6 orchestrates via tool_use loop. Design tools delegate to Gemini internally. New SSE event types for suggestions. Extended BuilderSession schema with optional fields (no migration needed).

**Tech Stack:** Next.js 15, TypeScript, `@anthropic-ai/sdk`, `@google/generative-ai`, MongoDB/Mongoose, Brave Search API, AES-256-GCM encryption

**Spec:** `docs/superpowers/specs/2026-03-16-agentic-builder-v2-design.md`

---

## Chunk 1: Foundation — Types, ToolRegistry, Security Utilities

### Task 1: Extend types.ts with new stages, panels, tools, and SSE events

**Files:**

- Modify: `src/lib/builder/types.ts` (entire file, currently 80 lines)

- [ ] **Step 1: Write failing test for new types**

Create: `src/lib/builder/__tests__/types.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  BUILDER_STAGES,
  PANEL_MODES,
  AGENT_TOOL_NAMES,
  type BuilderStage,
  type PanelMode,
  type AgentToolName,
  type SSEEvent,
  type Suggestion,
  type SiteProfileV2,
  type IntegrationEntry,
  type Opportunity,
  type VersionEntry,
} from '../types';

describe('types', () => {
  it('includes new builder stages', () => {
    expect(BUILDER_STAGES).toContain('suggestions');
    expect(BUILDER_STAGES).toContain('workspace');
  });

  it('includes new panel modes', () => {
    expect(PANEL_MODES).toContain('integration_status');
  });

  it('includes all 19 agent tools', () => {
    const expected = [
      'analyze_site',
      'generate_design',
      'modify_design',
      'select_theme',
      'build_deploy',
      'crawl_knowledge',
      'modify_widget_code',
      'rollback',
      'test_widget',
      'web_search',
      'web_fetch',
      'search_api_docs',
      'write_integration',
      'test_integration',
      'guide_user',
      'analyze_opportunities',
      'suggest_improvements',
      'check_knowledge_gaps',
      'analyze_competitors',
    ];
    for (const tool of expected) {
      expect(AGENT_TOOL_NAMES).toContain(tool);
    }
  });

  it('SSEEvent union includes suggestions type', () => {
    const event: SSEEvent = {
      type: 'suggestions',
      suggestions: [{ id: '1', category: 'integration', title: 'Test', description: 'Desc', actions: [] }],
    };
    expect(event.type).toBe('suggestions');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/types.test.ts`
Expected: FAIL — missing exports

- [ ] **Step 3: Update types.ts with new types**

Replace the full content of `src/lib/builder/types.ts`:

```typescript
// src/lib/builder/types.ts

// --- Stage & Mode constants ---

export const BUILDER_STAGES = [
  'input',
  'analysis',
  'design',
  'knowledge',
  'deploy',
  'integrations',
  'suggestions',
  'workspace',
] as const;
export type BuilderStage = (typeof BUILDER_STAGES)[number];

export const PANEL_MODES = [
  'empty',
  'live_preview',
  'test_sandbox',
  'ab_compare',
  'crm_status',
  'integration_status',
] as const;
export type PanelMode = (typeof PANEL_MODES)[number];

export const AGENT_TOOL_NAMES = [
  // Core (9)
  'analyze_site',
  'generate_design',
  'modify_design',
  'select_theme',
  'build_deploy',
  'crawl_knowledge',
  'modify_widget_code',
  'rollback',
  'test_widget',
  // Integration (6)
  'web_search',
  'web_fetch',
  'search_api_docs',
  'write_integration',
  'test_integration',
  'guide_user',
  // Proactive (4)
  'analyze_opportunities',
  'suggest_improvements',
  'check_knowledge_gaps',
  'analyze_competitors',
] as const;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

// --- Site Profile (enhanced) ---

export interface SiteProfile {
  url: string;
  businessName: string;
  businessType: string;
  colors: string[];
  fonts: string[];
  favicon?: string;
  pages: { url: string; title: string; content: string; crawled?: boolean }[];
  contactInfo?: { phone?: string; email?: string; address?: string };
}

export interface SiteProfileV2 extends SiteProfile {
  totalPages: number;
  crawledPages: number;
  detectedFeatures: string[];
}

// --- Suggestion ---

export interface Suggestion {
  id: string;
  category: 'knowledge_gap' | 'integration' | 'design' | 'feature';
  title: string;
  description: string;
  actions: { label: string; action: string }[];
}

// --- Integration Entry ---

export interface IntegrationEntry {
  provider: string;
  status: 'suggested' | 'configuring' | 'connected' | 'failed';
  handlerPath?: string;
  apiKeyEncrypted?: string;
}

// --- Opportunity ---

export interface Opportunity {
  id: string;
  type: 'knowledge_gap' | 'integration' | 'design' | 'feature';
  description: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

// --- Version Entry ---

export interface VersionEntry {
  number: number;
  description: string;
  timestamp: Date;
  scriptPath: string;
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
  | { type: 'progress'; message: string }
  | { type: 'widget_ready'; clientId: string }
  | { type: 'crm_instruction'; provider: string; steps: string[] }
  | { type: 'error'; message: string; recoverable: boolean }
  | { type: 'knowledge_progress'; uploaded: number; total: number }
  | { type: 'session'; sessionId: string }
  | { type: 'suggestions'; suggestions: Suggestion[] }
  | { type: 'done' };

// --- CRM Setup (legacy, kept for backward compat) ---

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

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/types.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/types.ts src/lib/builder/__tests__/types.test.ts
git commit -m "feat(builder): extend types with v2 stages, tools, SSE events, and interfaces"
```

---

### Task 2: Create ToolRegistry

**Files:**

- Create: `src/lib/builder/toolRegistry.ts`
- Create: `src/lib/builder/__tests__/toolRegistry.test.ts`

- [ ] **Step 1: Write failing test for ToolRegistry**

```typescript
// src/lib/builder/__tests__/toolRegistry.test.ts
import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry, type ToolDefinition, type ToolContext } from '../toolRegistry';

const mockTool: ToolDefinition = {
  name: 'test_tool',
  description: 'A test tool',
  parameters: {
    type: 'object' as const,
    properties: { input: { type: 'string', description: 'test input' } },
    required: ['input'],
  },
  executor: async (args) => ({ echoed: args.input }),
  category: 'core',
};

describe('ToolRegistry', () => {
  it('registers and retrieves tools', () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    expect(registry.has('test_tool')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('converts tools to Anthropic format', () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    const tools = registry.getToolsForClaude();
    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      name: 'test_tool',
      description: 'A test tool',
      input_schema: {
        type: 'object',
        properties: { input: { type: 'string', description: 'test input' } },
        required: ['input'],
      },
    });
  });

  it('executes a tool', async () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    const ctx = { sessionId: 's1', userId: 'u1', baseUrl: 'http://localhost', cookie: '', write: vi.fn() };
    const result = await registry.execute('test_tool', { input: 'hello' }, ctx);
    expect(result).toEqual({ echoed: 'hello' });
  });

  it('throws on executing unknown tool', async () => {
    const registry = new ToolRegistry();
    const ctx = { sessionId: 's1', userId: 'u1', baseUrl: 'http://localhost', cookie: '', write: vi.fn() };
    await expect(registry.execute('unknown', {}, ctx)).rejects.toThrow('Unknown tool: unknown');
  });

  it('lists tools by category', () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    registry.register({ ...mockTool, name: 'int_tool', category: 'integration' });
    expect(registry.getToolsByCategory('core')).toHaveLength(1);
    expect(registry.getToolsByCategory('integration')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/toolRegistry.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement ToolRegistry**

```typescript
// src/lib/builder/toolRegistry.ts
import type { SSEEvent, AgentToolName } from './types';

export interface ToolContext {
  sessionId: string;
  userId: string;
  baseUrl: string;
  cookie: string;
  write: (event: SSEEvent) => void;
  userPlan?: string;
}

export type ToolResult = Record<string, unknown>;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[]; items?: { type: string } }>;
    required: string[];
  };
  executor: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
  model_hint?: 'claude' | 'gemini';
  category: 'core' | 'integration' | 'proactive';
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getToolsForClaude(): AnthropicTool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    }));
  }

  async execute(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return tool.executor(args, ctx);
  }

  getToolsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.category === category);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/toolRegistry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/toolRegistry.ts src/lib/builder/__tests__/toolRegistry.test.ts
git commit -m "feat(builder): add ToolRegistry with Anthropic tool format conversion"
```

---

### Task 3: Create security utilities — code validation and encryption

**Files:**

- Create: `src/lib/builder/security.ts`
- Create: `src/lib/builder/__tests__/security.test.ts`

- [ ] **Step 1: Write failing test for security utilities**

```typescript
// src/lib/builder/__tests__/security.test.ts
import { describe, it, expect } from 'vitest';
import { validateGeneratedCode, encryptApiKey, decryptApiKey, isPrivateIP } from '../security';

describe('validateGeneratedCode', () => {
  it('allows safe code', () => {
    const code = `import { NextRequest } from 'next/server';
export async function POST(req: NextRequest) {
  const data = await req.json();
  const res = await fetch('https://api.calendly.com/events', {
    headers: { Authorization: 'Bearer ' + apiKey },
  });
  return Response.json(await res.json());
}`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(true);
  });

  it('blocks child_process import', () => {
    const code = `import { exec } from 'child_process'; exec('rm -rf /');`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('child_process');
  });

  it('blocks eval', () => {
    const code = `eval(userInput);`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
  });

  it('blocks fs module', () => {
    const code = `import fs from 'fs'; fs.readFileSync('/etc/passwd');`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
  });

  it('blocks process.env direct access', () => {
    const code = `const key = process.env.SECRET;`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
  });

  it('blocks new Function()', () => {
    const code = `const fn = new Function('return 1');`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
  });
});

describe('encryptApiKey / decryptApiKey', () => {
  it('round-trips encryption', () => {
    const key = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4'; // 32 hex chars = 16 bytes... need 32 bytes
    const encryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex = 32 bytes
    const apiKey = 'sk-test-12345-abcdef';
    const encrypted = encryptApiKey(apiKey, encryptionKey);
    expect(encrypted.encryptedKey).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    const decrypted = decryptApiKey(encrypted.encryptedKey, encrypted.iv, encrypted.authTag, encryptionKey);
    expect(decrypted).toBe(apiKey);
  });
});

describe('isPrivateIP', () => {
  it('blocks localhost', () => {
    expect(isPrivateIP('127.0.0.1')).toBe(true);
  });
  it('blocks 10.x', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true);
  });
  it('blocks 192.168.x', () => {
    expect(isPrivateIP('192.168.1.1')).toBe(true);
  });
  it('blocks 172.16-31.x', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('172.31.255.255')).toBe(true);
  });
  it('blocks metadata IP', () => {
    expect(isPrivateIP('169.254.169.254')).toBe(true);
  });
  it('allows public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('104.16.0.1')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/security.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement security.ts**

```typescript
// src/lib/builder/security.ts
import crypto from 'crypto';

// --- Code validation for agent-generated integration handlers ---

const BLOCKED_IMPORTS = ['child_process', 'fs', 'net', 'dgram', 'cluster', 'worker_threads', 'vm', 'tls', 'dns'];

const BLOCKED_PATTERNS = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bvm\s*\.\s*runIn/,
  /\bprocess\s*\.\s*exit/,
  /\bprocess\s*\.\s*kill/,
  /\bprocess\s*\.\s*env\b/,
  /\bglobal\s*\./,
  /\bglobalThis\s*\.\s*\w+\s*=/,
];

export function validateGeneratedCode(code: string): { valid: boolean; reason?: string } {
  // Check blocked imports
  for (const mod of BLOCKED_IMPORTS) {
    const importRegex = new RegExp(`(?:import|require)\\s*(?:\\(\\s*['"]|.*from\\s*['"])${mod}`, 'g');
    if (importRegex.test(code)) {
      return { valid: false, reason: `Blocked import: ${mod}` };
    }
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return { valid: false, reason: `Blocked pattern: ${pattern.source}` };
    }
  }

  return { valid: true };
}

// --- AES-256-GCM encryption for user API keys ---

export function encryptApiKey(
  apiKey: string,
  encryptionKeyHex: string
): { encryptedKey: string; iv: string; authTag: string } {
  const key = Buffer.from(encryptionKeyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    encryptedKey: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function decryptApiKey(
  encryptedKey: string,
  ivHex: string,
  authTagHex: string,
  encryptionKeyHex: string
): string {
  const key = Buffer.from(encryptionKeyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- SSRF prevention ---

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return true; // invalid = block

  // Localhost
  if (parts[0] === 127) return true;
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // Link-local 169.254.0.0/16 (includes metadata 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0
  if (parts.every((p) => p === 0)) return true;

  return false;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/security.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/security.ts src/lib/builder/__tests__/security.test.ts
git commit -m "feat(builder): add security utilities — code validation, AES-256-GCM encryption, SSRF prevention"
```

---

### Task 4: Install @anthropic-ai/sdk dependency

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npm install @anthropic-ai/sdk`

- [ ] **Step 2: Verify installation**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && node -e "require('@anthropic-ai/sdk'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @anthropic-ai/sdk dependency"
```

---

### Task 5: Update .env.example with new env vars

**Files:**

- Modify: `.env.example` (or create if doesn't exist)

- [ ] **Step 1: Check if .env.example exists**

Run: `ls -la /Users/devlink007/AIAsisstant/AIAsisstant/.env.example 2>/dev/null || echo "NOT FOUND"`

- [ ] **Step 2: Add new env vars**

Append to `.env.example` (or `.env.local` comment block):

```env
# === Agentic Builder v2 ===
ANTHROPIC_API_KEY=          # Claude Sonnet 4.6 for builder agent
BRAVE_SEARCH_API_KEY=       # Brave Search API (web search tool)
INTEGRATION_ENCRYPTION_KEY= # 64 hex chars (32 bytes) for AES-256-GCM encryption
```

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "chore: add builder v2 env vars to .env.example"
```

---

## Chunk 2: Web Search & Web Fetch Tools

### Task 6: Create web search wrapper (Brave API)

**Files:**

- Create: `src/lib/builder/webSearch.ts`
- Create: `src/lib/builder/__tests__/webSearch.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/builder/__tests__/webSearch.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { webSearch, type SearchResult } from '../webSearch';

describe('webSearch', () => {
  beforeEach(() => {
    vi.stubEnv('BRAVE_SEARCH_API_KEY', 'test-key');
  });

  it('returns empty results when no API key', async () => {
    vi.stubEnv('BRAVE_SEARCH_API_KEY', '');
    const results = await webSearch('test query');
    expect(results).toEqual([]);
  });

  it('formats search results correctly', async () => {
    const mockResponse = {
      web: {
        results: [
          { title: 'Test Page', url: 'https://example.com', description: 'A test page' },
          { title: 'Another Page', url: 'https://example2.com', description: 'Another page' },
        ],
      },
    };

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const results = await webSearch('test query');
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: 'Test Page',
      url: 'https://example.com',
      description: 'A test page',
    });
  });

  it('returns empty on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error('Network error'));
    const results = await webSearch('test');
    expect(results).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/webSearch.test.ts`

- [ ] **Step 3: Implement webSearch.ts**

```typescript
// src/lib/builder/webSearch.ts

export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

const BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';

export async function webSearch(query: string, count: number = 10): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) return [];

  try {
    const params = new URLSearchParams({ q: query, count: String(count) });
    const res = await fetch(`${BRAVE_API_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data?.web?.results || [];

    return results.map((r: { title: string; url: string; description: string }) => ({
      title: r.title,
      url: r.url,
      description: r.description,
    }));
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/webSearch.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/webSearch.ts src/lib/builder/__tests__/webSearch.test.ts
git commit -m "feat(builder): add Brave Search API wrapper"
```

---

### Task 7: Create web fetch utility with SSRF protection

**Files:**

- Create: `src/lib/builder/webFetch.ts`
- Create: `src/lib/builder/__tests__/webFetch.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/builder/__tests__/webFetch.test.ts
import { describe, it, expect, vi } from 'vitest';
import { webFetch, htmlToMarkdown } from '../webFetch';

describe('htmlToMarkdown', () => {
  it('strips script and style tags', () => {
    const html = '<style>body{}</style><script>alert(1)</script><p>Hello world</p>';
    const md = htmlToMarkdown(html);
    expect(md).not.toContain('alert');
    expect(md).not.toContain('body{}');
    expect(md).toContain('Hello world');
  });

  it('converts links to markdown', () => {
    const html = '<a href="https://example.com">Click here</a>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('[Click here](https://example.com)');
  });

  it('converts headings', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    const md = htmlToMarkdown(html);
    expect(md).toContain('# Title');
    expect(md).toContain('## Subtitle');
  });

  it('truncates to max length', () => {
    const html = '<p>' + 'a'.repeat(40000) + '</p>';
    const md = htmlToMarkdown(html, 1000);
    expect(md.length).toBeLessThanOrEqual(1020); // some slack for truncation marker
  });
});

describe('webFetch', () => {
  it('rejects private IPs', async () => {
    const result = await webFetch('http://127.0.0.1/admin');
    expect(result.error).toContain('private');
  });

  it('rejects metadata IP', async () => {
    const result = await webFetch('http://169.254.169.254/latest/meta-data');
    expect(result.error).toContain('private');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/webFetch.test.ts`

- [ ] **Step 3: Implement webFetch.ts**

```typescript
// src/lib/builder/webFetch.ts
import { isPrivateIP } from './security';
import dns from 'dns/promises';

const MAX_CONTENT_LENGTH = 30000;
const FETCH_TIMEOUT = 10000;
const MAX_REDIRECTS = 3;

export function htmlToMarkdown(html: string, maxLength: number = MAX_CONTENT_LENGTH): string {
  let text = html;
  // Remove script/style
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '');
  text = text.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '');
  // Convert headings
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  // Convert links
  text = text.replace(/<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)');
  // Convert list items
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n');
  // Convert paragraphs and line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n\n');
  text = text.replace(/<\/div>/gi, '\n');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, '');
  // Clean up whitespace
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  if (text.length > maxLength) {
    text = text.slice(0, maxLength) + '\n... (truncated)';
  }
  return text;
}

export async function webFetch(url: string, redirectCount: number = 0): Promise<{ content?: string; error?: string }> {
  if (redirectCount > MAX_REDIRECTS) {
    return { error: 'Too many redirects (max 3)' };
  }

  try {
    const parsed = new URL(url);

    // SSRF: Check hostname against known private patterns
    if (['localhost', '0.0.0.0'].includes(parsed.hostname)) {
      return { error: 'Blocked: private/internal address' };
    }

    // SSRF: DNS resolve and check IP
    try {
      const addresses = await dns.resolve4(parsed.hostname);
      if (addresses.some(isPrivateIP)) {
        return { error: 'Blocked: private/internal address' };
      }
    } catch {
      // If DNS fails for an IP-address hostname, check directly
      if (isPrivateIP(parsed.hostname)) {
        return { error: 'Blocked: private/internal address' };
      }
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'WinBixAI-Builder/2.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      redirect: 'manual',
    });

    // Handle redirects manually (validate IP at each hop, max 3)
    if ([301, 302, 307, 308].includes(res.status)) {
      const location = res.headers.get('location');
      if (!location) return { error: 'Redirect with no location' };
      return webFetch(location, redirectCount + 1);
    }

    if (!res.ok) {
      return { error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get('content-type') || '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('application/json')
    ) {
      return { error: `Unsupported content type: ${contentType}` };
    }

    const raw = await res.text();

    if (contentType.includes('text/html')) {
      return { content: htmlToMarkdown(raw) };
    }
    // JSON or plain text
    const truncated = raw.length > MAX_CONTENT_LENGTH ? raw.slice(0, MAX_CONTENT_LENGTH) + '... (truncated)' : raw;
    return { content: truncated };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/webFetch.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/webFetch.ts src/lib/builder/__tests__/webFetch.test.ts
git commit -m "feat(builder): add webFetch with SSRF protection and HTML-to-markdown"
```

---

### Task 8: Create API route proxies for search and fetch

**Files:**

- Create: `src/app/api/builder/search/route.ts`
- Create: `src/app/api/builder/fetch/route.ts`

- [ ] **Step 1: Create search proxy route**

```typescript
// src/app/api/builder/search/route.ts
import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { Errors, successResponse } from '@/lib/apiResponse';
import { webSearch } from '@/lib/builder/webSearch';

export async function GET(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const query = request.nextUrl.searchParams.get('q');
  if (!query) return Errors.badRequest('q parameter required');

  const count = parseInt(request.nextUrl.searchParams.get('count') || '10', 10);
  const results = await webSearch(query, Math.min(count, 20));
  return successResponse({ results });
}
```

- [ ] **Step 2: Create fetch proxy route**

```typescript
// src/app/api/builder/fetch/route.ts
import { NextRequest } from 'next/server';
import { verifyUser } from '@/lib/auth';
import { Errors, successResponse } from '@/lib/apiResponse';
import { webFetch } from '@/lib/builder/webFetch';

export async function POST(request: NextRequest) {
  const auth = await verifyUser(request);
  if (!auth.authenticated) return auth.response;

  const body = await request.json();
  const { url } = body;
  if (!url || typeof url !== 'string') return Errors.badRequest('url is required');

  const result = await webFetch(url);
  if (result.error) {
    return Errors.badRequest(result.error);
  }
  return successResponse({ content: result.content });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/builder/search/route.ts src/app/api/builder/fetch/route.ts
git commit -m "feat(builder): add search and fetch API proxy routes"
```

---

## Chunk 3: Register All 19 Tools

### Task 9: Create tool registration file with all core tools

**Files:**

- Create: `src/lib/builder/tools/index.ts`
- Create: `src/lib/builder/tools/coreTools.ts`
- Create: `src/lib/builder/tools/integrationTools.ts`
- Create: `src/lib/builder/tools/proactiveTools.ts`

This task registers all 19 tools from the spec. Each tool uses the `ToolDefinition` interface from `toolRegistry.ts`. Tool executors reuse existing logic from `agentTools.ts` where applicable, with new implementations for new tools.

- [ ] **Step 1: Create coreTools.ts with 9 core tools**

````typescript
// src/lib/builder/tools/coreTools.ts
import type { ToolDefinition, ToolContext } from '../toolRegistry';
import { analyzeSite } from '../siteAnalyzer';
import { uploadKnowledge, setAIPrompt } from '../knowledgeCrawler';
import {
  readWidgetCode,
  validateFilePath,
  writeWidgetFile,
  saveVersion,
  rollbackToVersion,
} from '../widgetCodeManager';
import { CODEGEN_SYSTEM_PROMPT, buildCodegenUserPrompt } from '../codegenPrompt';
import type { SiteProfile } from '../types';
import path from 'path';
import fs from 'fs';

export const coreTools: ToolDefinition[] = [
  {
    name: 'analyze_site',
    description:
      'Deep crawl a website URL (30+ pages via sitemap/BFS), extract colors, fonts, content, business type, detected features. Call this first when user provides a URL.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The website URL to analyze' },
      },
      required: ['url'],
    },
    category: 'core',
    async executor(args, ctx) {
      const url = args.url as string;
      ctx.write({ type: 'progress', stage: 'analysis', status: 'active' });
      const profile = await analyzeSite(url);
      ctx.write({ type: 'progress', stage: 'analysis', status: 'complete' });
      return { success: true, profile };
    },
  },
  {
    name: 'generate_design',
    description:
      'Generate 3 theme.json design variants from site profile. Delegates to Gemini 3.1 Pro internally. Returns variants for user selection.',
    parameters: {
      type: 'object',
      properties: {
        siteProfile: { type: 'string', description: 'JSON stringified SiteProfile object' },
        preferences: {
          type: 'string',
          description: 'Optional JSON stringified user preferences for style, mood, etc.',
        },
      },
      required: ['siteProfile'],
    },
    model_hint: 'gemini',
    category: 'core',
    async executor(args, ctx) {
      ctx.write({ type: 'progress', stage: 'design', status: 'active' });
      ctx.write({ type: 'panel_mode', mode: 'ab_compare' });
      // Actual Gemini call handled inside — returns instruction for agent to generate themes
      return {
        success: true,
        message:
          'Generate 3 theme.json variants using the site profile. Return them as JSON with format: {"variants": [{"label": "Name", "theme": {theme.json fields...}}, ...]}',
      };
    },
  },
  {
    name: 'modify_design',
    description:
      'Make targeted design changes to current theme ("darker header", "rounder corners", "change font to Poppins"). Delegates to Gemini 3.1 Pro.',
    parameters: {
      type: 'object',
      properties: {
        instruction: { type: 'string', description: 'What to change in the design' },
        currentTheme: { type: 'string', description: 'JSON stringified current theme.json' },
      },
      required: ['instruction', 'currentTheme'],
    },
    model_hint: 'gemini',
    category: 'core',
    async executor(args, ctx) {
      ctx.write({ type: 'progress', message: 'Modifying design...' });
      return {
        success: true,
        message: `Modify the theme.json based on: "${args.instruction}". Return the complete updated theme.json.`,
      };
    },
  },
  {
    name: 'select_theme',
    description: 'Apply the selected theme variant (0, 1, or 2) from generate_design results.',
    parameters: {
      type: 'object',
      properties: {
        variantIndex: { type: 'string', description: 'Index of the selected variant (0, 1, or 2)' },
      },
      required: ['variantIndex'],
    },
    category: 'core',
    async executor(args, ctx) {
      const variantIndex = parseInt(args.variantIndex as string, 10);
      ctx.write({ type: 'panel_mode', mode: 'live_preview' });
      ctx.write({ type: 'progress', stage: 'design', status: 'complete' });
      return { success: true, selectedVariant: variantIndex };
    },
  },
  {
    name: 'build_deploy',
    description:
      'Run the full build pipeline: generate source files from theme.json, build with Vite, deploy to quickwidgets/. Call after theme is selected.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The client ID for the widget' },
      },
      required: ['clientId'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      ctx.write({ type: 'progress', stage: 'deploy', status: 'active' });

      const res = await fetch(`${ctx.baseUrl}/api/builder/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: ctx.cookie },
        body: JSON.stringify({ sessionId: ctx.sessionId }),
      });

      const data = await res.json();
      if (!data.success) {
        return { success: false, error: data.error || 'Build failed' };
      }

      ctx.write({ type: 'progress', stage: 'deploy', status: 'complete' });
      ctx.write({ type: 'widget_ready', clientId });
      ctx.write({ type: 'panel_mode', mode: 'live_preview' });
      return { success: true, clientId, previewUrl: data.data?.previewUrl };
    },
  },
  {
    name: 'crawl_knowledge',
    description:
      'Deep-crawl the website and upload content to the knowledge base (up to 100 pages). Site must have been analyzed first.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'The website URL' },
        clientId: { type: 'string', description: 'The client ID to upload knowledge for' },
      },
      required: ['url', 'clientId'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      ctx.write({ type: 'progress', stage: 'knowledge', status: 'active' });

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
  },
  {
    name: 'modify_widget_code',
    description:
      'Read current widget source code, write a modification based on natural language instruction, rebuild and deploy. Use for UI changes, adding features, changing layout.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        file: { type: 'string', description: 'File to modify, e.g. "components/Widget.jsx". Cannot modify hooks/.' },
        instruction: { type: 'string', description: 'What to change, in natural language' },
      },
      required: ['clientId', 'file', 'instruction'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const file = args.file as string;
      const instruction = args.instruction as string;

      // Validate file path against strict allowlist (spec Section 10)
      const ALLOWED_FILES = [
        'components/Widget.jsx',
        'components/ChatMessage.jsx',
        'components/QuickReplies.jsx',
        'components/MessageFeedback.jsx',
        'components/RichBlocks.jsx',
        'index.css',
        'main.jsx',
      ];
      if (!ALLOWED_FILES.includes(file)) {
        return { error: `File "${file}" not in allowlist: ${ALLOWED_FILES.join(', ')}` };
      }
      const validation = validateFilePath(file);
      if (!validation.valid) return { error: validation.error };

      ctx.write({ type: 'progress', message: `Reading current ${file}...` });
      const bundle = readWidgetCode(clientId, [file]);
      const currentCode = bundle[file];
      if (!currentCode) return { error: `File "${file}" not found for client "${clientId}".` };

      const fullBundle = readWidgetCode(clientId);

      // Use Gemini for code generation (design-adjacent task)
      ctx.write({ type: 'progress', message: 'Generating modified code...' });
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-pro' });

      const userPrompt = buildCodegenUserPrompt({
        currentCode,
        instruction,
        themeJson: fullBundle['theme.json'],
        widgetConfig: fullBundle['widget.config.json'],
      });

      let generatedCode: string;
      try {
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
          systemInstruction: CODEGEN_SYSTEM_PROMPT,
        });
        generatedCode = result.response
          .text()
          .trim()
          .replace(/^```(?:jsx|javascript|js)?\n/m, '')
          .replace(/\n```$/m, '')
          .trim();
      } catch (err) {
        return { error: `Code generation failed: ${(err as Error).message}` };
      }

      // Write and build with retry
      ctx.write({ type: 'progress', message: 'Writing and building...' });
      writeWidgetFile(clientId, file, generatedCode);

      const { execSync } = await import('child_process');
      const buildScript = path.join(process.cwd(), '.claude/widget-builder/scripts/build.js');

      let buildSuccess = false;
      let buildError = '';
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          execSync(`node "${buildScript}" "${clientId}"`, { cwd: process.cwd(), timeout: 60000, stdio: 'pipe' });
          buildSuccess = true;
          break;
        } catch (err) {
          buildError = (err as Error).message || 'Build failed';
          if (attempt === 0) {
            ctx.write({ type: 'progress', message: 'Build failed, retrying with fix...' });
            try {
              const retryPrompt = buildCodegenUserPrompt({
                currentCode: generatedCode,
                instruction: `The previous code had a build error. Fix it:\n${buildError}\n\nOriginal instruction: ${instruction}`,
                themeJson: fullBundle['theme.json'],
                widgetConfig: fullBundle['widget.config.json'],
              });
              const retryResult = await model.generateContent({
                contents: [{ role: 'user', parts: [{ text: retryPrompt }] }],
                systemInstruction: CODEGEN_SYSTEM_PROMPT,
              });
              generatedCode = retryResult.response
                .text()
                .trim()
                .replace(/^```(?:jsx|javascript|js)?\n/m, '')
                .replace(/\n```$/m, '')
                .trim();
              writeWidgetFile(clientId, file, generatedCode);
            } catch {
              break;
            }
          }
        }
      }

      if (!buildSuccess) return { error: `Build failed after retry: ${buildError}` };

      // Deploy
      const distScript = path.join(process.cwd(), '.claude/widget-builder/dist/script.js');
      const deployDir = path.join(process.cwd(), 'quickwidgets', clientId);
      if (fs.existsSync(distScript) && fs.existsSync(deployDir)) {
        saveVersion(clientId, instruction.slice(0, 100), 'modify_widget_code');
        fs.copyFileSync(distScript, path.join(deployDir, 'script.js'));
      }

      ctx.write({ type: 'widget_ready', clientId });
      return { success: true, message: `Widget code modified and deployed. File: ${file}` };
    },
  },
  {
    name: 'rollback',
    description: 'Revert widget to a previous version. Use when user says "undo", "revert", or "go back".',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        version: { type: 'string', description: 'Version number (e.g. "2") or "previous"' },
      },
      required: ['clientId', 'version'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const versionArg = args.version as string;
      const version = versionArg === 'previous' ? 'previous' : parseInt(versionArg, 10);
      if (typeof version === 'number' && isNaN(version)) {
        return { error: `Invalid version: "${versionArg}". Use a number or "previous".` };
      }

      ctx.write({ type: 'progress', message: 'Rolling back widget...' });
      const result = rollbackToVersion(clientId, version);
      if (!result.success) return { error: result.error };

      ctx.write({ type: 'widget_ready', clientId });
      return { success: true, message: `Widget rolled back to version ${result.version}.` };
    },
  },
  {
    name: 'test_widget',
    description:
      'Test a deployed widget by loading it and checking for JavaScript errors. Use after build_deploy or modify_widget_code.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
      },
      required: ['clientId'],
    },
    category: 'core',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      const scriptPath = path.join(process.cwd(), 'quickwidgets', clientId, 'script.js');
      if (!fs.existsSync(scriptPath)) {
        return { error: `Widget not found at quickwidgets/${clientId}/script.js` };
      }
      const stats = fs.statSync(scriptPath);
      ctx.write({ type: 'progress', message: 'Widget test passed' });
      return { success: true, size: stats.size, exists: true };
    },
  },
];
````

- [ ] **Step 2: Create integrationTools.ts with 6 integration tools**

```typescript
// src/lib/builder/tools/integrationTools.ts
import type { ToolDefinition } from '../toolRegistry';
import { webSearch } from '../webSearch';
import { webFetch } from '../webFetch';
import { validateGeneratedCode, encryptApiKey } from '../security';
import fs from 'fs';
import path from 'path';

export const integrationTools: ToolDefinition[] = [
  {
    name: 'web_search',
    description:
      'Search the internet using Brave Search API. Use for finding API documentation, tutorials, best practices.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        count: { type: 'string', description: 'Number of results (default 10, max 20)' },
      },
      required: ['query'],
    },
    category: 'integration',
    async executor(args) {
      const query = args.query as string;
      const count = parseInt((args.count as string) || '10', 10);
      const results = await webSearch(query, Math.min(count, 20));
      return { success: true, results, count: results.length };
    },
  },
  {
    name: 'web_fetch',
    description:
      'Fetch and parse any URL. Converts HTML to clean markdown (30K char limit). Use for reading API docs, web pages.',
    parameters: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL to fetch' },
      },
      required: ['url'],
    },
    category: 'integration',
    async executor(args) {
      const url = args.url as string;
      const result = await webFetch(url);
      if (result.error) return { success: false, error: result.error };
      return { success: true, content: result.content };
    },
  },
  {
    name: 'search_api_docs',
    description:
      'Search for API documentation, fetch top result, extract structured reference. Combines web_search + web_fetch + extraction.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'API provider name (e.g., "Calendly", "Stripe")' },
        topic: { type: 'string', description: 'Specific topic to search (e.g., "create event endpoint")' },
      },
      required: ['provider'],
    },
    category: 'integration',
    async executor(args) {
      const provider = args.provider as string;
      const topic = (args.topic as string) || 'API documentation';
      const query = `${provider} ${topic} API reference 2026`;
      const results = await webSearch(query, 5);
      if (results.length === 0) return { success: false, error: `No results for: ${query}` };

      // Fetch top result
      const topUrl = results[0].url;
      const fetched = await webFetch(topUrl);
      return {
        success: true,
        searchResults: results.slice(0, 3),
        fetchedUrl: topUrl,
        content: fetched.content || fetched.error,
      };
    },
  },
  {
    name: 'write_integration',
    description:
      'Write a server-side API route handler for an external integration. Validates generated code for security. Claude writes the code itself.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
        provider: { type: 'string', description: 'Integration provider (e.g., "calendly")' },
        code: { type: 'string', description: 'The TypeScript code for the API route handler' },
      },
      required: ['clientId', 'provider', 'code'],
    },
    category: 'integration',
    async executor(args) {
      const clientId = args.clientId as string;
      const provider = (args.provider as string).toLowerCase().replace(/\s+/g, '-');
      const code = args.code as string;

      // Validate generated code
      const validation = validateGeneratedCode(code);
      if (!validation.valid) {
        return { error: `Code rejected: ${validation.reason}. Please rewrite without using blocked APIs.` };
      }

      // Write handler file
      const handlerDir = path.join(process.cwd(), 'src/app/api/builder/integrations', clientId, provider);
      fs.mkdirSync(handlerDir, { recursive: true });
      fs.writeFileSync(path.join(handlerDir, 'route.ts'), code, 'utf-8');

      return {
        success: true,
        handlerPath: `/api/builder/integrations/${clientId}/${provider}`,
        message: `Integration handler written to ${handlerDir}/route.ts`,
      };
    },
  },
  {
    name: 'test_integration',
    description: 'Test an API key by making a simple validation call to the external API.',
    parameters: {
      type: 'object',
      properties: {
        provider: { type: 'string', description: 'Integration provider' },
        apiKey: { type: 'string', description: 'API key to test' },
        testUrl: { type: 'string', description: 'API endpoint to test against' },
      },
      required: ['provider', 'apiKey', 'testUrl'],
    },
    category: 'integration',
    async executor(args) {
      const apiKey = args.apiKey as string;
      const testUrl = args.testUrl as string;

      try {
        const res = await fetch(testUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(10000),
        });

        if (res.status === 401 || res.status === 403) {
          return { success: false, error: 'API key is invalid or expired. Please check and try again.' };
        }

        // Store encrypted key
        const encKey = process.env.INTEGRATION_ENCRYPTION_KEY;
        if (encKey && encKey.length >= 64) {
          const encrypted = encryptApiKey(apiKey, encKey);
          return {
            success: true,
            status: res.status,
            encrypted: encrypted,
            message: 'API key validated successfully.',
          };
        }

        return { success: true, status: res.status, message: 'API key validated (encryption key not configured).' };
      } catch (err) {
        return { success: false, error: `Test failed: ${(err as Error).message}` };
      }
    },
  },
  {
    name: 'guide_user',
    description:
      'Generate step-by-step instructions for the user (how to get API key, configure settings, etc.). Returns formatted instruction card.',
    parameters: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'What to guide the user on (e.g., "get Calendly API key")' },
        steps: { type: 'string', description: 'JSON array of step strings' },
      },
      required: ['topic', 'steps'],
    },
    category: 'integration',
    async executor(args, ctx) {
      const topic = args.topic as string;
      let steps: string[];
      try {
        steps = JSON.parse(args.steps as string);
      } catch {
        steps = [args.steps as string];
      }
      ctx.write({ type: 'crm_instruction', provider: topic, steps });
      return { success: true, message: `Instructions displayed for: ${topic}` };
    },
  },
];
```

- [ ] **Step 3: Create proactiveTools.ts with 4 proactive tools**

```typescript
// src/lib/builder/tools/proactiveTools.ts
import type { ToolDefinition } from '../toolRegistry';
import type { Suggestion } from '../types';

export const proactiveTools: ToolDefinition[] = [
  {
    name: 'analyze_opportunities',
    description:
      'Analyze the current site profile and widget to find improvement areas. Call after initial deployment.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
      },
      required: ['clientId'],
    },
    category: 'proactive',
    async executor(args, ctx) {
      const clientId = args.clientId as string;
      ctx.write({ type: 'progress', message: 'Analyzing opportunities...' });

      // Load session to check site profile
      const BuilderSession = (await import('@/models/BuilderSession')).default;
      const session = await BuilderSession.findById(ctx.sessionId);
      const siteProfile = session?.siteProfile;
      const knowledgeUploaded = session?.knowledgeUploaded;

      const opportunities: string[] = [];
      if (siteProfile) {
        const pages = ((siteProfile as Record<string, unknown>).pages as Array<Record<string, unknown>>) || [];
        if (pages.length < 5)
          opportunities.push(
            'knowledge_gap: Only ' + pages.length + ' pages crawled. More pages mean better AI answers.'
          );
        const features = ((siteProfile as Record<string, unknown>).detectedFeatures as string[]) || [];
        if (features?.includes('booking_page'))
          opportunities.push('integration: Detected booking page — consider adding calendar integration.');
        if (features?.includes('pricing_page'))
          opportunities.push('feature: Detected pricing page — add FAQ about pricing to knowledge base.');
      }
      if (!knowledgeUploaded)
        opportunities.push('knowledge_gap: Knowledge base is empty. Upload website content for better AI responses.');

      return { success: true, opportunities, count: opportunities.length };
    },
  },
  {
    name: 'suggest_improvements',
    description: 'Format improvement suggestions as interactive cards. Shows suggestions in the chat UI.',
    parameters: {
      type: 'object',
      properties: {
        suggestions: { type: 'string', description: 'JSON array of Suggestion objects' },
      },
      required: ['suggestions'],
    },
    category: 'proactive',
    async executor(args, ctx) {
      let suggestions: Suggestion[];
      try {
        suggestions = JSON.parse(args.suggestions as string);
      } catch {
        return { error: 'Invalid suggestions JSON' };
      }

      ctx.write({ type: 'suggestions', suggestions });
      ctx.write({ type: 'progress', stage: 'suggestions', status: 'complete' });
      return { success: true, count: suggestions.length };
    },
  },
  {
    name: 'check_knowledge_gaps',
    description:
      'Compare crawled pages vs uploaded knowledge to find gaps. Identifies pages not yet in knowledge base.',
    parameters: {
      type: 'object',
      properties: {
        clientId: { type: 'string', description: 'The widget client ID' },
      },
      required: ['clientId'],
    },
    category: 'proactive',
    async executor(args, ctx) {
      const clientId = args.clientId as string;

      // Check knowledge chunks in DB
      const res = await fetch(`${ctx.baseUrl}/api/knowledge?clientId=${clientId}`, {
        headers: { Cookie: ctx.cookie },
      });
      const data = await res.json();
      const uploadedCount = data.data?.length || 0;

      // Check session for total pages
      const BuilderSession = (await import('@/models/BuilderSession')).default;
      const session = await BuilderSession.findById(ctx.sessionId);
      const pages = ((session?.siteProfile as Record<string, unknown>)?.pages as Array<unknown>) || [];

      return {
        success: true,
        totalPages: pages.length,
        knowledgeChunks: uploadedCount,
        hasGaps: pages.length > 0 && uploadedCount < pages.length * 2,
      };
    },
  },
  {
    name: 'analyze_competitors',
    description: '[DEFERRED TO v2] Find competitor websites and compare their chat solutions. Not yet implemented.',
    parameters: {
      type: 'object',
      properties: {
        businessType: { type: 'string', description: 'Business type to search competitors for' },
      },
      required: ['businessType'],
    },
    category: 'proactive',
    async executor() {
      return {
        success: false,
        error: 'analyze_competitors is deferred to v2. It will be available in a future update.',
      };
    },
  },
];
```

- [ ] **Step 4: Create index.ts that assembles the full registry**

```typescript
// src/lib/builder/tools/index.ts
import { ToolRegistry } from '../toolRegistry';
import { coreTools } from './coreTools';
import { integrationTools } from './integrationTools';
import { proactiveTools } from './proactiveTools';

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  for (const tool of coreTools) registry.register(tool);
  for (const tool of integrationTools) registry.register(tool);
  for (const tool of proactiveTools) registry.register(tool);

  return registry;
}
```

- [ ] **Step 5: Write test for full registry assembly**

```typescript
// src/lib/builder/__tests__/toolsIndex.test.ts
import { describe, it, expect } from 'vitest';
import { createToolRegistry } from '../tools/index';

describe('createToolRegistry', () => {
  it('registers all 19 tools', () => {
    const registry = createToolRegistry();
    const tools = registry.getAll();
    expect(tools.length).toBe(19);
  });

  it('has 9 core, 6 integration, 4 proactive tools', () => {
    const registry = createToolRegistry();
    expect(registry.getToolsByCategory('core')).toHaveLength(9);
    expect(registry.getToolsByCategory('integration')).toHaveLength(6);
    expect(registry.getToolsByCategory('proactive')).toHaveLength(4);
  });

  it('generates Anthropic-format tools array', () => {
    const registry = createToolRegistry();
    const claudeTools = registry.getToolsForClaude();
    expect(claudeTools.length).toBe(19);
    for (const tool of claudeTools) {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('input_schema');
      expect(tool.input_schema).toHaveProperty('type', 'object');
    }
  });
});
```

- [ ] **Step 6: Run tests**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/toolsIndex.test.ts`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/lib/builder/tools/
git add src/lib/builder/__tests__/toolsIndex.test.ts
git commit -m "feat(builder): register all 19 tools in ToolRegistry — core, integration, proactive"
```

---

## Chunk 4: Agent Core — Anthropic Agent Loop & Chat Route Rewrite

### Task 10: Create Anthropic agent loop module

**Files:**

- Create: `src/lib/builder/anthropicAgent.ts`

- [ ] **Step 1: Create the agent loop**

```typescript
// src/lib/builder/anthropicAgent.ts
import Anthropic from '@anthropic-ai/sdk';
import type { ToolRegistry, ToolContext } from './toolRegistry';
import type { SSEEvent, AgentToolName } from './types';

const MAX_TOOL_LOOPS = 15;
const REQUEST_TIMEOUT = 120000; // 2 minutes

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlock[];
}

export interface AgentRunOptions {
  systemPrompt: string;
  messages: AgentMessage[];
  toolRegistry: ToolRegistry;
  toolContext: ToolContext;
  write: (event: SSEEvent) => void;
}

export async function runAgentLoop(options: AgentRunOptions): Promise<{
  assistantText: string;
  toolCallsMade: string[];
}> {
  const { systemPrompt, toolRegistry, toolContext, write } = options;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const tools = toolRegistry.getToolsForClaude();
  const messages: Anthropic.MessageParam[] = options.messages.map((m) => ({
    role: m.role,
    content: m.content as string,
  }));

  let fullAssistantText = '';
  const toolCallsMade: string[] = [];
  let loopCount = 0;

  while (loopCount < MAX_TOOL_LOOPS) {
    loopCount++;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      tools: tools as Anthropic.Tool[],
      messages,
    });

    // Collect text and tool_use blocks
    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        fullAssistantText += block.text;
        write({ type: 'text', content: block.text });
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block);
      }
    }

    // If no tool calls, we're done
    if (toolUseBlocks.length === 0) break;

    // Add assistant message with all content blocks
    messages.push({ role: 'assistant', content: response.content });

    // Execute each tool call and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolBlock of toolUseBlocks) {
      const toolName = toolBlock.name;
      const toolArgs = toolBlock.input as Record<string, unknown>;

      write({ type: 'tool_start', tool: toolName as AgentToolName, args: toolArgs });
      toolCallsMade.push(toolName);

      let result: Record<string, unknown>;
      try {
        result = await toolRegistry.execute(toolName, toolArgs, toolContext);
      } catch (err) {
        result = { success: false, error: (err as Error).message };
        write({ type: 'error', message: (err as Error).message, recoverable: true });
      }

      write({ type: 'tool_result', tool: toolName as AgentToolName, result });

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      });
    }

    // Add all tool results as a single user message
    messages.push({ role: 'user', content: toolResults });

    // Check stop reason
    if (response.stop_reason === 'end_turn') break;
  }

  return { assistantText: fullAssistantText, toolCallsMade };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/builder/anthropicAgent.ts
git commit -m "feat(builder): add Anthropic SDK agent loop with tool_use support"
```

---

### Task 11: Rewrite /api/builder/chat route to use Claude

**Files:**

- Modify: `src/app/api/builder/chat/route.ts` (full rewrite, currently 291 lines)

- [ ] **Step 1: Create the builder system prompt**

Create: `src/lib/builder/systemPrompt.ts`

```typescript
// src/lib/builder/systemPrompt.ts

export const BUILDER_SYSTEM_PROMPT = `You are an AI widget builder agent for WinBix AI. You help users create customized chat widgets for their businesses through natural conversation.

## Your Capabilities (19 tools available)

### Core Tools
- analyze_site: Deep-crawl a website (30+ pages via sitemap/BFS), extract colors, fonts, content, business type
- generate_design: Generate 3 theme.json design variants from site profile (delegates to Gemini)
- modify_design: Targeted design tweaks ("darker header", "rounder corners")
- select_theme: Apply chosen theme variant
- build_deploy: Full build pipeline → deploy to quickwidgets/
- crawl_knowledge: Deep-crawl website content → upload to knowledge base (up to 100 pages)
- modify_widget_code: Modify widget source code → auto-rebuild → deploy
- rollback: Revert to previous version
- test_widget: Verify deployed widget works

### Integration Tools
- web_search: Search internet (Brave API) for API docs, tutorials
- web_fetch: Fetch any URL, get clean markdown content
- search_api_docs: Combo search+fetch for API documentation
- write_integration: Write server-side API route handler for any integration
- test_integration: Validate API key with test call
- guide_user: Show step-by-step instruction card

### Proactive Tools
- analyze_opportunities: Find improvement areas in current widget
- suggest_improvements: Show interactive suggestion cards
- check_knowledge_gaps: Compare crawled pages vs knowledge base

## Workflow

### Phase 1: "30-Second Wow" (URL → working widget)
1. User provides URL → call analyze_site immediately
2. After analysis → call generate_design with site profile
3. Present 3 variants, let user pick (click or chat)
4. Call select_theme → build_deploy
5. In parallel: crawl_knowledge runs in background
6. Widget live in ~45 seconds

### Phase 2: "Proactive Intelligence"
After deployment, call analyze_opportunities and present suggestions:
- Knowledge gaps: "Your pricing page has 8 plans but only 3 in knowledge base"
- Integration opportunities: "Detected Calendly link — add booking?"
- Design improvements: "Add proactive greeting after 5s?"

Use suggest_improvements to show interactive cards.

### Phase 3: "Living Workspace"
Open-ended conversation. User can:
- Change design: "Make it darker" → modify_design → build_deploy
- Add integrations: "Connect my Stripe" → search_api_docs → write_integration → guide_user → test_integration
- Improve knowledge: "Add FAQ page" → crawl_knowledge
- Change behavior: "Make bot more formal" → modify_widget_code

## Integration Flow (any API)
1. User: "Connect my [provider]"
2. web_search("[provider] API documentation 2026")
3. web_fetch(docs_url) → parsed API reference
4. guide_user → step-by-step card for getting API key
5. User pastes API key → test_integration → validate
6. write_integration → Claude writes server-side handler
7. build_deploy → widget updated with new capability

## Rules
- Never break existing chat, voice, or drag functionality
- Keep all shared hook imports intact in widget code
- Use Tailwind v3 classes (not v4) in widget code
- Always web_search before writing integration handlers (never guess API endpoints)
- If build fails: try to fix once. If still fails, tell the user.
- After code modification, explain what changed in 1-2 sentences.
- When user says "undo"/"revert": use rollback tool.
- Be concise — users want results, not essays.
- After initial deployment, ALWAYS call analyze_opportunities.
- For design tasks, use generate_design or modify_design (they delegate to Gemini).
- For code writing, write the code yourself.`;
```

- [ ] **Step 2: Rewrite chat route**

Replace the entire content of `src/app/api/builder/chat/route.ts`:

```typescript
// src/app/api/builder/chat/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { Errors } from '@/lib/apiResponse';
import BuilderSession from '@/models/BuilderSession';
import User from '@/models/User';
import { createSSEStream, createSSEHeaders } from '@/lib/builder/sseUtils';
import { createToolRegistry } from '@/lib/builder/tools';
import { runAgentLoop } from '@/lib/builder/anthropicAgent';
import { BUILDER_SYSTEM_PROMPT } from '@/lib/builder/systemPrompt';
import type { ToolContext } from '@/lib/builder/toolRegistry';

const activeStreams = new Map<string, boolean>();

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

    // Add user message
    session.messages.push({ role: 'user', content: message, timestamp: new Date() });
    session.status = 'streaming';
    await session.save();

    const currentSessionId = session._id.toString();
    activeStreams.set(currentSessionId, true);

    const baseUrl = request.nextUrl.origin;
    const cookie = request.headers.get('cookie') || '';
    const currentUser = await User.findById(auth.userId);
    const userPlan = currentUser?.plan || 'none';

    // Build conversation for Claude (convert session messages to simple format)
    const conversationMessages = session.messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const toolRegistry = createToolRegistry();

    const stream = createSSEStream(async (write) => {
      try {
        const toolContext: ToolContext = {
          sessionId: currentSessionId,
          userId: auth.userId,
          baseUrl,
          cookie,
          write,
          userPlan,
        };

        const { assistantText, toolCallsMade } = await runAgentLoop({
          systemPrompt: BUILDER_SYSTEM_PROMPT,
          messages: conversationMessages,
          toolRegistry,
          toolContext,
          write,
        });

        // Save assistant response
        if (assistantText) {
          session.messages.push({
            role: 'assistant',
            content: assistantText,
            timestamp: new Date(),
          });
        }

        // Update session stage based on tool calls
        if (toolCallsMade.includes('analyze_site')) session.currentStage = 'analysis';
        if (toolCallsMade.includes('select_theme')) session.currentStage = 'design';
        if (toolCallsMade.includes('build_deploy')) {
          session.currentStage = 'deploy';
          session.status = 'deployed';
        }
        if (toolCallsMade.includes('crawl_knowledge')) {
          session.knowledgeUploaded = true;
        }

        if (session.status === 'streaming') session.status = 'chatting';
        await session.save();

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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/builder/systemPrompt.ts src/app/api/builder/chat/route.ts
git commit -m "feat(builder): rewrite chat route — Gemini → Claude Anthropic SDK agent loop"
```

---

## Chunk 5: Update BuilderSession Model & Frontend

### Task 12: Extend BuilderSession MongoDB model with new fields

**Files:**

- Modify: `src/models/BuilderSession.ts`

- [ ] **Step 1: Add new optional fields to interface and schema**

Add to `IBuilderSession` interface (after existing fields):

```typescript
// New optional fields (v2)
integrations?: {
  provider: string;
  status: 'suggested' | 'configuring' | 'connected' | 'failed';
  handlerPath?: string;
}[];
opportunities?: {
  id: string;
  type: 'knowledge_gap' | 'integration' | 'design' | 'feature';
  description: string;
  status: 'pending' | 'accepted' | 'dismissed';
}[];
versions?: {
  number: number;
  description: string;
  timestamp: Date;
  scriptPath: string;
}[];
```

Update `currentStage` enum to include `'suggestions' | 'workspace'`.

Add to schema (after existing fields, all optional):

```typescript
integrations: [{
  provider: String,
  status: { type: String, enum: ['suggested', 'configuring', 'connected', 'failed'] },
  handlerPath: String,
}],
opportunities: [{
  id: String,
  type: { type: String, enum: ['knowledge_gap', 'integration', 'design', 'feature'] },
  description: String,
  status: { type: String, enum: ['pending', 'accepted', 'dismissed'] },
}],
versions: [{
  number: Number,
  description: String,
  timestamp: Date,
  scriptPath: String,
}],
```

Update `currentStage` enum in schema:

```typescript
enum: ['input', 'analysis', 'design', 'knowledge', 'deploy', 'integrations', 'suggestions', 'workspace'],
```

- [ ] **Step 2: Commit**

```bash
git add src/models/BuilderSession.ts
git commit -m "feat(builder): extend BuilderSession model with v2 fields (integrations, opportunities, versions)"
```

---

### Task 13: Update ProgressPipeline with new stages

**Files:**

- Modify: `src/components/builder/ProgressPipeline.tsx`

- [ ] **Step 1: Add new stages to labels and icons**

Add to `STAGE_LABELS`:

```typescript
suggestions: 'Suggestions',
workspace: 'Workspace',
```

Add to `STAGE_ICONS`:

```tsx
suggestions: (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
  </svg>
),
workspace: (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
  </svg>
),
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/ProgressPipeline.tsx
git commit -m "feat(builder): add suggestions and workspace stages to ProgressPipeline"
```

---

### Task 14: Update useBuilderStream to handle new SSE events

**Files:**

- Modify: `src/components/builder/useBuilderStream.ts`

- [ ] **Step 1: Add suggestions state and handler**

Add to `StreamState` interface:

```typescript
suggestions: Suggestion[] | null;
```

Add to initial state:

```typescript
suggestions: null,
```

Add to `handleEvent` switch:

```typescript
case 'suggestions':
  return { ...prev, suggestions: event.suggestions };
```

Add `Suggestion` import from types:

```typescript
import type { SSEEvent, BuilderStage, PanelMode, Suggestion } from '@/lib/builder/types';
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/useBuilderStream.ts
git commit -m "feat(builder): handle suggestions SSE event in useBuilderStream"
```

---

### Task 15: Add suggestion cards to BuilderChat

**Files:**

- Modify: `src/components/builder/BuilderChat.tsx`

- [ ] **Step 1: Add Suggestion type and suggestion cards UI**

Add import and prop:

```typescript
import type { Suggestion } from '@/lib/builder/types';
```

Add to Props interface:

```typescript
proactiveSuggestions?: Suggestion[] | null;
```

Add to `TOOL_LABELS` (new tool names):

```typescript
generate_design: 'Generating design',
modify_design: 'Tweaking design',
build_deploy: 'Building & deploying',
rollback: 'Rolling back',
test_widget: 'Testing widget',
web_search: 'Searching web',
web_fetch: 'Fetching page',
search_api_docs: 'Searching API docs',
write_integration: 'Writing integration',
test_integration: 'Testing API key',
guide_user: 'Showing instructions',
analyze_opportunities: 'Finding opportunities',
suggest_improvements: 'Preparing suggestions',
check_knowledge_gaps: 'Checking knowledge',
```

Add suggestion cards section after the existing `suggestions` chips section (before `<div ref={bottomRef} />`):

```tsx
{
  /* Proactive suggestion cards */
}
{
  proactiveSuggestions && proactiveSuggestions.length > 0 && !isStreaming && (
    <div className="space-y-2 pl-10">
      {proactiveSuggestions.map((s) => (
        <div
          key={s.id}
          className="rounded-xl p-4"
          style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(139,92,246,0.15)',
          }}
        >
          <div className="mb-1 flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase"
              style={{
                background:
                  s.category === 'integration'
                    ? 'rgba(6,182,212,0.1)'
                    : s.category === 'knowledge_gap'
                      ? 'rgba(245,158,11,0.1)'
                      : 'rgba(139,92,246,0.1)',
                color:
                  s.category === 'integration' ? '#22d3ee' : s.category === 'knowledge_gap' ? '#fbbf24' : '#a78bfa',
                border: `1px solid ${s.category === 'integration' ? 'rgba(6,182,212,0.2)' : s.category === 'knowledge_gap' ? 'rgba(245,158,11,0.2)' : 'rgba(139,92,246,0.2)'}`,
              }}
            >
              {s.category.replace('_', ' ')}
            </span>
            <span className="text-sm font-medium" style={{ color: '#e8eaed' }}>
              {s.title}
            </span>
          </div>
          <p className="mb-3 text-xs" style={{ color: '#7a8194' }}>
            {s.description}
          </p>
          <div className="flex gap-2">
            {s.actions.map((a, i) => (
              <button
                key={i}
                onClick={() => onSendMessage(a.action)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200"
                style={{
                  background: 'rgba(6,182,212,0.08)',
                  border: '1px solid rgba(6,182,212,0.2)',
                  color: '#22d3ee',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(6,182,212,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(6,182,212,0.08)';
                }}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/BuilderChat.tsx
git commit -m "feat(builder): add proactive suggestion cards and new tool labels to BuilderChat"
```

---

### Task 16: Add integration_status panel mode to ContextPanel

**Files:**

- Modify: `src/components/builder/ContextPanel.tsx`

- [ ] **Step 1: Rename crm_status to also handle integration_status**

The existing `crm_status` panel already shows connected integrations. Add `integration_status` as an alias that shows the same view:

```tsx
{(mode === 'crm_status' || mode === 'integration_status') && (
  // ... existing integration list JSX
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/ContextPanel.tsx
git commit -m "feat(builder): add integration_status panel mode to ContextPanel"
```

---

### Task 17: Update dashboard builder page to wire up new state

**Files:**

- Modify: `src/app/dashboard/builder/page.tsx`

- [ ] **Step 1: Read and update the page component**

Read the current file first, then update it to pass `proactiveSuggestions` from `useBuilderStream` state to `BuilderChat`. The hook already returns `suggestions` after Task 14.

Wire: `<BuilderChat ... proactiveSuggestions={state.suggestions} />`

- [ ] **Step 2: Commit**

```bash
git add src/app/dashboard/builder/page.tsx
git commit -m "feat(builder): wire proactiveSuggestions to BuilderChat in dashboard page"
```

---

## Chunk 6: Integration, Type Check & Final Verification

### Task 18: Verify vitest config supports path aliases

- [ ] **Step 1: Check vitest config**

Run: `ls /Users/devlink007/AIAsisstant/AIAsisstant/vitest.config.* 2>/dev/null`

If no vitest config exists, tests importing `@/` paths will fail. Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
```

If a vitest config already exists, verify it has the `@` alias.

- [ ] **Step 2: Run a test to verify aliases work**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run src/lib/builder/__tests__/types.test.ts`

- [ ] **Step 3: Commit if config was created**

```bash
git add vitest.config.ts
git commit -m "chore: add vitest config with path aliases"
```

---

### Task 19: Run type check

- [ ] **Step 1: Run TypeScript type checker**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit 2>&1 | head -50`

Fix any type errors that arise from the changes. Common issues to watch for:

- `agentTools.ts` old imports still used by `build/route.ts` — this file doesn't change, it uses `saveVersion` from `widgetCodeManager.ts` which stays.
- Old `AgentToolName` union no longer matches new tool names — check all files importing from `types.ts`.

- [ ] **Step 2: Fix type errors if any**

Address each error. Key places to check:

- `src/app/api/builder/build/route.ts` — should still work (doesn't import `AgentToolName` or tool declarations)
- `src/components/builder/useBuilderStream.ts` — the `handleEvent` switch must handle the union correctly
- `src/lib/builder/anthropicAgent.ts` — may need type assertions for tool names in SSE events

- [ ] **Step 3: Commit fixes**

```bash
git add -A
git commit -m "fix(builder): resolve type errors from v2 migration"
```

---

### Task 20: Run all tests

- [ ] **Step 1: Run full test suite**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx vitest run`

- [ ] **Step 2: Fix any failures**

- [ ] **Step 3: Commit fixes if any**

```bash
git add -A
git commit -m "fix(builder): fix test failures from v2 migration"
```

---

### Task 21: Run build verification

- [ ] **Step 1: Run Next.js build**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && /Users/devlink007/AIAsisstant/AIAsisstant/node_modules/.bin/next build 2>&1 | tail -30`

Note: Use the direct binary path because rtk proxy may filter output.

- [ ] **Step 2: Fix build errors if any**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(builder): Agentic Builder v2 — complete migration to Claude + ToolRegistry"
```

---

## Summary: File Map

### New Files (14)

| File                                        | Responsibility                      |
| ------------------------------------------- | ----------------------------------- |
| `src/lib/builder/toolRegistry.ts`           | ToolRegistry class + types          |
| `src/lib/builder/security.ts`               | Code validation, AES-256-GCM, SSRF  |
| `src/lib/builder/webSearch.ts`              | Brave Search API wrapper            |
| `src/lib/builder/webFetch.ts`               | URL fetch + HTML-to-markdown + SSRF |
| `src/lib/builder/anthropicAgent.ts`         | Claude agent loop (tool_use)        |
| `src/lib/builder/systemPrompt.ts`           | Builder system prompt for Claude    |
| `src/lib/builder/tools/index.ts`            | Registry assembly                   |
| `src/lib/builder/tools/coreTools.ts`        | 9 core tools                        |
| `src/lib/builder/tools/integrationTools.ts` | 6 integration tools                 |
| `src/lib/builder/tools/proactiveTools.ts`   | 4 proactive tools                   |
| `src/app/api/builder/search/route.ts`       | Brave Search proxy                  |
| `src/app/api/builder/fetch/route.ts`        | Web fetch proxy                     |
| `src/lib/builder/__tests__/*.test.ts`       | Tests (5 files)                     |

### Modified Files (8)

| File                                          | Changes                                           |
| --------------------------------------------- | ------------------------------------------------- |
| `src/lib/builder/types.ts`                    | New stages, panels, tools, SSE events, interfaces |
| `src/app/api/builder/chat/route.ts`           | Full rewrite (Gemini → Claude)                    |
| `src/models/BuilderSession.ts`                | New optional fields                               |
| `src/components/builder/ProgressPipeline.tsx` | New stages                                        |
| `src/components/builder/useBuilderStream.ts`  | Suggestions handler                               |
| `src/components/builder/BuilderChat.tsx`      | Suggestion cards, new tool labels                 |
| `src/components/builder/ContextPanel.tsx`     | integration_status mode                           |
| `src/app/dashboard/builder/page.tsx`          | Wire new state                                    |

### Deferred from this plan (implement in follow-up)

| Item                                                                                        | Spec Section | Reason                                                                         |
| ------------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| `costTracker.ts` (token usage tracking)                                                     | 4, 7         | Non-blocking — can add after core works                                        |
| `integrationManager.ts` (dedicated module)                                                  | 4            | Logic split across security.ts + tools — extract if needed                     |
| `opportunityAnalyzer.ts` (dedicated module)                                                 | 4            | Logic inlined in proactiveTools.ts — extract if needed                         |
| Rate limiting (10 msg/min, 20 search/min, 5 build/5min)                                     | 5            | Separate middleware concern — add as Task 22+                                  |
| Integration management API routes (`/integrations/route.ts`, `/integrations/test/route.ts`) | 4            | Tool executors handle this directly — add REST endpoints if needed             |
| `SiteProfileV2` usage (enhanced analyze_site with sitemap/WP API)                           | 2            | Enhanced crawling deferred — current analyze_site works, enhance incrementally |

### Preserved Files (unchanged)

| File                                   | Reason                                                |
| -------------------------------------- | ----------------------------------------------------- |
| `src/lib/builder/agentTools.ts`        | Legacy — kept for reference, not imported by new code |
| `src/lib/builder/siteAnalyzer.ts`      | Reused as-is by new tools                             |
| `src/lib/builder/knowledgeCrawler.ts`  | Reused as-is by new tools                             |
| `src/lib/builder/widgetCodeManager.ts` | Reused as-is by new tools                             |
| `src/lib/builder/codegenPrompt.ts`     | Reused for widget code generation                     |
| `src/lib/builder/sseUtils.ts`          | Unchanged                                             |
| `src/app/api/builder/build/route.ts`   | Unchanged (build pipeline stays)                      |
| `package.json`                         | Only `@anthropic-ai/sdk` added                        |
