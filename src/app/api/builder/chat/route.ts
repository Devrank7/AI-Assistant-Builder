// src/app/api/builder/chat/route.ts
import { NextRequest } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { Errors } from '@/lib/apiResponse';
import BuilderSession from '@/models/BuilderSession';
import User from '@/models/User';
import { createSSEStream, createSSEHeaders } from '@/lib/builder/sseUtils';
import { createToolRegistry } from '@/lib/builder/tools';
import { runAgentLoop } from '@/lib/builder/geminiAgent';
import { BUILDER_SYSTEM_PROMPT } from '@/lib/builder/systemPrompt';
import type { ToolContext } from '@/lib/builder/toolRegistry';

const activeStreams = new Map<string, boolean>();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { sessionId, message } = body;

    if (!message || typeof message !== 'string') {
      return Errors.badRequest('message is required');
    }

    await connectDB();

    // Get or create session
    let session;
    if (sessionId) {
      session = await BuilderSession.findOne({ _id: sessionId, userId: auth.userId });
      if (!session) return Errors.notFound('Session not found');

      if (activeStreams.get(sessionId)) {
        return new Response(JSON.stringify({ success: false, error: 'Another stream is active for this session' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      session = await BuilderSession.create({
        userId: auth.userId,
        messages: [],
        status: 'chatting',
        currentStage: 'input',
      });
    }

    // Add user message
    session.messages.push({ role: 'user', content: message, timestamp: new Date() });
    session.status = 'streaming';
    await session.save();

    const currentSessionId = session._id.toString();
    activeStreams.set(currentSessionId, true);

    const baseUrl = request.nextUrl.origin;
    const cookie = request.headers.get('cookie') || '';
    const currentUser = await User.findById(auth.userId);
    const userPlan = currentUser?.plan || 'none';

    // Build conversation for Gemini (convert session messages to simple format)
    const conversationMessages = session.messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const toolRegistry = createToolRegistry();

    const stream = createSSEStream(async (write) => {
      try {
        const toolContext: ToolContext = {
          sessionId: currentSessionId,
          userId: auth.userId,
          baseUrl,
          cookie,
          write,
          userPlan,
        };

        const { assistantText, toolCallsMade } = await runAgentLoop({
          systemPrompt: BUILDER_SYSTEM_PROMPT,
          messages: conversationMessages,
          toolRegistry,
          toolContext,
          write,
        });

        // Save assistant response
        if (assistantText) {
          session.messages.push({
            role: 'assistant',
            content: assistantText,
            timestamp: new Date(),
          });
        }

        // Update session stage based on tool calls
        if (toolCallsMade.includes('analyze_site')) session.currentStage = 'analysis';
        if (toolCallsMade.includes('select_theme')) session.currentStage = 'design';
        if (toolCallsMade.includes('build_deploy')) {
          session.currentStage = 'deploy';
          session.status = 'deployed';
        }
        if (toolCallsMade.includes('crawl_knowledge')) {
          session.knowledgeUploaded = true;
        }

        if (session.status === 'streaming') session.status = 'chatting';
        await session.save();

        write({ type: 'session', sessionId: currentSessionId });
      } finally {
        activeStreams.delete(currentSessionId);
      }
    });

    return new Response(stream, { headers: createSSEHeaders() });
  } catch (error) {
    console.error('Builder chat error:', error);
    return Errors.internal('Failed to process chat message');
  }
}
