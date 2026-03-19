/**
 * Channel Router
 *
 * Unified AI message handler for all channels (website, telegram, whatsapp, instagram).
 * Handles: client validation, cost checks, RAG retrieval, AI generation, response logging.
 *
 * Called by:
 * - POST /api/chat/stream (website widget, SSE streaming)
 * - POST /api/chat (website widget, non-streaming)
 * - Telegram bot (direct call)
 * - WhatsApp webhook handler
 * - Instagram webhook handler
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings, { defaultSystemPrompt } from '@/models/AISettings';
import ChatLog from '@/models/ChatLog';
import Client from '@/models/Client';
import Correction from '@/models/Correction';
import { generateEmbedding, findSimilarChunks } from '@/lib/gemini';
import { calculateCost, getModel, getDefaultModel } from '@/lib/models';
import { parseRichBlocks, type RichBlock } from '@/lib/richMessages';
import { detectHandoffRequest, getActiveHandoff, createHandoff } from '@/lib/handoff';
import { agenticChatStream } from '@/lib/agenticRouter';
import { getOrCreateProfile, buildCustomerContext, processConversation } from '@/lib/customerMemory';
import { analyzeConversationSentiment, buildEmotionContext, updateProfileSentiment } from '@/lib/emotionAI';
import { processConversationIntelligence } from '@/lib/conversationIntelligence';
import { selectPersona, buildPersonaContext } from '@/lib/personaRouter';
import { upsertInboxThread } from '@/lib/inboxManager';
import { trackFunnelEvent } from '@/lib/revenueTracker';
import { processNegativeFeedback } from '@/lib/autoLearning';

export type ChannelType = 'website' | 'telegram' | 'whatsapp' | 'instagram';

export interface RouteMessageInput {
  channel: ChannelType;
  clientId: string;
  message: string;
  sessionId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  metadata?: Record<string, unknown>;
  image?: { data: string; mimeType: string };
  audio?: { data: string; mimeType: string };
}

export interface RouteMessageResult {
  success: boolean;
  response: string;
  richBlocks: RichBlock[];
  error?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

interface AIConfig {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topK: number;
  handoffEnabled: boolean;
  emotionAIEnabled: boolean;
  personasEnabled: boolean;
  customerMemoryEnabled: boolean;
  autoLearningEnabled: boolean;
}

/**
 * Build RAG context from knowledge chunks and applied corrections
 */
async function buildContext(clientId: string, message: string, topK: number): Promise<string> {
  const allChunks = await KnowledgeChunk.find({ clientId }).select('text embedding source');

  if (allChunks.length === 0) return '';

  const queryEmbedding = await generateEmbedding(message);
  const chunksWithEmbeddings = allChunks.map((c) => ({
    text: c.text,
    embedding: c.embedding,
  }));

  const relevantChunks = await findSimilarChunks(queryEmbedding, chunksWithEmbeddings, topK, 0.3);

  if (relevantChunks.length === 0) return '';

  // Also fetch applied corrections (they have highest priority)
  const corrections = await Correction.find({ clientId, status: 'applied' })
    .select('userQuestion correctedAnswer')
    .lean();

  let context = '';

  // Corrections first (highest priority)
  if (corrections.length > 0) {
    const correctionContext = corrections
      .map((c, i) => `[CORRECTION ${i + 1}] Q: ${c.userQuestion} → A: ${c.correctedAnswer}`)
      .join('\n');
    context += correctionContext + '\n\n';
  }

  // Then RAG chunks
  context += relevantChunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');

  return context;
}

/**
 * Get AI configuration for a client
 */
async function getAIConfig(clientId: string): Promise<AIConfig> {
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
    emotionAIEnabled: settingsDoc?.emotionAIEnabled ?? false,
    personasEnabled: settingsDoc?.personasEnabled ?? false,
    customerMemoryEnabled: settingsDoc?.customerMemoryEnabled ?? false,
    autoLearningEnabled: settingsDoc?.autoLearningEnabled ?? false,
  };
}

/**
 * Build the full prompt including system prompt, conversation history, and RAG context
 */
function buildFullPrompt(
  config: AIConfig,
  context: string,
  conversationHistory?: Array<{ role: string; content: string }>
): string {
  let conversationContext = '';
  if (conversationHistory && Array.isArray(conversationHistory)) {
    const recentHistory = conversationHistory.slice(-6);
    conversationContext = recentHistory
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');
  }

  let prompt = config.systemPrompt;

  if (conversationContext) {
    prompt += `\n\nConversation history:\n${conversationContext}`;
  }

  if (context) {
    prompt += `\n\nKNOWLEDGE BASE CONTEXT:\n${context}`;
  }

  return prompt;
}

