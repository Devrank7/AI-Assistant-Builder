import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings, { defaultSystemPrompt } from '@/models/AISettings';
import ChatLog from '@/models/ChatLog';
import Client from '@/models/Client';
import { generateEmbedding, generateResponse, findSimilarChunks } from '@/lib/gemini';
import { calculateCost, getModel, getDefaultModel } from '@/lib/models';
import { checkCostLimit, trackCost } from '@/lib/costGuard';

export async function POST(request: NextRequest) {
  try {
    const { clientId, message, conversationHistory, sessionId, metadata } = await request.json();

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

    // Check cost limits before processing
    const costCheck = await checkCostLimit(clientId);
    if (!costCheck.allowed) {
      return NextResponse.json(
        { success: false, error: costCheck.message, costStatus: costCheck.status },
        { status: 429 }
      );
    }

    // Get AI settings for client
    const settingsDoc = await AISettings.findOne({ clientId });
    const selectedModel = settingsDoc?.aiModel || getDefaultModel().id;
    const resolvedModel = getModel(selectedModel);
    const config = {
      model: resolvedModel.id,
      systemPrompt: settingsDoc?.systemPrompt || defaultSystemPrompt,
      temperature: settingsDoc?.temperature || 0.7,
      maxTokens: settingsDoc?.maxTokens || 1024,
      topK: settingsDoc?.topK || 3,
    };

    // Get all knowledge chunks for client
    const allChunks = await KnowledgeChunk.find({ clientId }).select('text embedding');

    let context = '';

    // If there are knowledge chunks, do RAG retrieval
    if (allChunks.length > 0) {
      // Generate embedding for user query
      const queryEmbedding = await generateEmbedding(message);

      // Find most similar chunks
      const chunksWithEmbeddings = allChunks.map((c) => ({
        text: c.text,
        embedding: c.embedding,
      }));

      // Use optimized findSimilarChunks with built-in filtering
      const relevantChunks = await findSimilarChunks(
        queryEmbedding,
        chunksWithEmbeddings,
        config.topK || 3,
        0.3 // minimum similarity threshold
      );

      if (relevantChunks.length > 0) {
        context = relevantChunks.map((c, i) => `[${i + 1}] ${c.text}`).join('\n\n');
      }
    }

    // Build conversation context if provided
    let conversationContext = '';
    if (conversationHistory && Array.isArray(conversationHistory)) {
      const recentHistory = conversationHistory.slice(-6); // Last 3 exchanges
      conversationContext = recentHistory
        .map(
          (msg: { role: string; content: string }) =>
            `${msg.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${msg.content}`
        )
        .join('\n');
    }

    // Combine system prompt with conversation history
    const fullSystemPrompt = conversationContext
      ? `${config.systemPrompt}\n\nИстория разговора:\n${conversationContext}`
      : config.systemPrompt;

    // Generate response using selected model with context caching
    const result = await generateResponse(
      clientId,
      fullSystemPrompt,
      context,
      message,
      config.temperature,
      config.maxTokens,
      config.model
    );

    // Calculate cost and track usage (async, non-blocking)
    const requestCost = calculateCost(config.model, result.tokensUsed.input, result.tokensUsed.output);

    trackCost(clientId, result.tokensUsed.input, result.tokensUsed.output, requestCost).catch((err) =>
      console.error('Failed to track cost:', err)
    );

    // Log conversation to ChatLog (async, non-blocking)
    if (sessionId) {
      const logSessionId = sessionId || `session_${Date.now()}`;

      ChatLog.findOneAndUpdate(
        { clientId, sessionId: logSessionId },
        {
          $push: {
            messages: {
              $each: [
                { role: 'user', content: message, timestamp: new Date() },
                { role: 'assistant', content: result.text, timestamp: new Date() },
              ],
            },
          },
          $setOnInsert: {
            clientId,
            sessionId: logSessionId,
            metadata: metadata || {},
          },
        },
        { upsert: true, new: true }
      ).catch((err) => console.error('Failed to log chat:', err));
    }

    return NextResponse.json({
      success: true,
      response: result.text,
      usedContext: context ? true : false,
      chunksUsed: context ? context.split('\n\n').length : 0,
      model: config.model,
      tokensUsed: result.tokensUsed,
      costUsd: requestCost,
      ...(costCheck.status === 'warning' ? { costWarning: costCheck.message } : {}),
    });
  } catch (error) {
    console.error('Error in chat:', error);
    return NextResponse.json({ success: false, error: 'Failed to generate response' }, { status: 500 });
  }
}
