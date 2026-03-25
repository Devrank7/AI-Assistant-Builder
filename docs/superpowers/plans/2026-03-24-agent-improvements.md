# Agent Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 4 capabilities to the widget agentic router: extended loop (15 iterations), universal API connector, human-in-the-loop confirmation for dangerous actions, and action tracing for observability.

**Architecture:** Modular extension (Approach C) — 4 new files + targeted modifications to existing modules. No refactoring. Each priority is self-contained and can be tested independently. PendingAction uses MongoDB (not in-memory) for multi-instance safety.

**Tech Stack:** TypeScript, Next.js 15 App Router, Mongoose/MongoDB, Google Gemini API (`@google/genai`), SSE streaming, Preact (widget hooks)

**Spec:** `docs/superpowers/specs/2026-03-24-agent-improvements-design.md`

---

## File Map

| File                                          | Action | Purpose                                                            |
| --------------------------------------------- | ------ | ------------------------------------------------------------------ |
| `src/lib/actionTracer.ts`                     | CREATE | ActionTracer class — wraps tool calls with timing, result tracking |
| `src/lib/actionConfirmation.ts`               | CREATE | getConfirmationLevel() — determines auto vs confirm per tool       |
| `src/models/PendingAction.ts`                 | CREATE | Mongoose model for pending confirmations with TTL                  |
| `src/app/api/chat/confirm/route.ts`           | CREATE | POST endpoint to approve/reject pending actions                    |
| `src/lib/builder/tools/universalApiTool.ts`   | CREATE | connect_any_api builder tool                                       |
| `src/models/AISettings.ts`                    | MODIFY | Add autoApproveActions field                                       |
| `src/models/ChatLog.ts`                       | MODIFY | Add actionTraces field                                             |
| `src/lib/builder/types.ts`                    | MODIFY | Add SSE event types for traces and confirmations                   |
| `src/lib/agenticRouter.ts`                    | MODIFY | Loop 5→15, tracer integration, confirmation check, planning prompt |
| `src/lib/builder/tools/integrationTools.ts`   | MODIFY | Register connect_any_api tool                                      |
| `src/lib/builder/systemPrompt.ts`             | MODIFY | Add universal API and confirmation rules                           |
| `.claude/widget-builder/src/hooks/useChat.js` | MODIFY | Handle action_confirm/confirmed/rejected SSE events                |
| `src/components/builder/useBuilderStream.ts`  | MODIFY | Handle action_trace SSE events                                     |

---

## Task 1: Models — AISettings + ChatLog + PendingAction

**Files:**

- Modify: `src/models/AISettings.ts:110-113`
- Modify: `src/models/ChatLog.ts:9-23,31-46`
- Create: `src/models/PendingAction.ts`

- [ ] **Step 1: Add autoApproveActions to AISettings schema**

In `src/models/AISettings.ts`, add after `industryTemplate` field (line 112):

```typescript
    autoApproveActions: {
      type: [String],
      default: [],
    },
```

And add to the `IAISettings` interface (after line 19):

```typescript
  autoApproveActions: string[]; // Actions that skip confirmation (e.g. ['google_calendar_createEvent'])
```

- [ ] **Step 2: Add actionTraces to ChatLog schema**

In `src/models/ChatLog.ts`, add to `IChatLog` interface (after line 21):

```typescript
  actionTraces?: Array<{
    tool: string;
    args: Record<string, unknown>;
    result: { success: boolean; data?: unknown; error?: string };
    durationMs: number;
    timestamp: Date;
    confirmationRequired: boolean;
    confirmationStatus?: 'approved' | 'rejected' | 'pending';
  }>;
```

Add to `ChatLogSchema` (after `consecutiveLowConfidence` field, line 43):

```typescript
    actionTraces: [{ type: Schema.Types.Mixed }],
```

- [ ] **Step 3: Create PendingAction model**

Create `src/models/PendingAction.ts`:

