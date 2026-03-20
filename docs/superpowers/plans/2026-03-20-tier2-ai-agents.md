# Tier 2 AI: Advanced Agents + Voice + Multi-Agent + Conversation Intelligence

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add advanced AI agent personas with multi-model fallback, real-time voice agent in widget, multi-agent orchestration with auto-switching, and conversation intelligence dashboard.

**Architecture:** Extends existing AgentPersona model + personaRouter + agenticRouter + conversationIntelligence. Voice agent uses Web Speech API (already in widget) + enhanced streaming for voice-first UX. Multi-agent adds routing rules engine. Conv intelligence adds a dashboard aggregating existing ConversationInsight data.

**Tech Stack:** Next.js 15, TypeScript, MongoDB/Mongoose, Google Gemini API, Anthropic Claude API, Web Speech API, framer-motion

---

## Task 1: Advanced AI Agents — Multi-Model Fallback

**Files:**

- Create: `src/lib/multiModelProvider.ts`
- Modify: `src/lib/agenticRouter.ts` (use multiModelProvider)
- Modify: `src/lib/channelRouter.ts` (use multiModelProvider)
- Create: `src/test/multiModelProvider.test.ts`

- [ ] **Step 1: Write multi-model provider**

```typescript
// src/lib/multiModelProvider.ts
import { GoogleGenAI } from '@google/genai';

export type ModelProvider = 'gemini' | 'claude' | 'openai';

interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  apiKey: string;
  maxTokens: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

const PROVIDER_CONFIGS: Record<ModelProvider, () => ModelConfig | null> = {
  gemini: () =>
    process.env.GEMINI_API_KEY
      ? {
          provider: 'gemini',
          modelId: 'gemini-2.5-flash-preview-05-20',
          apiKey: process.env.GEMINI_API_KEY!,
          maxTokens: 8192,
          costPer1kInput: 0.15,
          costPer1kOutput: 0.6,
        }
      : null,
  claude: () =>
    process.env.ANTHROPIC_API_KEY
      ? {
          provider: 'claude',
          modelId: 'claude-sonnet-4-6',
          apiKey: process.env.ANTHROPIC_API_KEY!,
          maxTokens: 4096,
          costPer1kInput: 3.0,
          costPer1kOutput: 15.0,
        }
      : null,
  openai: () =>
    process.env.OPENAI_API_KEY
      ? {
          provider: 'openai',
          modelId: 'gpt-4o',
          apiKey: process.env.OPENAI_API_KEY!,
          maxTokens: 4096,
          costPer1kInput: 2.5,
          costPer1kOutput: 10.0,
        }
      : null,
};

export interface GenerateOptions {
  systemPrompt: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  preferredProvider?: ModelProvider;
  fallbackOrder?: ModelProvider[];
}

interface GenerateResult {
  text: string;
  provider: ModelProvider;
  modelId: string;
  toolCalls?: Array<{ name: string; args: Record<string, any> }>;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

async function generateWithGemini(config: ModelConfig, options: GenerateOptions): Promise<GenerateResult> {
  const ai = new GoogleGenAI({ apiKey: config.apiKey });

  const contents = options.messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const result = await ai.models.generateContent({
    model: config.modelId,
    contents,
    config: {
      systemInstruction: options.systemPrompt,
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? config.maxTokens,
      tools: options.tools?.length ? [{ functionDeclarations: options.tools }] : undefined,
    },
  });

  const candidate = result.candidates?.[0];
  const text =
    candidate?.content?.parts
      ?.map((p: any) => p.text)
      .filter(Boolean)
      .join('') || '';
  const toolCalls = candidate?.content?.parts
    ?.filter((p: any) => p.functionCall)
    ?.map((p: any) => ({ name: p.functionCall.name, args: p.functionCall.args }));

  return {
    text,
    provider: 'gemini',
    modelId: config.modelId,
    toolCalls: toolCalls?.length ? toolCalls : undefined,
    inputTokens: result.usageMetadata?.promptTokenCount || 0,
    outputTokens: result.usageMetadata?.candidatesTokenCount || 0,
    costUsd: 0,
  };
}

async function generateWithClaude(config: ModelConfig, options: GenerateOptions): Promise<GenerateResult> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: config.modelId,
      max_tokens: options.maxTokens ?? config.maxTokens,
      system: options.systemPrompt,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(`Claude error: ${data.error.message}`);

  return {
    text: data.content?.[0]?.text || '',
    provider: 'claude',
    modelId: config.modelId,
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
    costUsd: 0,
  };
}

async function generateWithOpenAI(config: ModelConfig, options: GenerateOptions): Promise<GenerateResult> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.modelId,
      messages: [{ role: 'system', content: options.systemPrompt }, ...options.messages],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? config.maxTokens,
    }),
  });

  const data = await response.json();
  if (data.error) throw new Error(`OpenAI error: ${data.error.message}`);

  const choice = data.choices?.[0];
  return {
    text: choice?.message?.content || '',
    provider: 'openai',
    modelId: config.modelId,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
    costUsd: 0,
  };
}

const GENERATORS: Record<ModelProvider, (config: ModelConfig, options: GenerateOptions) => Promise<GenerateResult>> = {
  gemini: generateWithGemini,
  claude: generateWithClaude,
  openai: generateWithOpenAI,
};

export async function generateWithFallback(options: GenerateOptions): Promise<GenerateResult> {
  const order = options.fallbackOrder || [
    options.preferredProvider || 'gemini',
    ...(['gemini', 'claude', 'openai'] as ModelProvider[]).filter((p) => p !== (options.preferredProvider || 'gemini')),
  ];

  const errors: string[] = [];

  for (const provider of order) {
    const config = PROVIDER_CONFIGS[provider]();
    if (!config) continue;

    try {
      const result = await GENERATORS[provider](config, options);
      // Calculate cost
      result.costUsd =
        (result.inputTokens / 1000) * config.costPer1kInput + (result.outputTokens / 1000) * config.costPer1kOutput;
      return result;
    } catch (error: any) {
      errors.push(`${provider}: ${error.message}`);
      console.error(`[MultiModel] ${provider} failed:`, error.message);
      continue;
    }
  }

  throw new Error(`All providers failed: ${errors.join('; ')}`);
}

export function getAvailableProviders(): ModelProvider[] {
  return (['gemini', 'claude', 'openai'] as ModelProvider[]).filter((p) => PROVIDER_CONFIGS[p]() !== null);
}
```