/**
 * Route a message through the AI pipeline.
 * Non-streaming version — returns full response.
 * Used by Telegram, WhatsApp, Instagram channels.
 */
export async function routeMessage(input: RouteMessageInput): Promise<RouteMessageResult> {
  await connectDB();

  // 1. Validate client
  const client = await Client.findOne({ clientId: input.clientId }).select('isActive');
  if (!client || !client.isActive) {
    return {
      success: false,
      response: '',
      richBlocks: [],
      error: 'Widget is disabled',
      model: '',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    };
  }

  // 2. Get AI config (needed before handoff check for handoffEnabled flag)
  const config = await getAIConfig(input.clientId);

  // 4. Handoff check — only if enabled for this client
  if (config.handoffEnabled && input.sessionId) {
    const activeHandoff = await getActiveHandoff(input.clientId, input.sessionId);
    if (activeHandoff) {
      return {
        success: true,
        response: activeHandoff.message,
        richBlocks: [],
        model: '',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
    }

    // Check if customer is requesting a human operator
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

      return {
        success: true,
        response: handoffMessage,
        richBlocks: [],
        model: '',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
      };
    }
  }

  // 5. Build RAG context
  const context = await buildContext(input.clientId, input.message, config.topK);

  // 6. Build prompt with new AI features
  let fullSystemPrompt = buildFullPrompt(config, context, input.conversationHistory);

  // 6a. Customer Memory — inject profile context
  const visitorId = (input.metadata?.visitorId as string) || input.sessionId || 'anonymous';
  if (config.customerMemoryEnabled) {
    try {
      await getOrCreateProfile(input.clientId, visitorId, input.channel);
      const customerContext = await buildCustomerContext(input.clientId, visitorId);
      if (customerContext) fullSystemPrompt += customerContext;
    } catch (e) {
      console.error('[ChannelRouter] Customer memory error:', e);
    }
  }

  // 6b. Emotion AI — analyze sentiment and inject tone adjustment
  if (config.emotionAIEnabled && input.conversationHistory) {
    const sentiment = analyzeConversationSentiment([
      ...input.conversationHistory,
      { role: 'user', content: input.message },
    ]);
    const emotionContext = buildEmotionContext(sentiment);
    if (emotionContext) fullSystemPrompt += emotionContext;
    // Update profile sentiment async
    updateProfileSentiment(input.clientId, visitorId, sentiment).catch(() => {});
  }

  // 6c. Persona routing — select and inject persona
  if (config.personasEnabled) {
    try {
      const { overlay } = await selectPersona(input.clientId, input.message);
      if (overlay) fullSystemPrompt += overlay;
    } catch (e) {
      console.error('[ChannelRouter] Persona error:', e);
    }
  }

  // 7. Generate response
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    },
  });

  const textPrompt = fullSystemPrompt + `\n\nUser question: ${input.message}`;
  // Build multimodal content parts if media is present
  const mediaParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
  if (input.image?.data) {
    mediaParts.push({ inlineData: { data: input.image.data, mimeType: input.image.mimeType || 'image/jpeg' } });
  }
  if (input.audio?.data) {
    mediaParts.push({ inlineData: { data: input.audio.data, mimeType: input.audio.mimeType || 'audio/ogg' } });
  }
  const contentInput = mediaParts.length > 0 ? [{ text: textPrompt }, ...mediaParts] : textPrompt;

  const result = await model.generateContent(contentInput);
  const response = result.response;

  // 8. Extract tokens
  const usage = response.usageMetadata;
  const inputTokens = usage?.promptTokenCount ?? Math.ceil((fullSystemPrompt.length + input.message.length) / 4);
  const outputTokens = usage?.candidatesTokenCount ?? Math.ceil(response.text().length / 4);
  const costUsd = calculateCost(config.model, inputTokens, outputTokens);

  // 9. Parse rich blocks
  const rawText = response.text();
  const { cleanText, richBlocks } = parseRichBlocks(rawText);

  // 10. Log conversation + post-processing (async)
  if (input.sessionId) {
    ChatLog.findOneAndUpdate(
      { clientId: input.clientId, sessionId: input.sessionId },
      {
        $push: {
          messages: {
            $each: [
              { role: 'user', content: input.message, timestamp: new Date() },
              { role: 'assistant', content: cleanText, timestamp: new Date() },
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
    ).catch((err) => console.error('Failed to log chat:', err));

    // Track funnel event
    trackFunnelEvent(input.clientId, visitorId, input.sessionId, 'chat_started').catch(() => {});

    // Update inbox thread
    upsertInboxThread(input.clientId, input.sessionId, input.channel, input.message, 'user', { visitorId }).catch(
      () => {}
    );
    upsertInboxThread(input.clientId, input.sessionId, input.channel, cleanText, 'assistant', { visitorId }).catch(
      () => {}
    );
  }

  // 11. Post-conversation processing (async, non-blocking)
  if (config.customerMemoryEnabled && input.conversationHistory) {
    processConversation(input.clientId, visitorId, input.sessionId || 'anonymous', [
      ...input.conversationHistory,
      { role: 'user', content: input.message },
      { role: 'assistant', content: cleanText },
    ]).catch(() => {});
  }

  // Conversation intelligence (async)
  if (input.conversationHistory && input.conversationHistory.length >= 4) {
    processConversationIntelligence(input.clientId, input.sessionId || 'anonymous', visitorId, [
      ...input.conversationHistory,
      { role: 'user', content: input.message },
      { role: 'assistant', content: cleanText },
    ]).catch(() => {});
  }

  return {
    success: true,
    response: cleanText,
    richBlocks,
    model: config.model,
    inputTokens,
    outputTokens,
    costUsd,
  };
}

/**
 * Route a message with SSE streaming.
 * Used by the website widget stream endpoint.
 * Returns a ReadableStream for SSE response.
 */
export async function routeMessageStream(input: RouteMessageInput): Promise<{
  stream: ReadableStream;
  error?: string;
  status?: number;
}> {
  await connectDB();

  // 1. Validate client
  const client = await Client.findOne({ clientId: input.clientId }).select('isActive');
  if (!client || !client.isActive) {
    return { stream: new ReadableStream(), error: 'Widget is disabled', status: 403 };
  }

  // 1.5. Check if agentic mode is enabled — delegate to agenticRouter if so
  const settingsForCheck = (await AISettings.findOne({ clientId: input.clientId }).select('actionsEnabled').lean()) as {
    actionsEnabled?: boolean;
  } | null;
  if (settingsForCheck?.actionsEnabled) {
    return agenticChatStream(input);
  }

  // 2. Get AI config (needed before handoff check for handoffEnabled flag)
  const config = await getAIConfig(input.clientId);

  // 4. Handoff check — only if enabled for this client
  if (config.handoffEnabled && input.sessionId) {
    const activeHandoff = await getActiveHandoff(input.clientId, input.sessionId);
    if (activeHandoff) {
      const encoder = new TextEncoder();
      const handoffStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: activeHandoff.message })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return { stream: handoffStream };
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
      const handoffStream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: handoffMessage })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });
      return { stream: handoffStream };
    }
  }

  // 5. Build RAG context
  const context = await buildContext(input.clientId, input.message, config.topK);

  // 6. Build prompt with new AI features
  let fullSystemPrompt = buildFullPrompt(config, context, input.conversationHistory);

  const streamVisitorId = (input.metadata?.visitorId as string) || input.sessionId || 'anonymous';

  // 6a. Customer Memory
  if (config.customerMemoryEnabled) {
    try {
      await getOrCreateProfile(input.clientId, streamVisitorId, input.channel);
      const customerContext = await buildCustomerContext(input.clientId, streamVisitorId);
      if (customerContext) fullSystemPrompt += customerContext;
    } catch (e) {
      console.error('[Stream] Customer memory error:', e);
    }
  }

  // 6b. Emotion AI
  if (config.emotionAIEnabled && input.conversationHistory) {
    const sentiment = analyzeConversationSentiment([
      ...input.conversationHistory,
      { role: 'user', content: input.message },
    ]);
    const emotionContext = buildEmotionContext(sentiment);
    if (emotionContext) fullSystemPrompt += emotionContext;
    updateProfileSentiment(input.clientId, streamVisitorId, sentiment).catch(() => {});
  }

  // 6c. Persona routing
  if (config.personasEnabled) {
    try {
      const { overlay } = await selectPersona(input.clientId, input.message);
      if (overlay) fullSystemPrompt += overlay;
    } catch (e) {
      console.error('[Stream] Persona error:', e);
    }
  }

  // 7. Start streaming
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    },
  });

  // Enhance prompt for website channel: page context + follow-up suggestions
  let enhancedPrompt = fullSystemPrompt;
  if (input.channel === 'website') {
    // Inject page context if available
    const pc = input.metadata?.pageContext as Record<string, unknown> | undefined;
    if (pc) {
      let pageInfo = '\n\nPage context (the user is currently viewing this page):';
      if (pc.title) pageInfo += `\nPage title: ${pc.title}`;
      if (pc.path) pageInfo += `\nURL path: ${pc.path}`;
      if (pc.description) pageInfo += `\nPage description: ${pc.description}`;
      if (Array.isArray(pc.headings) && pc.headings.length > 0)
        pageInfo += `\nMain headings: ${pc.headings.join(', ')}`;
      enhancedPrompt += pageInfo;
    }
    // Rich blocks: instruct AI to use structured formats when appropriate
    enhancedPrompt += `\n\nRICH CONTENT FORMATTING:
When listing 2+ services, properties, rooms, team members, or products, format as a carousel:
:::carousel
---
title: Item Name
description: Brief description (1 sentence)
button: Action Label | https://link
---
title: Another Item
description: Brief description
button: Action Label | https://link
:::

When the user shows clear intent to book, schedule, or request a quote, and you need their contact info, use a form:
:::form
name: Your name
phone: Phone number
email: Email
submit: Submit
:::
Only use :::form ONCE per conversation. Use plain text for normal responses.`;

    // Instruct AI to generate follow-up suggestions
    enhancedPrompt +=
      '\n\nIMPORTANT: At the very end of your response, suggest exactly 3 brief follow-up questions the user might want to ask next. Format them EXACTLY as: [SUGGESTIONS]question 1|question 2|question 3[/SUGGESTIONS]. Keep each question under 50 characters. Do not include this format anywhere else in your response.';
  }

  const textPrompt = enhancedPrompt + `\n\nUser question: ${input.message}`;
  // Build multimodal content parts if media is present
  const streamMediaParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];
  if (input.image?.data) {
    streamMediaParts.push({ inlineData: { data: input.image.data, mimeType: input.image.mimeType || 'image/jpeg' } });
  }
  if (input.audio?.data) {
    streamMediaParts.push({ inlineData: { data: input.audio.data, mimeType: input.audio.mimeType || 'audio/ogg' } });
  }
  const contentInput = streamMediaParts.length > 0 ? [{ text: textPrompt }, ...streamMediaParts] : textPrompt;

  const streamResult = await model.generateContentStream(contentInput);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let fullResponse = '';

      try {
        for await (const chunk of streamResult.stream) {
          const token = chunk.text();
          if (token) {
            fullResponse += token;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
          }
        }

        // Parse rich blocks from complete response
        const { cleanText, richBlocks } = parseRichBlocks(fullResponse);

        // Send rich blocks if any
        if (richBlocks.length > 0) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ rich: richBlocks })}\n\n`));
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        fullResponse = cleanText; // Use clean text for logging
      } catch (e) {
        console.error('[Stream] Streaming loop error:', e);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`));
      } finally {
        controller.close();

        // After stream ends, log chat + post-processing
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

            // Track funnel + inbox (async, non-blocking)
            trackFunnelEvent(input.clientId, streamVisitorId, input.sessionId, 'chat_started').catch(() => {});
            upsertInboxThread(input.clientId, input.sessionId, input.channel, input.message, 'user', {
              visitorId: streamVisitorId,
            }).catch(() => {});
            upsertInboxThread(input.clientId, input.sessionId, input.channel, fullResponse, 'assistant', {
              visitorId: streamVisitorId,
            }).catch(() => {});

            // Customer memory + intelligence (async)
            if (config.customerMemoryEnabled && input.conversationHistory) {
              processConversation(input.clientId, streamVisitorId, input.sessionId, [
                ...input.conversationHistory,
                { role: 'user', content: input.message },
                { role: 'assistant', content: fullResponse },
              ]).catch(() => {});
            }

            if (input.conversationHistory && input.conversationHistory.length >= 4) {
              processConversationIntelligence(input.clientId, input.sessionId, streamVisitorId, [
                ...input.conversationHistory,
                { role: 'user', content: input.message },
                { role: 'assistant', content: fullResponse },
              ]).catch(() => {});
            }
          }
        } catch (logError) {
          console.error('[Stream] Logging error:', logError);
        }
      }
    },
  });

  return { stream };
}