```typescript
import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingAction extends Document {
  confirmId: string;
  tool: string;
  args: Record<string, unknown>;
  sessionId: string;
  widgetId: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const PendingActionSchema = new Schema<IPendingAction>(
  {
    confirmId: { type: String, required: true, unique: true, index: true },
    tool: { type: String, required: true },
    args: { type: Schema.Types.Mixed, required: true },
    sessionId: { type: String, required: true },
    widgetId: { type: String, required: true },
    userId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes expired documents
PendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PendingAction || mongoose.model<IPendingAction>('PendingAction', PendingActionSchema);
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/models/PendingAction.ts src/models/AISettings.ts src/models/ChatLog.ts 2>&1 | head -20`

Expected: No errors (or only pre-existing unrelated errors).

- [ ] **Step 5: Commit**

```bash
git add src/models/PendingAction.ts src/models/AISettings.ts src/models/ChatLog.ts
git commit -m "feat: add PendingAction model, autoApproveActions to AISettings, actionTraces to ChatLog"
```

---

## Task 2: ActionTracer

**Files:**

- Create: `src/lib/actionTracer.ts`

- [ ] **Step 1: Create actionTracer.ts**

Create `src/lib/actionTracer.ts`:

```typescript
export interface ActionTrace {
  tool: string;
  args: Record<string, unknown>;
  result: { success: boolean; data?: unknown; error?: string };
  durationMs: number;
  timestamp: Date;
  confirmationRequired: boolean;
  confirmationStatus?: 'approved' | 'rejected' | 'pending';
}

export class ActionTracer {
  private traces: ActionTrace[] = [];

  startTrace(
    tool: string,
    args: Record<string, unknown>,
    confirmationRequired = false
  ): { finish: (result: Record<string, unknown>) => ActionTrace } {
    const startTime = Date.now();
    const timestamp = new Date();

    return {
      finish: (result: Record<string, unknown>): ActionTrace => {
        const trace: ActionTrace = {
          tool,
          args,
          result: {
            success: (result.success as boolean) ?? false,
            data: result.data as unknown,
            error: result.error as string | undefined,
          },
          durationMs: Date.now() - startTime,
          timestamp,
          confirmationRequired,
        };
        this.traces.push(trace);
        return trace;
      },
    };
  }

  addConfirmationTrace(tool: string, args: Record<string, unknown>, status: 'approved' | 'rejected' | 'pending'): void {
    const existing = this.traces.find((t) => t.tool === tool && t.confirmationRequired && !t.confirmationStatus);
    if (existing) {
      existing.confirmationStatus = status;
    } else {
      this.traces.push({
        tool,
        args,
        result: { success: false },
        durationMs: 0,
        timestamp: new Date(),
        confirmationRequired: true,
        confirmationStatus: status,
      });
    }
  }

  getTraces(): ActionTrace[] {
    return [...this.traces];
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/actionTracer.ts 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add src/lib/actionTracer.ts
git commit -m "feat: add ActionTracer for tool call observability"
```

---

## Task 3: ActionConfirmation

**Files:**

- Create: `src/lib/actionConfirmation.ts`

- [ ] **Step 1: Create actionConfirmation.ts**

Create `src/lib/actionConfirmation.ts`:

