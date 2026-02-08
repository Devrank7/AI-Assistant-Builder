import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings, { defaultSystemPrompt } from '@/models/AISettings';
import ChatLog from '@/models/ChatLog';
import Client from '@/models/Client';
import { generateEmbedding, findSimilarChunks } from '@/lib/gemini';
import { calculateCost, getModel, getDefaultModel } from '@/lib/models';
import { checkCostLimit, trackCost } from '@/lib/costGuard';
import mongoose from 'mongoose';

export async function POST(request: NextRequest) {
  try {
    const { clientId, message, conversationHistory, sessionId, metadata, image } = await request.json();

    if (!clientId || !message) {
      return NextResponse.json({ success: false, error: 'clientId and message are required' }, { status: 400 });
    }

    await connectDB();

    // Check if client is active
    const client = await Client.findOne({ clientId }).select('isActive');
    if (!client || !client.isActive) {
      return NextResponse.json(
        { success: false, error: 'Widget is disabled. Contact administrator.' },
        { status: 403 }
      );
    }

    // Check cost limits
    const costCheck = await checkCostLimit(clientId);
    if (!costCheck.allowed) {
      return NextResponse.json({ success: false, error: costCheck.message }, { status: 429 });
    }

    // Get AI settings
    const settingsDoc = await AISettings.findOne({ clientId });

    const selectedModel = settingsDoc?.aiModel || getDefaultModel().id;
    const resolvedModel = getModel(selectedModel);
    const systemPrompt = settingsDoc?.systemPrompt || defaultSystemPrompt;
    const config = {
      model: resolvedModel.id,
      systemPrompt,
      temperature: settingsDoc?.temperature || 0.7,
      maxTokens: settingsDoc?.maxTokens || 1024,
      topK: settingsDoc?.topK || 3,
    };

    // RAG Retrieval
    let context = '';
    const allChunks = await KnowledgeChunk.find({ clientId }).select('text embedding');

    if (allChunks.length > 0) {
      const queryEmbedding = await generateEmbedding(message);
      const chunksWithEmbeddings = allChunks.map((c) => ({
        text: c.text,
        embedding: c.embedding,
      }));

      const relevantChunks = await findSimilarChunks(queryEmbedding, chunksWithEmbeddings, config.topK || 3, 0.3);

      if (relevantChunks.length > 0) {
        context = relevantChunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
      }
    }

    // Build Prompt
    let conversationContext = '';
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6);
      conversationContext = recentHistory
        .map(
          (msg: { role: string; content: string }) =>
            `${msg.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${msg.content}`
        )
        .join('\n');
    }

    const fullSystemPrompt = conversationContext
      ? `${config.systemPrompt}\n\nИстория разговора:\n${conversationContext}\n\nВОТ КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:\n${context}`
      : `${config.systemPrompt}\n\nВОТ КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ:\n${context}`;

    // Initialize Gemini for Streaming
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: config.model,
      generationConfig: {
        temperature: config.temperature,
        maxOutputTokens: config.maxTokens,
      },
    });

    console.log(`[Stream] Generating content for client ${clientId} with model ${config.model}`);

    try {
      // Support multimodal input (text + image) for Gemini vision
      const textPrompt = fullSystemPrompt + `\n\nВопрос пользователя: ${message}`;
      const contentInput = image?.data
        ? [{ text: textPrompt }, { inlineData: { data: image.data, mimeType: image.mimeType || 'image/jpeg' } }]
        : textPrompt;

      const result = await model.generateContentStream(contentInput);

      // Create SSE Stream
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          let fullResponse = '';

          try {
            for await (const chunk of result.stream) {
              const token = chunk.text();
              if (token) {
                fullResponse += token;
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          } catch (e) {
            console.error('[Stream] Streaming loop error:', e);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`));
          } finally {
            controller.close();

            // After stream ends, log chat and cost
            try {
              // Get actual token counts from Gemini response metadata
              let inputTokens: number;
              let outputTokens: number;
              try {
                const finalResponse = await result.response;
                const usage = finalResponse.usageMetadata;
                inputTokens = usage?.promptTokenCount ?? Math.ceil((fullSystemPrompt.length + message.length) / 4);
                outputTokens = usage?.candidatesTokenCount ?? Math.ceil(fullResponse.length / 4);
              } catch {
                // Fallback to estimation if metadata unavailable
                inputTokens = Math.ceil((fullSystemPrompt.length + message.length) / 4);
                outputTokens = Math.ceil(fullResponse.length / 4);
              }
              const requestCost = calculateCost(config.model, inputTokens, outputTokens);

              await trackCost(clientId, inputTokens, outputTokens, requestCost);

              // Log chat
              if (sessionId) {
                await ChatLog.findOneAndUpdate(
                  { clientId, sessionId },
                  {
                    $push: {
                      messages: {
                        $each: [
                          { role: 'user', content: message, timestamp: new Date() },
                          { role: 'assistant', content: fullResponse, timestamp: new Date() },
                        ],
                      },
                    },
                    $setOnInsert: {
                      clientId,
                      sessionId,
                      metadata: metadata || {},
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

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch (genError: unknown) {
      console.error('[Stream] Generation error:', genError);
      const errorMessage = genError instanceof Error ? genError.message : 'Unknown error';
      return NextResponse.json({ success: false, error: 'Gemini API Error: ' + errorMessage }, { status: 500 });
    }
  } catch (error) {
    console.error('[Stream] Top-level error:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate response' }, { status: 500 });
  }
}
