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
const pendingFileTexts = new Map<string, { text: string; timestamp: number }>();

function cleanupPendingFiles() {
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  for (const [key, val] of pendingFileTexts) {
    if (val.timestamp < fiveMinAgo) pendingFileTexts.delete(key);
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyUser(request);
    if (!auth.authenticated) return auth.response;

    const body = await request.json();
    const { sessionId, message, fileContext } = body;

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

    // Augment message with file context if present
    let augmentedMessage = message;
    if (fileContext && fileContext.preview) {
      const fileMeta = [
        `Attached file: ${fileContext.filename}`,
        `(${fileContext.type}, ${fileContext.wordCount} words, ${Math.round(fileContext.size / 1024)} KB)`,
        fileContext.pages ? `${fileContext.pages} pages` : null,
      ]
        .filter(Boolean)
        .join(' ');

      augmentedMessage = `${message || 'User uploaded a file'}\n\n---\n[${fileMeta}]\nContent preview:\n${fileContext.preview}\n\nIMPORTANT: The full text of this file is available. To add it to the widget's knowledge base, call upload_knowledge_text with text set to "__FILE_CONTENT__". To answer questions about the file, use the preview above.\n---`;
    }

    // Store fullText in memory map
    if (fileContext && fileContext.fullText) {
      cleanupPendingFiles();
      const sid = session._id.toString();
      pendingFileTexts.set(sid, { text: fileContext.fullText, timestamp: Date.now() });
    }

    // Add user message
    session.messages.push({ role: 'user', content: augmentedMessage, timestamp: new Date() });
    session.status = 'streaming';
    await session.save();

    const currentSessionId = session._id.toString();
    activeStreams.set(currentSessionId, true);

    // Internal server-to-server calls must use localhost to preserve cookies
    const baseUrl = `http://localhost:${process.env.PORT || 3000}`;
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
        // Track crm_instruction events so we can persist them with the assistant message
        let lastCrmInstruction: { provider: string; steps: string[] } | undefined;
        const wrappedWrite: typeof write = (event) => {
          if (event.type === 'crm_instruction') {
            lastCrmInstruction = { provider: event.provider, steps: event.steps };
          }
          write(event);
        };

        const toolContext: ToolContext = {
          sessionId: currentSessionId,
          userId: auth.userId,
          baseUrl,
          cookie,
          write: wrappedWrite,
          userPlan,
          pendingFileText: pendingFileTexts.get(currentSessionId)?.text,
        };

        // Load memory from previous sessions
        const { loadSessionMemory } = await import('@/lib/builder/sessionMemory');
        const memoryContext = await loadSessionMemory(auth.userId, currentSessionId);
        const systemPromptWithMemory = memoryContext
          ? `${BUILDER_SYSTEM_PROMPT}\n\n${memoryContext}`
          : BUILDER_SYSTEM_PROMPT;

        const { assistantText, toolCallsMade } = await runAgentLoop({
          systemPrompt: systemPromptWithMemory,
          messages: conversationMessages,
          toolRegistry,
          toolContext,
          write: wrappedWrite,
        });

        // Clean up pending file text
        pendingFileTexts.delete(currentSessionId);

        // Save assistant response
        if (assistantText) {
          session.messages.push({
            role: 'assistant',
            content: assistantText,
            timestamp: new Date(),
            ...(lastCrmInstruction ? { crmInstruction: lastCrmInstruction } : {}),
          });
        }

        // Update session stage based on tool calls
        if (toolCallsMade.includes('analyze_site')) session.currentStage = 'analysis';
        if (toolCallsMade.includes('generate_design') || toolCallsMade.includes('select_theme'))
          session.currentStage = 'design';
        if (toolCallsMade.includes('crawl_knowledge')) {
          session.knowledgeUploaded = true;
          session.currentStage = 'knowledge';
        }
        // After knowledge is uploaded and widget is built, move to customize stage
        if (
          session.knowledgeUploaded &&
          session.clientId &&
          !toolCallsMade.includes('build_deploy') &&
          (session.currentStage === 'knowledge' || session.currentStage === 'design')
        ) {
          session.currentStage = 'customize';
        }
        if (toolCallsMade.includes('build_deploy')) {
          // If knowledge was already uploaded, go straight to deploy
          // Otherwise set deploy stage
          session.currentStage = 'deploy';
          session.status = 'deployed';
        }

        // Reload session from DB — tools may have updated clientId, stage, etc.
        const freshSession = await BuilderSession.findById(currentSessionId);
        if (freshSession) {
          // Merge: keep messages from our local session, take other fields from DB
          freshSession.messages = session.messages;
          if (freshSession.status === 'streaming') freshSession.status = 'chatting';
          await freshSession.save();

          // Emit widget_ready AFTER all tools complete (build + knowledge + ai-settings)
          if (freshSession.clientId) {
            const builtWidget =
              toolCallsMade.includes('generate_design') ||
              toolCallsMade.includes('build_deploy') ||
              toolCallsMade.includes('modify_widget_code') ||
              toolCallsMade.includes('rollback');
            if (builtWidget) {
              write({ type: 'widget_ready', clientId: freshSession.clientId });
            }
          }
        } else {
          if (session.status === 'streaming') session.status = 'chatting';
          await session.save();
        }

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