```typescript
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

// Built-in tools that are always auto-approved (read-only / low risk)
const ALWAYS_AUTO: Set<string> = new Set([
  'collect_lead',
  'search_knowledge',
  'send_notification',
]);

// Action ID prefixes that indicate read-only operations (auto-approve)
const READ_PREFIXES = ['get', 'list', 'search', 'check', 'fetch', 'find'];

/**
 * Determine whether a tool call should execute immediately or require visitor confirmation.
 *
 * Priority:
 * 1. Built-in tools → always auto
 * 2. Owner override (autoApproveActions) → auto
 * 3. Action ID name heuristic: get*/list*/search* → auto, create*/cancel*/update*/delete* → confirm
 * 4. Default → confirm (safe fallback)
 *
 * Note: ActionDefinition does not have a `method` field, so we use name-based heuristics.
 * Tool names follow the pattern: {slug}_{actionId} (e.g., google-calendar_createEvent).
 */
export function getConfirmationLevel(
  toolName: string,
  autoApproveActions: string[] = []
): 'auto' | 'confirm' {
  // 1. Built-in always auto
  if (ALWAYS_AUTO.has(toolName)) return 'auto';

  // 2. Owner override
  if (autoApproveActions.includes(toolName)) return 'auto';

  // 3. Name-based heuristic — find the actionId by matching slug against registry
  const parts = toolName.split('_');
  let actionId = '';

  for (let i = 1; i < parts.length; i++) {
    const candidateSlug = parts.slice(0, i).join('_');
    // Also try hyphenated slug (registry uses hyphens, tool names use underscores)
    const hyphenSlug = candidateSlug.replace(/_/g, '-');
    if (pluginRegistry.get(candidateSlug) || pluginRegistry.get(hyphenSlug)) {
      actionId = parts.slice(i).join('_');
      break;
    }
  }

  // If we found an actionId, check if it's a read-only pattern
  if (actionId) {
    const lowerAction = actionId.toLowerCase();
    if (READ_PREFIXES.some((prefix) => lowerAction.startsWith(prefix))) {
      return 'auto';
    }
  }

  // 4. Default: confirm (safe)
  return 'confirm';
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/actionConfirmation.ts 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add src/lib/actionConfirmation.ts
git commit -m "feat: add action confirmation level resolver (auto vs confirm)"
```

---

## Task 4: SSE Event Types

**Files:**

- Modify: `src/lib/builder/types.ts:121-138`

- [ ] **Step 1: Add new SSE event types**

In `src/lib/builder/types.ts`, add to the `SSEEvent` union type (before the `| { type: 'done' }` line at ~138):

```typescript
  | { type: 'action_confirm'; tool: string; args: Record<string, unknown>; confirmId: string; description: string }
  | { type: 'action_confirmed'; tool: string; confirmId: string; result: Record<string, unknown> }
  | { type: 'action_rejected'; tool: string; confirmId: string }
  | { type: 'action_trace'; tool: string; status: 'success' | 'error'; durationMs: number; summary?: string }
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/builder/types.ts
git commit -m "feat: add action_confirm, action_trace SSE event types"
```

---

## Task 5: Agentic Router — Loop + Tracer + Confirmation

This is the core change. Modify `src/lib/agenticRouter.ts` with 4 targeted edits.

**Files:**

- Modify: `src/lib/agenticRouter.ts`

- [ ] **Step 1: Update imports and MAX_ACTION_LOOPS**

At the top of `src/lib/agenticRouter.ts`, add imports after line 37:

```typescript
import { ActionTracer } from '@/lib/actionTracer';
import { getConfirmationLevel } from '@/lib/actionConfirmation';
import PendingAction from '@/models/PendingAction';
import { randomUUID } from 'crypto';
```

Change line 39:

```typescript
const MAX_ACTION_LOOPS = 15;
```

- [ ] **Step 2: Add planning instruction to system prompt builder**

In `buildAgenticSystemPrompt` function, after the action rules block (after line 162, before `// Custom action instructions`), add:

```typescript
// Planning instruction for complex multi-tool flows
if (tools.declarations.length > 3) {
  prompt += `\n\n### Multi-step execution:
You can call tools sequentially up to ${config.maxActionsPerSession} times per session.
For multi-step tasks, execute steps one by one. Track your progress.
If a step fails, explain what happened and suggest an alternative.`;
}
```

- [ ] **Step 3: Add tracer and confirmation logic to the agentic loop**

Replace the tool execution block inside the `while` loop (lines 387-421 in `agenticRouter.ts`). The section starts at `for (const fc of functionCalls)` and ends before `// Send function responses back to Gemini`.

Replace with:

