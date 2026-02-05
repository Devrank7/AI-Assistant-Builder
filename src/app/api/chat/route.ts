import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import AISettings, { defaultSystemPrompt } from '@/models/AISettings';
import { generateEmbedding, generateResponse, findSimilarChunks } from '@/lib/gemini';

export async function POST(request: NextRequest) {
    try {
        const { clientId, message, conversationHistory } = await request.json();

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

            const similarChunks = await findSimilarChunks(
                queryEmbedding,
                chunksWithEmbeddings,
                config.topK || 3
            );

            // Filter by minimum similarity threshold
            const relevantChunks = similarChunks.filter(c => c.similarity > 0.3);

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

        // Generate response
        const response = await generateResponse(
            fullSystemPrompt,
            context,
            message,
            config.temperature,
            config.maxTokens
        );

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
