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
import { checkCostLimit, trackCost } from '@/lib/costGuard';
import { parseRichBlocks, type RichBlock } from '@/lib/richMessages';
import { detectHandoffRequest, getActiveHandoff, createHandoff } from '@/lib/handoff';

export type ChannelType = 'website' | 'telegram' | 'whatsapp' | 'instagram';

export interface RouteMessageInput {
  channel: ChannelType;
  clientId: string;
  message: string;
  sessionId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  metadata?: Record<string, unknown>;
  image?: { data: string; mimeType: string };
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
  costWarning?: string;
}

interface AIConfig {
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  topK: number;
  handoffEnabled: boolean;
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
    maxTokens: settingsDoc?.maxTokens || 1024,
    topK: settingsDoc?.topK || 3,
    handoffEnabled: settingsDoc?.handoffEnabled ?? false,
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

  // 2. Check cost limits
  const costCheck = await checkCostLimit(input.clientId);
  if (!costCheck.allowed) {
    return {
      success: false,
      response: '',
      richBlocks: [],
      error: costCheck.message,
      model: '',
      inputTokens: 0,
      outputTokens: 0,
      costUsd: 0,
    };
  }

  // 3. Get AI config (needed before handoff check for handoffEnabled flag)
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

  // 6. Build prompt
  const fullSystemPrompt = buildFullPrompt(config, context, input.conversationHistory);

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
  const contentInput = input.image?.data
    ? [{ text: textPrompt }, { inlineData: { data: input.image.data, mimeType: input.image.mimeType || 'image/jpeg' } }]
    : textPrompt;

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

  // 10. Track cost (async)
  trackCost(input.clientId, inputTokens, outputTokens, costUsd).catch((err) =>
    console.error('Failed to track cost:', err)
  );

  // 11. Log conversation (async)
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
  }

  return {
    success: true,
    response: cleanText,
    richBlocks,
    model: config.model,
    inputTokens,
    outputTokens,
    costUsd,
    costWarning: costCheck.status === 'warning' ? costCheck.message : undefined,
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

  // 2. Check cost limits
  const costCheck = await checkCostLimit(input.clientId);
  if (!costCheck.allowed) {
    return { stream: new ReadableStream(), error: costCheck.message, status: 429 };
  }

  // 3. Get AI config (needed before handoff check for handoffEnabled flag)
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

  // 6. Build prompt
  const fullSystemPrompt = buildFullPrompt(config, context, input.conversationHistory);

  // 7. Start streaming
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({
    model: config.model,
    generationConfig: {
      temperature: config.temperature,
      maxOutputTokens: config.maxTokens,
    },
  });

  const textPrompt = fullSystemPrompt + `\n\nUser question: ${input.message}`;
  const contentInput = input.image?.data
    ? [{ text: textPrompt }, { inlineData: { data: input.image.data, mimeType: input.image.mimeType || 'image/jpeg' } }]
    : textPrompt;

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

        // After stream ends, log chat and cost
        try {
          let inputTokens: number;
          let outputTokens: number;
          try {
            const finalResponse = await streamResult.response;
            const usage = finalResponse.usageMetadata;
            inputTokens = usage?.promptTokenCount ?? Math.ceil((fullSystemPrompt.length + input.message.length) / 4);
            outputTokens = usage?.candidatesTokenCount ?? Math.ceil(fullResponse.length / 4);
          } catch {
            inputTokens = Math.ceil((fullSystemPrompt.length + input.message.length) / 4);
            outputTokens = Math.ceil(fullResponse.length / 4);
          }
          const requestCost = calculateCost(config.model, inputTokens, outputTokens);

          await trackCost(input.clientId, inputTokens, outputTokens, requestCost);

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
        } catch (logError) {
          console.error('[Stream] Logging error:', logError);
        }
      }
    },
  });

  return { stream };
}
