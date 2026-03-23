/**
 * Agentic Router
 *
 * Extends the standard chat pipeline with Gemini function calling.
 * When a widget has connected integrations (or actionsEnabled=true),
 * the AI can execute real actions: book appointments, create CRM contacts,
 * process payments, send notifications, etc.
 *
 * Flow:
 * 1. Load widget tools (built-in + integrations)
 * 2. Build system prompt with action instructions
 * 3. Gemini agentic loop (max 5 iterations)
 * 4. Stream text + action events via SSE
 *
 * Falls back to plain text streaming if no tools are available.
 */

import { GoogleGenAI, Type } from '@google/genai';
import type { Part } from '@google/genai';
import connectDB from '@/lib/mongodb';
import Client from '@/models/Client';
import AISettings, { defaultSystemPrompt } from '@/models/AISettings';
import ChatLog from '@/models/ChatLog';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import Correction from '@/models/Correction';
import { generateEmbedding, findSimilarChunks } from '@/lib/gemini';
import { getModel, getDefaultModel, calculateCost } from '@/lib/models';
import { parseRichBlocks } from '@/lib/richMessages';
import { detectHandoffRequest, getActiveHandoff, createHandoff } from '@/lib/handoff';
import { loadWidgetTools, type WidgetToolContext, type LoadedWidgetTools } from '@/lib/widgetTools';
import type { RouteMessageInput } from '@/lib/channelRouter';
import { getOrCreateProfile, buildCustomerContext, processConversation } from '@/lib/customerMemory';
import { analyzeConversationSentiment, buildEmotionContext, updateProfileSentiment } from '@/lib/emotionAI';
import { processConversationIntelligence } from '@/lib/conversationIntelligence';
import { selectPersona } from '@/lib/personaRouter';
import { upsertInboxThread } from '@/lib/inboxManager';
import { trackFunnelEvent } from '@/lib/revenueTracker';

const MAX_ACTION_LOOPS = 5;

// ── AI Config ──────────────────────────────────────────────────────────────

interface AgenticConfig {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topK: number;
  handoffEnabled: boolean;
  actionsEnabled: boolean;
  actionsSystemPrompt: string;
  maxActionsPerSession: number;
  emotionAIEnabled: boolean;
  personasEnabled: boolean;
  customerMemoryEnabled: boolean;
}

async function getAgenticConfig(clientId: string): Promise<AgenticConfig> {
  const settingsDoc = await AISettings.findOne({ clientId });
  const selectedModel = settingsDoc?.aiModel || getDefaultModel().id;
  const resolvedModel = getModel(selectedModel);

  return {
    model: resolvedModel.id,
    systemPrompt: settingsDoc?.systemPrompt || defaultSystemPrompt,
    temperature: settingsDoc?.temperature || 0.7,
    maxTokens: settingsDoc?.maxTokens || 8196,
    topK: settingsDoc?.topK || 3,
    handoffEnabled: settingsDoc?.handoffEnabled ?? false,
    actionsEnabled: settingsDoc?.actionsEnabled ?? false,
    actionsSystemPrompt: settingsDoc?.actionsSystemPrompt || '',
    maxActionsPerSession: settingsDoc?.maxActionsPerSession || 10,
    emotionAIEnabled: settingsDoc?.emotionAIEnabled ?? false,
    personasEnabled: settingsDoc?.personasEnabled ?? false,
    customerMemoryEnabled: settingsDoc?.customerMemoryEnabled ?? false,
  };
}

// ── RAG Context ────────────────────────────────────────────────────────────

async function buildContext(clientId: string, message: string, topK: number): Promise<string> {
  const allChunks = await KnowledgeChunk.find({ clientId }).select('text embedding');
  if (allChunks.length === 0) return '';

  const queryEmbedding = await generateEmbedding(message);
  const chunksWithEmbeddings = allChunks.map((c) => ({ text: c.text, embedding: c.embedding }));
  const relevantChunks = await findSimilarChunks(queryEmbedding, chunksWithEmbeddings, topK, 0.3);
  if (relevantChunks.length === 0) return '';

  const corrections = await Correction.find({ clientId, status: 'applied' })
    .select('userQuestion correctedAnswer')
    .lean();

  let context = '';
  if (corrections.length > 0) {
    context +=
      corrections.map((c, i) => `[CORRECTION ${i + 1}] Q: ${c.userQuestion} → A: ${c.correctedAnswer}`).join('\n') +
      '\n\n';
  }
  context += relevantChunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
  return context;
}