- [ ] **Step 2: Write tests**

```typescript
// src/test/multiModelProvider.test.ts
import { describe, it, expect, vi } from 'vitest';

describe('Multi-Model Provider', () => {
  it('returns available providers based on env vars', async () => {
    vi.stubEnv('GEMINI_API_KEY', 'test-key');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', '');
    const { getAvailableProviders } = await import('@/lib/multiModelProvider');
    const providers = getAvailableProviders();
    expect(providers).toContain('gemini');
  });

  it('falls back to next provider on failure', async () => {
    vi.stubEnv('GEMINI_API_KEY', '');
    vi.stubEnv('ANTHROPIC_API_KEY', '');
    vi.stubEnv('OPENAI_API_KEY', '');
    const { generateWithFallback } = await import('@/lib/multiModelProvider');
    await expect(
      generateWithFallback({
        systemPrompt: 'test',
        messages: [{ role: 'user', content: 'hello' }],
      })
    ).rejects.toThrow('All providers failed');
  });

  it('calculates cost correctly', async () => {
    // Cost calculation test
    const inputTokens = 1000;
    const outputTokens = 500;
    const costPerInput = 0.15;
    const costPerOutput = 0.6;
    const expected = (inputTokens / 1000) * costPerInput + (outputTokens / 1000) * costPerOutput;
    expect(expected).toBe(0.45);
  });
});
```

- [ ] **Step 3: Run tests, commit**

```bash
git add src/lib/multiModelProvider.ts src/test/multiModelProvider.test.ts
git commit -m "feat(ai): add multi-model provider with Gemini/Claude/OpenAI fallback"
```

---

## Task 2: Advanced AI Agents — Agent Personas Enhancement

**Files:**

- Modify: `src/models/AgentPersona.ts` (add niche templates, memory config)
- Create: `src/lib/agentMemory.ts`
- Create: `src/models/AgentMemory.ts`
- Modify: `src/lib/personaRouter.ts` (use agent memory)
- Create: `src/test/agentMemory.test.ts`

- [ ] **Step 1: Add AgentMemory model**