```typescript
for (const fc of functionCalls) {
  const toolName = fc.name || 'unknown';
  const toolArgs = (fc.args || {}) as Record<string, unknown>;
  actionCount++;

  // Check confirmation level
  const confirmLevel = getConfirmationLevel(toolName, config.autoApproveActions || []);

  if (confirmLevel === 'confirm') {
    // Store pending action in MongoDB
    const confirmId = randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min TTL

    await PendingAction.create({
      confirmId,
      tool: toolName,
      args: toolArgs,
      sessionId: toolCtx.sessionId,
      widgetId: toolCtx.clientId,
      userId: toolCtx.userId,
      expiresAt,
    });

    // Track in tracer
    tracer.addConfirmationTrace(toolName, toolArgs, 'pending');

    // Stream confirmation event
    const description = `${toolName}(${Object.entries(toolArgs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')})`;
    controller.enqueue(
      encoder.encode(
        `data: ${JSON.stringify({ type: 'action_confirm', tool: toolName, args: toolArgs, confirmId, description })}\n\n`
      )
    );

    // Tell Gemini to wait for confirmation
    functionResponseParts.push({
      functionResponse: {
        name: toolName,
        response: {
          status: 'awaiting_confirmation',
          message: 'Asked visitor to confirm this action before executing.',
        },
      },
    } as Part);
    continue;
  }

  // Auto-execute: emit action_start
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ action_start: toolName, args: toolArgs })}\n\n`));

  // Execute tool with tracing
  const trace = tracer.startTrace(toolName, toolArgs);
  const executor = tools.executors.get(toolName);
  let toolResult: Record<string, unknown>;

  if (executor) {
    try {
      toolResult = await executor(toolArgs, toolCtx);
    } catch (err) {
      toolResult = { success: false, error: (err as Error).message };
    }
  } else {
    toolResult = { success: false, error: `Tool "${toolName}" not found` };
  }

  const completed = trace.finish(toolResult);

  // Emit action_result + trace events
  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ action_result: toolName, result: toolResult })}\n\n`));
  controller.enqueue(
    encoder.encode(
      `data: ${JSON.stringify({ type: 'action_trace', tool: toolName, status: toolResult.success ? 'success' : 'error', durationMs: completed.durationMs })}\n\n`
    )
  );

  functionResponseParts.push({
    functionResponse: {
      name: toolName,
      response: toolResult,
    },
  } as Part);
}
```

- [ ] **Step 4: Initialize tracer at stream start and save traces after loop**

Inside the `start(controller)` function, after `let actionCount = 0;` (line 332), add:

```typescript
const tracer = new ActionTracer();
```

In the `finally` block, inside the ChatLog update (around line 445), change the `$push` + `$setOnInsert` to also save traces:

```typescript
await ChatLog.findOneAndUpdate(
  { clientId: input.clientId, sessionId: input.sessionId },
  {
    $push: {
      messages: {
        $each: [
          { role: 'user', content: input.message, timestamp: new Date() },
          { role: 'assistant', content: fullResponse, timestamp: new Date() },
        ],
      },
    },
    ...(tracer.getTraces().length > 0 ? { $set: { actionTraces: tracer.getTraces() } } : {}),
    $setOnInsert: {
      clientId: input.clientId,
      sessionId: input.sessionId,
      metadata: { ...input.metadata, channel: input.channel },
    },
  },
  { upsert: true, new: true }
);
```

- [ ] **Step 5: Update getAgenticConfig to read autoApproveActions**

In the `getAgenticConfig` function, add to the `AgenticConfig` interface (after line 52):

```typescript
  autoApproveActions: string[];
```

And in the return object (after line 75):

```typescript
    autoApproveActions: settingsDoc?.autoApproveActions || [],
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/agenticRouter.ts 2>&1 | head -20`

- [ ] **Step 7: Commit**

```bash
git add src/lib/agenticRouter.ts
git commit -m "feat: agentic router — loop 5→15, action tracer, confirmation check, planning prompt"
```

---

## Task 6: Confirm API Route

**Files:**

- Create: `src/app/api/chat/confirm/route.ts`

- [ ] **Step 1: Create the confirm route**

Create `src/app/api/chat/confirm/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PendingAction from '@/models/PendingAction';
import ChatLog from '@/models/ChatLog';
import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

