# Agent Improvements: Loop + Universal API + HITL + Observability

## Context

The widget's agentic router (agenticRouter.ts) powers AI actions during visitor conversations. Current limitations:

- Max 5 function-calling iterations (complex 7-step flows fail)
- Only 10 pre-built integration plugins (new APIs need manual JSON config)
- No confirmation for dangerous actions (payments, bookings execute immediately)
- No visibility into what tools the agent called or why

This spec adds 4 capabilities via new modules (Approach C — modular extension, no refactor).

---

## Priority 1: Agent Loop + Planning

### Problem

Max 5 iterations. A realistic flow (search → collect_lead → check_slots → book → CRM → payment → notify) = 7 steps.

### Changes

**agenticRouter.ts** (modify):

- `MAX_ITERATIONS`: 5 → 15 (loop ceiling — max number of Gemini round-trips)
- Use `config.maxActionsPerSession` (already in AISettings, default 10) as the action ceiling — max total tool calls
- **Both limits enforced independently**: loop terminates when either is hit. One iteration may contain multiple parallel function calls, so `maxActionsPerSession` can be reached before `MAX_ITERATIONS`.
- When cap reached → Gemini gets a system message: "Action limit reached. Respond with text only."
- Add planning instruction to system prompt when tools > 3:
  ```
  You can call tools sequentially up to {maxActions} times per session.
  For multi-step tasks, execute steps one by one. Track your progress.
  ```

### Risk

Low. Existing widgets with simple flows (1-2 tool calls) are unaffected. The cap prevents runaway loops.

---

## Priority 2: Universal API Connector

### Problem

10 hardcoded plugins. For unknown APIs, the builder agent must manually compose a JSON config — error-prone and slow.

### New File: `src/lib/builder/tools/universalApiTool.ts` (~120 lines)

**Tool name**: `connect_any_api`

**Parameters**:

- `apiDocsUrl` (string) — URL of API documentation or base URL
- `name` (string) — human-readable integration name
- `credentials` (string) — JSON with API keys/tokens (marked sensitive — tool description instructs LLM not to echo credentials back)
- `desiredActions` (string) — what user wants to do ("create contacts, check order status")

**Security**: Credentials pass through the builder agent conversation briefly but are immediately handed to `connect_integration` (which encrypts before storage). The tool description explicitly instructs the LLM: "Do not include API keys or tokens in your response text."

**Flow**:

1. `web_fetch(apiDocsUrl)` → get markdown documentation
2. Send docs to Gemini with structured prompt:
   ```
   From this API documentation, create an integration.config.json for these actions: {desiredActions}.
   Format: {provider, name, baseUrl, auth: {type, fields}, actions: [{id, name, method, path, inputSchema, body}], healthCheck}
   RULES:
   - provider must be lowercase slug (e.g. "acme-crm")
   - baseUrl must start with https://
   - Each action needs: id, name, method (GET/POST/PUT/DELETE), path
   - inputSchema: {fieldName: "type"} where type is string|number|boolean
   - For POST/PUT: include body template with {{params.fieldName}} placeholders
   ```
3. Parse and validate returned JSON config
4. Call existing `generate_integration` (deterministic script)
5. Call `connect_integration` with provided credentials
6. Call `attach_integration_to_widget` + `enable_ai_actions`
7. Return success with list of available actions

**Fallback**: If Gemini can't parse docs → return error with suggestion: "Send me an example API request and I'll create the integration manually."

**systemPrompt.ts** update:

```
For UNKNOWN APIs (not in the 10 built-in list) → use connect_any_api.
Ask user for: API documentation URL + API key + what they want to do.
```

**Registration**: Add to integrationTools.ts tool array.

---

## Priority 3: Action Confirmation (Human-in-the-Loop)

### Problem

All actions execute immediately. A createPaymentIntent or cancelEvent should require visitor confirmation.

### New File: `src/lib/actionConfirmation.ts` (~60 lines)

**Two action levels**:

| Level     | When                    | Examples                                                                             |
| --------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `auto`    | Read-only, low risk     | search_knowledge, collect_lead, send_notification, listEvents, getSlots, getContacts |
| `confirm` | Write/mutate, high risk | createEvent, cancelEvent, createContact, createDeal, createPaymentIntent             |

**How level is determined**:

- Default heuristic: reads the `method` field from the plugin manifest's action definition — GET = `auto`, POST/PUT/DELETE = `confirm`
- Built-in tools (collect_lead, search_knowledge, send_notification) = always `auto`
- Owner override: `AISettings.autoApproveActions: string[]` — actions that skip confirmation
- Export function: `getConfirmationLevel(toolName, aiSettings) → 'auto' | 'confirm'`

**Confirmation flow in agenticRouter.ts**:

1. Gemini calls a tool (e.g., `google_calendar_createEvent`)
2. Router checks: `getConfirmationLevel(toolName, config)`
3. If `auto` → execute immediately (current behavior)
4. If `confirm` → do NOT execute. Instead:
   a. Generate `confirmId` (uuid)
   b. Store pending action in MongoDB `PendingAction` collection: `{confirmId, tool, args, sessionId, widgetId, userId, expiresAt}`
   c. Stream SSE event: `{type: "action_confirm", tool, args, confirmId, description}`
   d. Return to Gemini: `{status: "awaiting_confirmation", message: "Asked visitor to confirm"}`
   e. Gemini responds with text like "Подтвердите запись на пятницу 14:00"

5. Widget shows `ActionConfirmCard` component (confirm/reject buttons)
6. Visitor clicks Confirm → `POST /api/chat/confirm` with `{confirmId, approved: true}`
7. Server executes the pending action → streams result back
8. If rejected or expired (5 min TTL) → action is discarded