```typescript
// src/models/AgentMemory.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentMemory extends Document {
  clientId: string;
  personaId: string;
  sessionId: string;
  visitorId: string;
  facts: Array<{
    key: string;
    value: string;
    confidence: number;
    extractedAt: Date;
  }>;
  conversationSummary: string;
  lastInteraction: Date;
  interactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AgentMemorySchema = new Schema<IAgentMemory>(
  {
    clientId: { type: String, required: true, index: true },
    personaId: { type: String, required: true },
    sessionId: { type: String, required: true },
    visitorId: { type: String, required: true, index: true },
    facts: [
      {
        key: String,
        value: String,
        confidence: { type: Number, default: 0.8 },
        extractedAt: { type: Date, default: Date.now },
      },
    ],
    conversationSummary: { type: String, default: '' },
    lastInteraction: { type: Date, default: Date.now },
    interactionCount: { type: Number, default: 1 },
  },
  { timestamps: true }
);

AgentMemorySchema.index({ clientId: 1, visitorId: 1, personaId: 1 });

export default mongoose.models.AgentMemory || mongoose.model<IAgentMemory>('AgentMemory', AgentMemorySchema);
```

- [ ] **Step 2: Write agent memory service**

```typescript
// src/lib/agentMemory.ts
import { connectDB } from '@/lib/mongodb';
import AgentMemory from '@/models/AgentMemory';
import { generateWithFallback } from '@/lib/multiModelProvider';

export async function loadAgentMemory(clientId: string, visitorId: string, personaId: string): Promise<string> {
  await connectDB();
  const memories = await AgentMemory.find({ clientId, visitorId, personaId }).sort({ lastInteraction: -1 }).limit(5);

  if (!memories.length) return '';

  const facts = memories.flatMap((m) => m.facts).map((f) => `- ${f.key}: ${f.value}`);
  const summaries = memories.map((m) => m.conversationSummary).filter(Boolean);

  return [
    '## Memory from previous conversations with this visitor:',
    facts.length ? `**Known facts:**\n${facts.join('\n')}` : '',
    summaries.length ? `**Previous conversation summaries:**\n${summaries.join('\n')}` : '',
    `**Total past interactions:** ${memories.reduce((sum, m) => sum + m.interactionCount, 0)}`,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function saveAgentMemory(
  clientId: string,
  visitorId: string,
  personaId: string,
  sessionId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  await connectDB();

  // Extract facts using AI
  const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n');

  try {
    const result = await generateWithFallback({
      systemPrompt:
        'Extract key facts about the visitor from this conversation. Return JSON: { "facts": [{"key": "name", "value": "John"}, ...], "summary": "brief summary" }. Only extract confident facts.',
      messages: [{ role: 'user', content: conversationText }],
      temperature: 0.1,
      maxTokens: 500,
    });

    let parsed;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { facts: [], summary: '' };
    } catch {
      parsed = { facts: [], summary: '' };
    }

    await AgentMemory.findOneAndUpdate(
      { clientId, visitorId, personaId, sessionId },
      {
        $set: {
          facts: (parsed.facts || []).map((f: any) => ({
            key: f.key,
            value: f.value,
            confidence: 0.8,
            extractedAt: new Date(),
          })),
          conversationSummary: parsed.summary || '',
          lastInteraction: new Date(),
        },
        $inc: { interactionCount: 1 },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('[AgentMemory] Failed to save:', error);
  }
}
```

- [ ] **Step 3: Enhance AgentPersona model**

Add to schema: `nicheTemplate` (dental_sales, beauty_support, saas_onboarding, etc.), `modelPreference` (gemini/claude/openai), `memoryEnabled` boolean, `maxMemoryFacts` number.

- [ ] **Step 4: Write tests and commit**

```bash
git commit -m "feat(ai): add agent memory system with fact extraction and conversation summaries"
```

---

## Task 3: Advanced AI Agents — Persona Templates & API

**Files:**

- Create: `src/app/api/agent-personas/route.ts`
- Create: `src/app/api/agent-personas/[id]/route.ts`
- Create: `src/app/api/agent-personas/templates/route.ts`
- Create: `src/app/dashboard/agents/page.tsx`

- [ ] **Step 1: Write persona CRUD API**

GET/POST `/api/agent-personas` — List and create personas for a client.
GET/PATCH/DELETE `/api/agent-personas/[id]` — Manage individual persona.
GET `/api/agent-personas/templates` — Return 15 pre-built niche templates:

- Dental Receptionist, Beauty Consultant, Real Estate Agent
- SaaS Onboarding Specialist, E-commerce Sales Agent
- Restaurant Host, Fitness Trainer, Legal Intake
- Insurance Advisor, Travel Agent, Auto Dealership
- Hotel Concierge, Education Counselor, Healthcare Navigator
- Financial Advisor