export async function POST(request: NextRequest) {
  try {
    const { confirmId, sessionId, approved } = await request.json();

    if (!confirmId || !sessionId) {
      return NextResponse.json({ success: false, error: 'confirmId and sessionId are required' }, { status: 400 });
    }

    await connectDB();

    // Find and validate the pending action
    const pending = await PendingAction.findOne({ confirmId });

    if (!pending) {
      return NextResponse.json({ success: false, error: 'Action not found or expired' }, { status: 404 });
    }

    // Session validation — prevents unauthorized execution
    if (pending.sessionId !== sessionId) {
      return NextResponse.json({ success: false, error: 'Session mismatch' }, { status: 403 });
    }

    // Check expiry
    if (new Date() > pending.expiresAt) {
      await PendingAction.deleteOne({ confirmId });
      return NextResponse.json({ success: false, error: 'Action expired' }, { status: 410 });
    }

    // Delete pending action (one-time use)
    await PendingAction.deleteOne({ confirmId });

    if (!approved) {
      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // Parse tool name: try each possible slug prefix against registry
    // Tool names: {slug}_{actionId} — slug may use underscores or hyphens
    const toolName = pending.tool;
    let slug = '';
    let actionId = '';

    const parts = toolName.split('_');
    for (let i = 1; i < parts.length; i++) {
      const candidateSlug = parts.slice(0, i).join('_');
      const candidateAction = parts.slice(i).join('_');
      // Try both underscore and hyphenated forms
      const hyphenSlug = candidateSlug.replace(/_/g, '-');
      if (pluginRegistry.get(candidateSlug)) {
        slug = candidateSlug;
        actionId = candidateAction;
        break;
      }
      if (pluginRegistry.get(hyphenSlug)) {
        slug = hyphenSlug;
        actionId = candidateAction;
        break;
      }
    }

    if (!slug) {
      return NextResponse.json({ success: false, error: `Plugin not found for tool "${toolName}"` }, { status: 404 });
    }

    // Execute the action via plugin registry
    const result = await pluginRegistry.executeAction(
      slug,
      actionId,
      pending.args as Record<string, unknown>,
      pending.userId,
      pending.widgetId
    );

    // Store confirmed action result in chat log so next conversation turn has context
    await ChatLog.findOneAndUpdate(
      { clientId: pending.widgetId, sessionId: pending.sessionId },
      {
        $push: {
          messages: {
            role: 'assistant',
            content: `[Action confirmed: ${toolName}] ${result.success ? 'Success' : 'Failed: ' + result.error}`,
            timestamp: new Date(),
          },
        },
      }
    );

    return NextResponse.json({ success: true, status: 'confirmed', result });
  } catch (err) {
    console.error('[ConfirmRoute] Error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/app/api/chat/confirm/route.ts 2>&1 | head -10`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/chat/confirm/route.ts
git commit -m "feat: add POST /api/chat/confirm endpoint for HITL action approval"
```

---

## Task 7: Universal API Connector

**Files:**

- Create: `src/lib/builder/tools/universalApiTool.ts`
- Modify: `src/lib/builder/tools/integrationTools.ts`

- [ ] **Step 1: Create universalApiTool.ts**

Create `src/lib/builder/tools/universalApiTool.ts`:

````typescript
import type { ToolDefinition } from '../toolRegistry';
import { webFetch } from '../webFetch';

export const universalApiTool: ToolDefinition = {
  name: 'connect_any_api',
  description:
    'Connect ANY external API to the widget by reading its documentation. Use this for APIs not in the built-in list (Google Calendar, HubSpot, etc). Requires: API docs URL, API key, and desired actions. Do NOT include API keys or tokens in your response text.',
  parameters: {
    type: 'object',
    properties: {
      apiDocsUrl: {
        type: 'string',
        description: 'URL of API documentation or base URL',
      },
      name: {
        type: 'string',
        description: 'Human-readable integration name (e.g., "Acme CRM")',
      },
      credentials: {
        type: 'string',
        description: 'JSON string with API keys/tokens. SENSITIVE — do not echo back.',
      },
      desiredActions: {
        type: 'string',
        description: 'What the user wants to do (e.g., "create contacts, check order status")',
      },
    },
    required: ['apiDocsUrl', 'name', 'credentials', 'desiredActions'],
  },
  category: 'integration',
  async executor(args, context) {
    const { apiDocsUrl, name, credentials, desiredActions } = args as {
      apiDocsUrl: string;
      name: string;
      credentials: string;
      desiredActions: string;
    };

    // 1. Fetch API documentation
    let docsContent: string;
    try {
      const result = await webFetch(apiDocsUrl);
      if (result.error || !result.content) {
        return {
          success: false,
          error: `Could not fetch API docs from ${apiDocsUrl}: ${result.error || 'empty response'}. Send me an example API request and I'll create the integration manually.`,
        };
      }
      docsContent = result.content.slice(0, 30000); // 30K char limit
    } catch (err) {
      return {
        success: false,
        error: `Failed to fetch API docs: ${(err as Error).message}. Send me an example API request and I'll create the integration manually.`,
      };
    }

    // 2. Use Gemini to generate integration config from docs
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

    const configPrompt = `From this API documentation, create an integration.config.json for these actions: ${desiredActions}.

Format (strict JSON, no comments):
{
  "provider": "lowercase-slug",
  "name": "${name}",
  "baseUrl": "https://...",
  "auth": { "type": "api_key", "fields": ["apiKey"] },
  "actions": [
    {
      "id": "actionId",
      "name": "Human-readable name",
      "description": "What this action does",
      "method": "GET|POST|PUT|DELETE",
      "path": "/api/endpoint",
      "inputSchema": { "fieldName": "string" },
      "body": { "key": "{{params.fieldName}}" }
    }
  ],
  "healthCheck": { "method": "GET", "path": "/api/status" }
}

RULES:
- provider must be lowercase slug (e.g. "acme-crm")
- baseUrl must start with https://
- Each action needs: id, name, description, method, path
- inputSchema: { fieldName: "type" } where type is string|number|boolean
- For POST/PUT: include body template with {{params.fieldName}} placeholders
- For GET with query params: use path like /api/endpoint?param={{params.param}}

API DOCUMENTATION:
${docsContent}

Return ONLY the JSON. No explanation.`;

    let configJson: Record<string, unknown>;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-05-20',
        contents: configPrompt,
      });
      const text = response.text?.trim() || '';
      // Strip markdown code fences if present
      const jsonStr = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      configJson = JSON.parse(jsonStr);
    } catch (err) {
      return {
        success: false,
        error: `Could not parse API docs into integration config: ${(err as Error).message}. Send me an example API request and I'll create the integration manually.`,
      };
    }

    // 3. Validate required fields
    if (!configJson.provider || !configJson.baseUrl || !Array.isArray(configJson.actions)) {
      return {
        success: false,
        error:
          "Generated config is missing required fields (provider, baseUrl, actions). Send me an example API request and I'll create the integration manually.",
      };
    }

    // 4. Call existing tools in sequence via their executors directly
    //    (ToolContext doesn't have toolRegistry — import tools directly)
    const { integrationTools: allIntTools } = await import('./integrationTools');
    const findTool = (n: string) => allIntTools.find((t) => t.name === n);

    // Step 4a: generate_integration
    const genTool = findTool('generate_integration');
    if (!genTool) return { success: false, error: 'generate_integration tool not found' };
    const genResult = await genTool.executor({ config: JSON.stringify(configJson) }, context);
    if (!genResult?.success) {
      return { success: false, error: `generate_integration failed: ${genResult?.error || 'unknown error'}` };
    }

    // Step 4b: connect_integration
    const slug = configJson.provider as string;
    const connectTool = findTool('connect_integration');
    if (!connectTool) return { success: false, error: 'connect_integration tool not found' };
    const connectResult = await connectTool.executor({ slug, credentials }, context);
    if (!connectResult?.success) {
      return { success: false, error: `connect_integration failed: ${connectResult?.error || 'unknown error'}` };
    }

    // Step 4c: attach_integration_to_widget + enable_ai_actions
    // Get clientId from session context — the builder agent stores it in the session
    const attachTool = findTool('attach_integration_to_widget');
    const enableTool = findTool('enable_ai_actions');
    const actionIds = (configJson.actions as Array<{ id: string }>).map((a) => a.id);

    if (attachTool) {
      await attachTool.executor(
        {
          slug,
          widgetId: (genResult as Record<string, unknown>).clientId || '',
          actions: JSON.stringify(actionIds),
        },
        context
      );
    }

    if (enableTool) {
      await enableTool.executor(
        {
          clientId: (genResult as Record<string, unknown>).clientId || '',
        },
        context
      );
    }

    const actionNames = (configJson.actions as Array<{ name: string }>).map((a) => a.name);
    return {
      success: true,
      message: `Successfully connected ${name} API with ${actionNames.length} actions: ${actionNames.join(', ')}`,
      provider: slug,
      actions: actionNames,
    };
  },
};
````

