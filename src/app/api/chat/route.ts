import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings, { defaultSystemPrompt } from '@/models/AISettings';
import ChatLog from '@/models/ChatLog';
import { generateEmbedding, generateResponse, findSimilarChunks } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const { clientId, message, conversationHistory, sessionId, metadata } = await request.json();

        if (!clientId || !message) {
            return NextResponse.json(
                { success: false, error: 'clientId and message are required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Get AI settings for client
        const settingsDoc = await AISettings.findOne({ clientId });
        const config = {
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
            const chunksWithEmbeddings = allChunks.map(c => ({
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
                .map(msg => `${msg.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${msg.content}`)
                .join('\n');
        }

        // Combine system prompt with conversation history
        const fullSystemPrompt = conversationContext
            ? `${config.systemPrompt}\n\nИстория разговора:\n${conversationContext}`
            : config.systemPrompt;

        // Generate response using Gemini 3 Flash with context caching
        const response = await generateResponse(
            clientId,
            fullSystemPrompt,
            context,
            message,
            config.temperature,
            config.maxTokens
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
                                { role: 'assistant', content: response, timestamp: new Date() },
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
            ).catch(err => console.error('Failed to log chat:', err));
        }

        return NextResponse.json({
            success: true,
            response,
            usedContext: context ? true : false,
            chunksUsed: context ? context.split('\n\n').length : 0,
        });
    } catch (error) {
        console.error('Error in chat:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to generate response' },
            { status: 500 }
        );
    }
}