Each template includes: name, role, tone, systemPromptOverlay, triggerKeywords, triggerIntents.

- [ ] **Step 2: Write Agent Management dashboard page**

Full page with:

- Grid of active agents per widget
- Create new agent from template or custom
- Agent card: avatar (icon), name, role, model preference, memory status
- Edit modal: personality tuning (tone slider, formality slider, empathy slider)
- Test chat panel: talk to the agent in a sandbox
- Agent performance metrics (if data available)

- [ ] **Step 3: Add nav item and commit**

```bash
git commit -m "feat(ai): add agent persona templates, CRUD API, and management dashboard"
```

---

## Task 4: Real-Time Voice Agent — Backend

**Files:**

- Create: `src/app/api/voice/stream/route.ts`
- Create: `src/lib/voiceAgent.ts`
- Create: `src/test/voiceAgent.test.ts`

- [ ] **Step 1: Write voice agent service**

````typescript
// src/lib/voiceAgent.ts
import { generateWithFallback } from '@/lib/multiModelProvider';
import { routeMessage } from '@/lib/channelRouter';

export interface VoiceRequest {
  clientId: string;
  sessionId: string;
  transcript: string; // Speech-to-text result from client
  language: string;
}

export interface VoiceResponse {
  text: string;
  ssml?: string; // SSML for better TTS
  emotion?: string;
  suggestedReplies?: string[];
}

export async function processVoiceMessage(req: VoiceRequest): Promise<VoiceResponse> {
  // Use the existing channelRouter for AI response
  const result = await routeMessage({
    clientId: req.clientId,
    sessionId: req.sessionId,
    message: req.transcript,
    channel: 'website',
    metadata: {
      voiceInput: true,
      language: req.language,
    },
  });

  // Convert response to voice-friendly format
  const cleanText = result.text
    .replace(/\[.*?\]/g, '') // Remove markdown links
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
    .replace(/```[\s\S]*?```/g, "I have some code to share, which I'll show in the chat.")
    .replace(/:::[\s\S]*?:::/g, '') // Remove rich blocks
    .trim();

  // Generate SSML for natural speech
  const ssml = `<speak>${cleanText
    .split('. ')
    .map((s) => `<s>${s.trim()}</s>`)
    .join(' ')}</speak>`;

  return {
    text: cleanText,
    ssml,
    emotion: result.metadata?.emotion,
    suggestedReplies: result.suggestedReplies,
  };
}
````

- [ ] **Step 2: Write voice streaming endpoint**

```typescript
// src/app/api/voice/stream/route.ts
import { NextRequest } from 'next/server';
import { processVoiceMessage } from '@/lib/voiceAgent';
import { successResponse, Errors } from '@/lib/apiResponse';

export async function POST(request: NextRequest) {
  try {
    const { clientId, sessionId, transcript, language } = await request.json();

    if (!clientId || !transcript) {
      return Errors.badRequest('clientId and transcript required');
    }

    const response = await processVoiceMessage({
      clientId,
      sessionId: sessionId || `voice-${Date.now()}`,
      transcript,
      language: language || 'en',
    });

    return successResponse(response);
  } catch (error: any) {
    return Errors.internal(error.message);
  }
}
```

- [ ] **Step 3: Write tests and commit**

```bash
git commit -m "feat(voice): add voice agent service and streaming endpoint"
```

---

## Task 5: Real-Time Voice Agent — Widget Hook

**Files:**

- Create: `.claude/widget-builder/src/hooks/useVoiceAgent.js`
- Modify: `.claude/widget-builder/src/components/Widget.jsx` (add voice mode toggle)

- [ ] **Step 1: Write useVoiceAgent hook**