### New Model: `src/models/PendingAction.ts` (~20 lines)

- Fields: `confirmId` (unique index), `tool`, `args`, `sessionId`, `widgetId`, `userId`, `expiresAt`
- TTL index on `expiresAt` (MongoDB auto-deletes expired documents)
- Survives server restarts and multi-instance deployments

### New API Route: `src/app/api/chat/confirm/route.ts` (~50 lines)

- Validates confirmId exists in PendingAction collection and hasn't expired
- **Session validation**: Confirms the requesting `sessionId` matches the stored `sessionId` (prevents unauthorized execution)
- Executes the stored action via pluginRegistry
- Deletes the PendingAction document after execution
- Returns result as SSE stream or JSON

### SSE Events (handled by widget `useChat.js` + builder `useBuilderStream.ts`):

- `action_confirm` — show confirmation card in widget chat
- `action_confirmed` — action was executed after approval
- `action_rejected` — action was rejected by visitor

### Model Changes:

- `AISettings`: add `autoApproveActions: [String]` field (default: empty = use heuristics)

---

## Priority 4: Step Traces (Observability)

### Problem

Business owners see only chat text. Can't see: which tools fired, what returned, timing, errors.

### New File: `src/lib/actionTracer.ts` (~50 lines)

```typescript
interface ActionTrace {
  tool: string;
  args: Record<string, unknown>;
  result: { success: boolean; data?: unknown; error?: string };
  durationMs: number;
  timestamp: Date;
  confirmationRequired: boolean;
  confirmationStatus?: 'approved' | 'rejected' | 'pending';
}

class ActionTracer {
  private traces: ActionTrace[] = [];

  startTrace(tool: string, args: Record<string, unknown>): { finish: (result: unknown) => ActionTrace };
  getTraces(): ActionTrace[];
  toSSEEvents(): Array<{type: 'action_trace', ...}>;
}
```

### Integration in agenticRouter.ts (~20 lines):

```typescript
const tracer = new ActionTracer();

// Before each tool call:
const trace = tracer.startTrace(toolName, args);

// After execution:
const completed = trace.finish(result);

// Stream trace event:
write({
  type: 'action_trace',
  tool: toolName,
  status: result.success ? 'success' : 'error',
  durationMs: completed.durationMs,
});

// After loop completes — save to ChatLog:
chatLog.metadata.actionTraces = tracer.getTraces();
```

### SSE Event for frontend:

```json
{
  "type": "action_trace",
  "tool": "google_calendar_createEvent",
  "status": "success",
  "durationMs": 1234,
  "summary": "Created event: Стоматолог, Fri 14:00"
}
```

### Model Changes

- **ChatLog.ts**: Add `actionTraces` as a top-level field (not nested in `metadata`, which is a fixed sub-schema):
  ```typescript
  actionTraces: [{ type: Schema.Types.Mixed }];
  ```
- Update `IChatLog` interface to include `actionTraces?: ActionTrace[]`
- No migration needed — new field, default empty array, existing documents unaffected

### Dashboard (Phase 2 — not in this spec):

- Chat logs page: expandable "Agent Actions" block with timeline
- Icon indicator on chats that have action traces

---

## File Summary

| File                                          | Action                                                                       | Priority |
| --------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| `src/lib/actionTracer.ts`                     | CREATE                                                                       | 4        |
| `src/lib/actionConfirmation.ts`               | CREATE                                                                       | 3        |
| `src/models/PendingAction.ts`                 | CREATE — pending confirmation storage with TTL                               | 3        |
| `src/lib/builder/tools/universalApiTool.ts`   | CREATE                                                                       | 2        |
| `src/app/api/chat/confirm/route.ts`           | CREATE — session-validated confirm endpoint                                  | 3        |
| `src/lib/agenticRouter.ts`                    | MODIFY — loop limit, planning prompt, tracer integration, confirmation check | 1,3,4    |
| `src/lib/builder/tools/integrationTools.ts`   | MODIFY — register connect_any_api tool                                       | 2        |
| `src/lib/builder/systemPrompt.ts`             | MODIFY — add universal API rule, confirmation rules                          | 2,3      |
| `src/lib/builder/types.ts`                    | MODIFY — add SSE event types                                                 | 3,4      |
| `src/models/AISettings.ts`                    | MODIFY — add autoApproveActions field                                        | 3        |
| `src/models/ChatLog.ts`                       | MODIFY — add actionTraces field                                              | 4        |
| `src/components/builder/useBuilderStream.ts`  | MODIFY — handle action_trace SSE events                                      | 4        |
| `.claude/widget-builder/src/hooks/useChat.js` | MODIFY — handle action_confirm/confirmed/rejected SSE events                 | 3        |

## Implementation Order

1. **types.ts + models** (AISettings, ChatLog, PendingAction — schema changes first)
2. **actionTracer.ts** (no dependencies, pure utility)
3. **actionConfirmation.ts** (depends on PendingAction model)
4. **agenticRouter.ts changes** (loop limit + tracer + confirmation check)
5. **confirm/route.ts** (depends on confirmation + PendingAction)
6. **universalApiTool.ts** (independent, uses existing tools)
7. **systemPrompt.ts + integrationTools.ts** (register connect_any_api, add rules)
8. **useChat.js** (widget-side action_confirm SSE handling)
9. **useBuilderStream.ts** (builder-side action_trace SSE handling)

## Non-Goals (Explicitly Out of Scope)

- Multi-agent architecture (separate PlannerAgent, ExecutorAgent) — overkill for now
- Dashboard UI for action traces — Phase 2
- MCP protocol support — separate initiative
- Voice agent mode — separate feature
- ActionConfirmCard widget component — can reuse existing RichBlocks confirm pattern