- [ ] **Step 2: Register in integrationTools.ts**

At the top of `src/lib/builder/tools/integrationTools.ts`, add import (after line 7):

```typescript
import { universalApiTool } from './universalApiTool';
```

At the end of the `integrationTools` array (before the closing `];`), add:

```typescript
  universalApiTool,
```

- [ ] **Step 3: Add connect_any_api to AGENT_TOOL_NAMES**

In `src/lib/builder/types.ts`, add to the `AGENT_TOOL_NAMES` array (after `'generate_integration'`, around line 46):

```typescript
  'connect_any_api',
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit src/lib/builder/tools/universalApiTool.ts 2>&1 | head -20`

- [ ] **Step 5: Commit**

```bash
git add src/lib/builder/tools/universalApiTool.ts src/lib/builder/tools/integrationTools.ts src/lib/builder/types.ts
git commit -m "feat: add connect_any_api universal API connector tool"
```

---

## Task 8: System Prompt Updates

**Files:**

- Modify: `src/lib/builder/systemPrompt.ts`

- [ ] **Step 1: Add universal API and confirmation rules**

Find the integration tools section in `systemPrompt.ts` (search for "integration" or "connect_integration") and add after the existing integration instructions:

```typescript
## Universal API Connector
For APIs NOT in the built-in list (Google Calendar, HubSpot, Salesforce, etc.) → use connect_any_api.
Ask user for: API documentation URL + API key + what they want to do.
The tool will read the API docs, auto-generate the integration, connect it, and enable actions.

## Action Confirmation
Some widget actions require visitor confirmation before execution:
- Read-only actions (search, list, get) → execute immediately
- Write actions (create, update, delete, book, pay) → ask visitor to confirm first
- The widget will show a confirmation card automatically. No extra code needed.
- Business owners can override via AISettings.autoApproveActions.
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/builder/systemPrompt.ts
git commit -m "feat: add universal API connector and action confirmation rules to system prompt"
```