```javascript
// .claude/widget-builder/src/hooks/useVoiceAgent.js
import { useState, useCallback, useRef } from 'preact/hooks';

export function useVoiceAgent({ clientId, sessionId, baseUrl, onResponse }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setIsProcessing(true);

      try {
        const response = await fetch(`${baseUrl}/api/voice/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId, sessionId, transcript, language: recognition.lang }),
        });
        const data = await response.json();

        if (data.data?.text) {
          onResponse?.(transcript, data.data.text);
          speak(data.data.text);
        }
      } catch (err) {
        console.error('Voice agent error:', err);
      } finally {
        setIsProcessing(false);
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [clientId, sessionId, baseUrl, onResponse]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const speak = useCallback(
    (text) => {
      if (!synthRef.current) return;
      synthRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      // Auto-listen again after speaking
      utterance.onend = () => {
        if (voiceMode) {
          setTimeout(() => startListening(), 500);
        }
      };

      synthRef.current.speak(utterance);
    },
    [voiceMode, startListening]
  );

  const toggleVoiceMode = useCallback(() => {
    const newMode = !voiceMode;
    setVoiceMode(newMode);
    if (newMode) {
      startListening();
    } else {
      stopListening();
      synthRef.current?.cancel();
    }
  }, [voiceMode, startListening, stopListening]);

  return {
    isListening,
    isProcessing,
    voiceMode,
    startListening,
    stopListening,
    toggleVoiceMode,
    speak,
  };
}
```

- [ ] **Step 2: Add voice mode to Widget.jsx template**

Add a microphone button that toggles voice mode. When active:

- Pulsing mic icon (red ring animation)
- Auto-listen → process → speak → auto-listen loop
- Visual waveform indicator during listening
- "Voice Mode" label

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(voice): add useVoiceAgent hook and voice mode to widget"
```

---

## Task 6: Multi-Agent Orchestration — Routing Engine

**Files:**

- Create: `src/lib/multiAgentRouter.ts`
- Create: `src/models/AgentRoutingRule.ts`
- Modify: `src/lib/channelRouter.ts` (integrate multi-agent routing)
- Create: `src/test/multiAgentRouter.test.ts`

- [ ] **Step 1: Write AgentRoutingRule model**

```typescript
// src/models/AgentRoutingRule.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAgentRoutingRule extends Document {
  clientId: string;
  name: string;
  priority: number;
  fromPersonaId?: string; // null = any
  toPersonaId: string;
  conditions: {
    type: 'intent' | 'keyword' | 'sentiment' | 'topic' | 'handoff_request' | 'idle_time';
    value: string;
    operator: 'equals' | 'contains' | 'gt' | 'lt';
  }[];
  matchMode: 'all' | 'any';
  isActive: boolean;
  handoffMessage?: string;
  createdAt: Date;
}

const AgentRoutingRuleSchema = new Schema<IAgentRoutingRule>(
  {
    clientId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    priority: { type: Number, default: 0 },
    fromPersonaId: String,
    toPersonaId: { type: String, required: true },
    conditions: [
      {
        type: { type: String, enum: ['intent', 'keyword', 'sentiment', 'topic', 'handoff_request', 'idle_time'] },
        value: String,
        operator: { type: String, enum: ['equals', 'contains', 'gt', 'lt'], default: 'equals' },
      },
    ],
    matchMode: { type: String, enum: ['all', 'any'], default: 'any' },
    isActive: { type: Boolean, default: true },
    handoffMessage: String,
  },
  { timestamps: true }
);

export default mongoose.models.AgentRoutingRule ||
  mongoose.model<IAgentRoutingRule>('AgentRoutingRule', AgentRoutingRuleSchema);
```

- [ ] **Step 2: Write multi-agent router**

