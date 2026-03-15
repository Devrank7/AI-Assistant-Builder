// src/app/api/builder/chat/route.ts
import { NextRequest } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import { verifyUser } from '@/lib/auth';
import { Errors } from '@/lib/apiResponse';
import { getDefaultModel } from '@/lib/models';
import BuilderSession from '@/models/BuilderSession';
import { createSSEStream, createSSEHeaders } from '@/lib/builder/sseUtils';
import { GEMINI_TOOL_DECLARATIONS, getToolExecutor } from '@/lib/builder/agentTools';
import type { AgentToolName } from '@/lib/builder/types';

// Track active streams per session to prevent concurrent connections
const activeStreams = new Map<string, boolean>();

const SYSTEM_PROMPT = `You are an AI widget builder agent for WinBix AI. You help users create customized chat widgets for their businesses.

Your capabilities (use the available tools):
- analyze_site: Crawl a website to extract colors, fonts, and content
- generate_themes: Signal the UI to show theme variant comparison
- select_theme: Apply a selected theme variant
- build_widget: Build and deploy the widget
- crawl_knowledge: Upload website content to the widget's knowledge base
- connect_crm: Validate and activate CRM integrations
- set_panel_mode: Switch the right panel view

WORKFLOW:
1. When user provides a URL, call analyze_site immediately
2. After analysis, generate 3 theme.json variants and present them (call generate_themes, then output the 3 variants as JSON in your response)
3. When user picks a variant, call select_theme
4. Call crawl_knowledge to populate the knowledge base
5. Call build_widget to build and deploy
6. After deployment, help the user iterate (color changes, greeting updates)
7. If user asks about CRM, provide instructions and call connect_crm when they give an API key

When generating theme variants, output them as a JSON block with this format:
\`\`\`json
{"variants": [{"label": "Name", "theme": {theme.json fields...}}, ...]}
\`\`\`

Always be conversational and explain what you're doing. Use the tools proactively.`;

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

      // Check for concurrent stream
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

    // Add user message to session
    session.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });
    session.status = 'streaming';
    await session.save();

    const currentSessionId = session._id.toString();
    activeStreams.set(currentSessionId, true);

    // Build conversation history for Gemini
    const conversationHistory = session.messages.map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const baseUrl = request.nextUrl.origin;
    const cookie = request.headers.get('cookie') || '';

    const stream = createSSEStream(async (write) => {
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const modelId = getDefaultModel().id;
        const model = genAI.getGenerativeModel({
          model: modelId,
          systemInstruction: SYSTEM_PROMPT,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tools: [{ functionDeclarations: GEMINI_TOOL_DECLARATIONS as any }],
        });

        const chat = model.startChat({
          history: conversationHistory.slice(0, -1), // All except last user message
        });

        let response = await chat.sendMessage(message);
        let fullAssistantText = '';

        // Process response — may include function calls
        while (true) {
          const candidate = response.response.candidates?.[0];
          if (!candidate) break;

          for (const part of candidate.content.parts) {
            if (part.text) {
              fullAssistantText += part.text;
              write({ type: 'text', content: part.text });

              // Check for theme variants JSON in text
              const variantsMatch = part.text.match(/```json\s*\n([\s\S]*?)```/);
              if (variantsMatch) {
                try {
                  const parsed = JSON.parse(variantsMatch[1]);
                  if (parsed.variants && Array.isArray(parsed.variants)) {
                    write({ type: 'ab_variants', variants: parsed.variants });
                    // Store variants in session
                    session.abVariants = parsed.variants.map(
                      (v: { label: string; theme: Record<string, unknown> }) => ({
                        label: v.label,
                        themeJson: v.theme,
                      })
                    );
                  }
                } catch {
                  /* not valid JSON, skip */
                }
              }
            }

            if (part.functionCall) {
              const toolName = part.functionCall.name as AgentToolName;
              const toolArgs = part.functionCall.args as Record<string, unknown>;

              write({ type: 'tool_start', tool: toolName, args: toolArgs });

              const executor = getToolExecutor(toolName);
              let toolResult: Record<string, unknown>;

              if (executor) {
                try {
                  toolResult = await executor(toolArgs, {
                    sessionId: currentSessionId,
                    userId: auth.userId,
                    baseUrl,
                    cookie,
                    write,
                  });
                } catch (err) {
                  toolResult = { success: false, error: (err as Error).message };
                  write({ type: 'error', message: (err as Error).message, recoverable: true });
                }
              } else {
                toolResult = { success: false, error: `Unknown tool: ${toolName}` };
              }

              write({ type: 'tool_result', tool: toolName, result: toolResult });

              // Update session based on tool results
              if (toolName === 'analyze_site' && toolResult.success) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                session.siteProfile = (toolResult as any).profile;
                session.currentStage = 'analysis';
              } else if (toolName === 'select_theme' && toolResult.success) {
                const idx = toolResult.selectedVariant as number;
                session.selectedVariant = idx;
                if (session.abVariants?.[idx]) {
                  session.themeJson = session.abVariants[idx].themeJson;
                }
                session.currentStage = 'design';
              } else if (toolName === 'build_widget' && toolResult.success) {
                session.clientId = toolResult.clientId as string;
                session.currentStage = 'deploy';
                session.status = 'deployed';
              } else if (toolName === 'crawl_knowledge' && toolResult.success) {
                session.knowledgeUploaded = true;
                session.currentStage = 'knowledge';
              } else if (toolName === 'connect_crm' && toolResult.success) {
                const provider = toolArgs.provider as string;
                const existing = session.connectedIntegrations?.find(
                  (i: { provider: string }) => i.provider === provider
                );
                if (existing) {
                  existing.status = 'connected';
                } else {
                  session.connectedIntegrations = [
                    ...(session.connectedIntegrations || []),
                    { provider, status: 'connected' },
                  ];
                }
                session.currentStage = 'integrations';
              }

              // Feed tool result back to Gemini for continuation
              response = await chat.sendMessage([
                {
                  functionResponse: {
                    name: toolName,
                    response: toolResult,
                  },
                },
              ]);

              // Don't break — continue processing the new response
              continue;
            }
          }

          // No more function calls — break the loop
          break;
        }

        // Save assistant response to session
        if (fullAssistantText) {
          session.messages.push({
            role: 'assistant',
            content: fullAssistantText,
            timestamp: new Date(),
          });
        }

        if (session.status === 'streaming') {
          session.status = 'chatting';
        }
        await session.save();

        // Send sessionId to frontend
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