---

## Task 9: Widget SSE — useChat.js

**Files:**

- Modify: `.claude/widget-builder/src/hooks/useChat.js`

- [ ] **Step 1: Add action_confirm event handler**

In `.claude/widget-builder/src/hooks/useChat.js`, find the SSE parsing section (around line 222, after the `if (data.action_result)` block). Add:

```javascript
// Action confirmation (HITL)
if (data.type === 'action_confirm') {
  setMessages((prev) => {
    const newMsgs = [...prev];
    const last = newMsgs[newMsgs.length - 1];
    const confirmations = [...(last.confirmations || [])];
    confirmations.push({
      confirmId: data.confirmId,
      tool: data.tool,
      args: data.args,
      description: data.description,
      status: 'pending',
    });
    newMsgs[newMsgs.length - 1] = { ...last, confirmations };
    return newMsgs;
  });
}
// Action trace (observability — stored but not rendered in widget)
if (data.type === 'action_trace') {
  // Traces are for dashboard, not widget UI — no-op here
}
```

- [ ] **Step 2: Add confirmation handler function**

In the same hook, add a `handleConfirm` function that sends POST to `/api/chat/confirm`. Find where other handler functions are defined (near the `sendMessage` function) and add:

```javascript
const handleConfirm = useCallback(async (confirmId, approved) => {
  try {
    const res = await fetch(`${API_BASE}/api/chat/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmId, sessionId: sessionIdRef.current, approved }),
    });
    const data = await res.json();

    // Update confirmation status in messages
    setMessages((prev) => {
      const newMsgs = [...prev];
      for (let i = newMsgs.length - 1; i >= 0; i--) {
        const msg = newMsgs[i];
        if (msg.confirmations) {
          const confirmations = msg.confirmations.map((c) =>
            c.confirmId === confirmId ? { ...c, status: approved ? 'confirmed' : 'rejected', result: data.result } : c
          );
          newMsgs[i] = { ...msg, confirmations };
          break;
        }
      }
      return newMsgs;
    });
  } catch (err) {
    console.error('[useChat] confirm error:', err);
  }
}, []);
```

- [ ] **Step 3: Return handleConfirm from the hook**

Find the `return` statement of the hook and add `handleConfirm` to the returned object.

- [ ] **Step 4: Commit**

```bash
git add .claude/widget-builder/src/hooks/useChat.js
git commit -m "feat: widget useChat — handle action_confirm SSE events + confirm handler"
```

---

## Task 10: Builder SSE — useBuilderStream.ts

**Files:**

- Modify: `src/components/builder/useBuilderStream.ts:58-138`

- [ ] **Step 1: Add action_trace handler**

In `src/components/builder/useBuilderStream.ts`, inside the `handleEvent` switch statement (before `case 'done':` at line 132), add:

```typescript
        case 'action_trace':
          if (lastMsg?.role === 'assistant') {
            const traceCards = [...(lastMsg.toolCards || [])];
            traceCards.push({
              tool: (event as { tool: string }).tool,
              status: (event as { status: string }).status === 'success' ? 'done' : 'error',
              result: {
                durationMs: (event as { durationMs: number }).durationMs,
                summary: (event as { summary?: string }).summary,
              },
            });
            const updated = { ...lastMsg, toolCards: traceCards };
            return { ...prev, messages: [...msgs.slice(0, -1), updated] };
          }
          return prev;

        case 'action_confirm':
        case 'action_confirmed':
        case 'action_rejected':
          // Builder doesn't need to handle widget-side confirmation events
          return prev;
```

- [ ] **Step 2: Commit**

```bash
git add src/components/builder/useBuilderStream.ts
git commit -m "feat: builder stream — handle action_trace SSE events"
```

---

## Task 11: Final Verification

- [ ] **Step 1: Run TypeScript check on all modified files**

```bash
cd /Users/devlink007/AIAsisstant/AIAsisstant && npx tsc --noEmit 2>&1 | grep -E "error TS" | head -30
```

Fix any type errors that arise from the changes.

- [ ] **Step 2: Verify agenticRouter.ts doc comment is updated**

Update the comment at top of `agenticRouter.ts` (line 13) from `max 5 iterations` to `max 15 iterations`.

- [ ] **Step 3: Final commit with any fixes**

```bash
git add -A
git commit -m "fix: resolve type errors from agent improvements implementation"
```

- [ ] **Step 4: Push to main**

```bash
git push origin main
```