// ── System Prompt Builder ──────────────────────────────────────────────────

function buildAgenticSystemPrompt(
  config: AgenticConfig,
  ragContext: string,
  tools: LoadedWidgetTools,
  conversationHistory?: Array<{ role: string; content: string }>,
  metadata?: Record<string, unknown>
): string {
  let prompt = config.systemPrompt;

  // Current date/time context so the bot knows what day/time it is
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  prompt += `\n\nCurrent date and time: ${now.toISOString().slice(0, 16).replace('T', ' ')} (${days[now.getDay()]}). Use this for scheduling, availability, and time-related questions.`;

  // Conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    const recent = conversationHistory.slice(-6);
    prompt +=
      '\n\nConversation history:\n' +
      recent.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  }

  // RAG context
  if (ragContext) {
    prompt += `\n\nKNOWLEDGE BASE CONTEXT:\n${ragContext}`;
  }

  // Page context for website channel
  const pc = metadata?.pageContext as Record<string, unknown> | undefined;
  if (pc) {
    let pageInfo = '\n\nPage context (the user is currently viewing this page):';
    if (pc.title) pageInfo += `\nPage title: ${pc.title}`;
    if (pc.path) pageInfo += `\nURL path: ${pc.path}`;
    if (pc.description) pageInfo += `\nPage description: ${pc.description}`;
    if (Array.isArray(pc.headings) && pc.headings.length > 0) pageInfo += `\nMain headings: ${pc.headings.join(', ')}`;
    prompt += pageInfo;
  }

  // Action instructions
  if (tools.declarations.length > 0) {
    prompt += `\n\n## Available Actions
You have tools that can perform REAL actions — book appointments, save contacts, search knowledge, send notifications, and more.

### When to use actions:
- User wants to BOOK, SCHEDULE, or RESERVE something → use calendar/booking tools
- User provides contact info (name, email, phone) → use collect_lead to save it
- User asks a specific question and the current context doesn't have the answer → use search_knowledge
- User wants to talk to a human or has an urgent issue → use send_notification
- User wants to make a purchase or check payment → use payment tools

### Action Rules:
1. ANSWER from knowledge base first. Only use tools when the user needs an ACTION, not just information.
2. Before irreversible actions (booking, payment), CONFIRM with the user: ask "Подтверждаете?"
3. Collect required fields naturally through conversation — don't ask for everything at once.
4. If a tool fails, apologize and offer a manual alternative.
5. After a successful action, briefly confirm what was done.
6. NEVER make up data — only use information the user explicitly provided.`;

    // Custom action instructions from business owner
    if (config.actionsSystemPrompt) {
      prompt += `\n\n### Business-specific action rules:\n${config.actionsSystemPrompt}`;
    }
  }

  // Rich content formatting
  prompt += `\n\nRICH CONTENT FORMATTING:
When listing 2+ services, properties, rooms, team members, or products, format as a carousel:
:::carousel
---
title: Item Name
description: Brief description (1 sentence)
button: Action Label | https://link
---
:::

When the user shows clear intent to book, schedule, or request a quote, and you need their contact info, use a form:
:::form
name: Your name
phone: Phone number
email: Email
submit: Submit
:::
Only use :::form ONCE per conversation. Use plain text for normal responses.`;

  // Follow-up suggestions
  prompt +=
    '\n\nIMPORTANT: At the very end of your response, suggest exactly 3 brief follow-up questions the user might want to ask next. Format them EXACTLY as: [SUGGESTIONS]question 1|question 2|question 3[/SUGGESTIONS]. Keep each question under 50 characters. Do not include this format anywhere else in your response.';

  return prompt;
}

// ── Agentic Stream ─────────────────────────────────────────────────────────

