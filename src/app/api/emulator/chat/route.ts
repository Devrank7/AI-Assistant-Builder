import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import InstagramConfig from '@/models/InstagramConfig';

/**
 * POST /api/emulator/chat
 *
 * Emulator endpoint for DemoSender demo video recording.
 * Uses the global InstagramConfig system prompt (set via PUT /api/instagram-config/context)
 * and calls Gemini directly — bypasses Client validation.
 *
 * Request body:
 *   { message: string, conversationHistory?: { role: string, content: string }[], sessionId?: string }
 *
 * Response:
 *   { success: true, response: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, conversationHistory = [], sessionId } = body;

    if (!message) {
      return NextResponse.json({ success: false, error: 'Message is required' }, { status: 400 });
    }

    await connectDB();

    // Load global Instagram config (set by configure-prompt)
    const config = await InstagramConfig.findOne({});
    if (!config) {
      return NextResponse.json({ success: false, error: 'Instagram config not found' }, { status: 404 });
    }

    const systemPrompt = config.systemPrompt;
    const aiModel = config.aiModel || 'gemini-3-flash-preview';
    const temperature = config.temperature ?? 0.7;
    const maxTokens = config.maxTokens || 2048;

    // Call Gemini directly (same as processGlobalInstagramWebhook)
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({
      model: aiModel,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    let prompt = systemPrompt;

    // Add conversation history
    if (conversationHistory.length > 0) {
      const history = conversationHistory
        .slice(-10)
        .map((m: { role: string; content: string }) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n');
      prompt += `\n\nConversation history:\n${history}`;
    }

    prompt += `\n\nUser message: ${message}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    return NextResponse.json({
      success: true,
      response: responseText,
      model: aiModel,
    });
  } catch (error: unknown) {
    console.error('[Emulator Chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to generate response: ${errorMessage}` },
      { status: 500 }
    );
  }
}