```typescript
// src/lib/multiAgentRouter.ts
import { connectDB } from '@/lib/mongodb';
import AgentRoutingRule from '@/models/AgentRoutingRule';
import AgentPersona from '@/models/AgentPersona';
import { analyzeConversation } from '@/lib/conversationIntelligence';

interface RoutingContext {
  clientId: string;
  currentPersonaId?: string;
  message: string;
  intent?: string;
  sentiment?: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

interface RoutingDecision {
  shouldSwitch: boolean;
  targetPersonaId?: string;
  handoffMessage?: string;
  reason?: string;
}

export async function evaluateRouting(context: RoutingContext): Promise<RoutingDecision> {
  await connectDB();

  const rules = await AgentRoutingRule.find({
    clientId: context.clientId,
    isActive: true,
    $or: [{ fromPersonaId: context.currentPersonaId }, { fromPersonaId: { $exists: false } }, { fromPersonaId: null }],
  }).sort({ priority: -1 });

  if (!rules.length) return { shouldSwitch: false };

  // Analyze message for intent/sentiment if not provided
  const analysis = context.intent
    ? { intent: context.intent, sentiment: context.sentiment }
    : await quickAnalyze(context.message);

  for (const rule of rules) {
    const matches = rule.conditions.map((cond) => {
      switch (cond.type) {
        case 'intent':
          return matchCondition(analysis.intent || '', cond.value, cond.operator);
        case 'keyword':
          return matchCondition(context.message.toLowerCase(), cond.value.toLowerCase(), cond.operator);
        case 'sentiment':
          return matchCondition(analysis.sentiment || '', cond.value, cond.operator);
        case 'handoff_request':
          return /speak.*human|talk.*person|operator|agent|manager/i.test(context.message);
        default:
          return false;
      }
    });

    const passed = rule.matchMode === 'all' ? matches.every(Boolean) : matches.some(Boolean);

    if (passed && rule.toPersonaId !== context.currentPersonaId) {
      return {
        shouldSwitch: true,
        targetPersonaId: rule.toPersonaId,
        handoffMessage: rule.handoffMessage,
        reason: `Rule "${rule.name}" matched`,
      };
    }
  }

  return { shouldSwitch: false };
}

function matchCondition(actual: string, expected: string, operator: string): boolean {
  switch (operator) {
    case 'equals':
      return actual === expected;
    case 'contains':
      return actual.includes(expected);
    case 'gt':
      return parseFloat(actual) > parseFloat(expected);
    case 'lt':
      return parseFloat(actual) < parseFloat(expected);
    default:
      return false;
  }
}

async function quickAnalyze(message: string): Promise<{ intent?: string; sentiment?: string }> {
  // Fast keyword-based analysis (no AI call needed)
  const intents: Record<string, string[]> = {
    pricing: ['price', 'cost', 'plan', 'subscription', 'billing', 'upgrade'],
    support: ['help', 'issue', 'problem', 'bug', 'error', 'broken', 'not working'],
    booking: ['book', 'schedule', 'appointment', 'reserve', 'calendar', 'available'],
    sales: ['buy', 'purchase', 'demo', 'trial', 'features', 'compare'],
  };

  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(intents)) {
    if (keywords.some((k) => lower.includes(k))) return { intent, sentiment: 'neutral' };
  }

  return { intent: 'general', sentiment: 'neutral' };
}
```

- [ ] **Step 3: Write routing rules API**

Create: `src/app/api/agent-routing/route.ts` — GET/POST routing rules.
Create: `src/app/api/agent-routing/[id]/route.ts` — PATCH/DELETE individual rules.

- [ ] **Step 4: Write tests and commit**

```bash
git commit -m "feat(ai): add multi-agent orchestration with routing rules engine"
```

---

## Task 7: Multi-Agent Orchestration — Dashboard UI

**Files:**

- Create: `src/app/dashboard/agents/routing/page.tsx`

- [ ] **Step 1: Write routing rules management page**

Visual routing rules editor:

- Drag-and-drop rule priority ordering
- Rule builder with condition cards
- Visual flow diagram: Agent A → (condition) → Agent B
- Pre-built rule templates (e.g., "Route billing questions to Billing Agent")
- Test rule: input a message, see which agent would handle it
- Active/inactive toggle per rule

- [ ] **Step 2: Commit**

```bash
git commit -m "feat(ai): add multi-agent routing rules dashboard with visual editor"
```

---

## Task 8: Conversation Intelligence — Enhanced Dashboard

**Files:**

- Create: `src/app/api/intelligence/dashboard/route.ts`
- Create: `src/app/api/intelligence/signals/route.ts`
- Create: `src/app/dashboard/intelligence/page.tsx`
- Modify: `src/app/dashboard/layout.tsx` (add nav item)

- [ ] **Step 1: Write intelligence API endpoints**

GET `/api/intelligence/dashboard` — Aggregated intelligence data:

- Top intents (last 30 days)
- Average buying signal score
- Average churn risk score
- Competitor mentions count
- Escalation rate
- Sentiment distribution (positive/neutral/negative)
- Trending topics

GET `/api/intelligence/signals` — Individual signals with pagination:

- Filter by type (buying_signal, churn_indicator, competitor_mention, etc.)
- Filter by date range
- Filter by widget

- [ ] **Step 2: Write intelligence dashboard page**

Full dashboard with:

- Summary cards (4): avg buying signal, avg churn risk, escalation rate, satisfaction
- Intent distribution chart (pie/donut)
- Sentiment trend line chart (30 days)
- Buying signals timeline (scatter plot)
- Churn risk alerts (list of high-risk conversations)
- Competitor mentions table
- Feature requests aggregation
- Actionable recommendations (AI-generated)

Glassmorphism cards, framer-motion stagger, responsive grid.

- [ ] **Step 3: Add nav items and commit**

Add "Intelligence" (Brain icon) and "Agents" (Bot icon) to dashboard sidebar.

```bash
git commit -m "feat(intelligence): add conversation intelligence dashboard with signals and trends"
```