export async function agenticChatStream(input: RouteMessageInput): Promise<{
  stream: ReadableStream;
  error?: string;
  status?: number;
}> {
  await connectDB();

  // 1. Validate client
  const client = await Client.findOne({ clientId: input.clientId }).select('isActive userId');
  if (!client || !client.isActive) {
    return { stream: new ReadableStream(), error: 'Widget is disabled', status: 403 };
  }

  // 2. Get config
  const config = await getAgenticConfig(input.clientId);

  // 3. Handoff check
  if (config.handoffEnabled && input.sessionId) {
    const activeHandoff = await getActiveHandoff(input.clientId, input.sessionId);
    if (activeHandoff) {
      const encoder = new TextEncoder();
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: activeHandoff.message })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        }),
      };
    }

    if (detectHandoffRequest(input.message)) {
      const handoffMessage = await createHandoff({
        clientId: input.clientId,
        sessionId: input.sessionId,
        channel: input.channel,
        customerName:
          (input.metadata?.whatsappFromName as string) || (input.metadata?.telegramUsername as string) || undefined,
        customerContact:
          (input.metadata?.whatsappFrom as string) || (input.metadata?.telegramChatId as string) || undefined,
        lastCustomerMessage: input.message,
        metadata: input.metadata,
      });

      const encoder = new TextEncoder();
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: handoffMessage })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        }),
      };
    }
  }

  // 4. Load tools for this widget
  const tools = await loadWidgetTools(input.clientId);

  // 5. Build RAG context
  const ragContext = await buildContext(input.clientId, input.message, config.topK);

  // 6. Build system prompt
  let systemPrompt = buildAgenticSystemPrompt(config, ragContext, tools, input.conversationHistory, input.metadata);

  // 6a. Customer Memory
  const agentVisitorId = (input.metadata?.visitorId as string) || input.sessionId || 'anonymous';
  if (config.customerMemoryEnabled) {
    try {
      await getOrCreateProfile(input.clientId, agentVisitorId, input.channel);
      const customerContext = await buildCustomerContext(input.clientId, agentVisitorId);
      if (customerContext) systemPrompt += customerContext;
    } catch (e) {
      console.error('[AgenticRouter] Customer memory error:', e);
    }
  }

  // 6b. Emotion AI
  if (config.emotionAIEnabled && input.conversationHistory) {
    const sentiment = analyzeConversationSentiment([
      ...input.conversationHistory,
      { role: 'user', content: input.message },
    ]);
    const emotionContext = buildEmotionContext(sentiment);
    if (emotionContext) systemPrompt += emotionContext;
    updateProfileSentiment(input.clientId, agentVisitorId, sentiment).catch(() => {});
  }

  // 6c. Persona routing
  if (config.personasEnabled) {
    try {
      const { overlay } = await selectPersona(input.clientId, input.message);
      if (overlay) systemPrompt += overlay;
    } catch (e) {
      console.error('[AgenticRouter] Persona error:', e);
    }
  }

  // 7. Create Gemini chat with function calling
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  const history = (input.conversationHistory || []).slice(-6).map((msg) => ({
    role: msg.role === 'user' ? ('user' as const) : ('model' as const),
    parts: [{ text: msg.content }],
  }));

  const chat = ai.chats.create({
    model: config.model,
    config: {
      systemInstruction: systemPrompt,
      tools: tools.declarations.length > 0 ? [{ functionDeclarations: tools.declarations }] : undefined,
      maxOutputTokens: config.maxTokens,
      temperature: config.temperature,
    },
    history,
  });

  // 8. Build the SSE stream with agentic loop
  const encoder = new TextEncoder();
  const toolCtx: WidgetToolContext = {
    clientId: input.clientId,
    userId: client.userId || '',
    sessionId: input.sessionId || 'anonymous',
    channel: input.channel,
  };

  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';
      let totalInputTokens = 0;
      let totalOutputTokens = 0;
      let actionCount = 0;

      try {
        let nextMessage: string | Part[] = input.message;
        let loopCount = 0;

        while (loopCount < MAX_ACTION_LOOPS) {
          loopCount++;

          let response;
          try {
            response = await chat.sendMessage({ message: nextMessage });
          } catch (err) {
            const errMsg = (err as Error).message || 'AI error';
            console.error('[AgenticRouter] sendMessage error:', errMsg);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
            break;
          }

          // Track tokens
          const usage = response.usageMetadata;
          if (usage) {
            totalInputTokens += usage.promptTokenCount || 0;
            totalOutputTokens += usage.candidatesTokenCount || 0;
          }

          // Extract text
          const text = response.text;
          if (text) {
            fullResponse += text;
            // Stream text token by token (split into chunks for smoother UX)
            const chunks = text.match(/.{1,100}/g) || [text];
            for (const chunk of chunks) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: chunk })}\n\n`));
            }
          }

          // Check for function calls
          const functionCalls = response.functionCalls || [];
          if (functionCalls.length === 0) break;

          // Rate limit check
          if (actionCount + functionCalls.length > config.maxActionsPerSession) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ token: '\n\nAction limit reached for this session. Please contact a manager for further assistance.' })}\n\n`
              )
            );
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            break;
          }

          // Execute function calls
          const functionResponseParts: Part[] = [];

          for (const fc of functionCalls) {
            const toolName = fc.name || 'unknown';
            const toolArgs = (fc.args || {}) as Record<string, unknown>;
            actionCount++;

            // Emit action_start event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ action_start: toolName, args: toolArgs })}\n\n`)
            );

            // Execute tool
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

            // Emit action_result event
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ action_result: toolName, result: toolResult })}\n\n`)
            );

            functionResponseParts.push({
              functionResponse: {
                name: toolName,
                response: toolResult,
              },
            } as Part);
          }

          // Send function responses back to Gemini
          nextMessage = functionResponseParts;
        }

        // Parse rich blocks from final response
        const { cleanText, richBlocks } = parseRichBlocks(fullResponse);
        if (richBlocks.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ rich: richBlocks })}\n\n`));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        fullResponse = cleanText;
      } catch (e) {
        console.error('[AgenticRouter] Stream error:', e);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`));
      } finally {
        controller.close();

        // Log conversation + cost tracking
        try {
          if (input.sessionId) {
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
                $setOnInsert: {
                  clientId: input.clientId,
                  sessionId: input.sessionId,
                  metadata: { ...input.metadata, channel: input.channel },
                },
              },
              { upsert: true, new: true }
            );
          }

          // Update cost tracking
          if (totalInputTokens > 0 || totalOutputTokens > 0) {
            const costUsd = calculateCost(config.model, totalInputTokens, totalOutputTokens);
            await Client.findOneAndUpdate(
              { clientId: input.clientId },
              {
                $inc: {
                  requests: 1,
                  monthlyTokensInput: totalInputTokens,
                  monthlyTokensOutput: totalOutputTokens,
                  monthlyCostUsd: costUsd,
                  costUsd: costUsd,
                },
              }
            );
          }

          // Post-processing: inbox, funnel, memory, intelligence
          if (input.sessionId) {
            trackFunnelEvent(input.clientId, agentVisitorId, input.sessionId, 'chat_started').catch(() => {});
            upsertInboxThread(input.clientId, input.sessionId, input.channel, input.message, 'user', {
              visitorId: agentVisitorId,
            }).catch(() => {});
            upsertInboxThread(input.clientId, input.sessionId, input.channel, fullResponse, 'assistant', {
              visitorId: agentVisitorId,
            }).catch(() => {});

            if (config.customerMemoryEnabled && input.conversationHistory) {
              processConversation(input.clientId, agentVisitorId, input.sessionId, [
                ...input.conversationHistory,
                { role: 'user', content: input.message },
                { role: 'assistant', content: fullResponse },
              ]).catch(() => {});
            }

            if (input.conversationHistory && input.conversationHistory.length >= 4) {
              processConversationIntelligence(input.clientId, input.sessionId, agentVisitorId, [
                ...input.conversationHistory,
                { role: 'user', content: input.message },
                { role: 'assistant', content: fullResponse },
              ]).catch(() => {});
            }
          }
        } catch (logError) {
          console.error('[AgenticRouter] Post-stream error:', logError);
        }
      }
    },
  });

  return { stream };
}
