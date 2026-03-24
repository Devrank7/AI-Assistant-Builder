// src/lib/builder/geminiAgent.ts
// Uses @google/genai (new SDK) which automatically handles thought_signatures
// for Gemini 3.1 Pro thinking model function calling
import { GoogleGenAI, Type } from '@google/genai';
import type { Part } from '@google/genai';
import type { ToolRegistry, ToolContext } from './toolRegistry';
import type { SSEEvent, AgentToolName } from './types';

const MAX_TOOL_LOOPS = 15;
const PRIMARY_MODEL = 'gemini-3.1-pro-preview';
const FALLBACK_MODEL = 'gemini-3-pro-preview';

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentRunOptions {
  systemPrompt: string;
  messages: AgentMessage[];
  toolRegistry: ToolRegistry;
  toolContext: ToolContext;
  write: (event: SSEEvent) => void;
}

/** Map our tool parameter types to the SDK's Type enum */
function mapType(type: string): Type {
  switch (type.toLowerCase()) {
    case 'string':
      return Type.STRING;
    case 'number':
      return Type.NUMBER;
    case 'integer':
      return Type.INTEGER;
    case 'boolean':
      return Type.BOOLEAN;
    case 'array':
      return Type.ARRAY;
    case 'object':
      return Type.OBJECT;
    default:
      return Type.STRING;
  }
}

export async function runAgentLoop(options: AgentRunOptions): Promise<{
  assistantText: string;
  toolCallsMade: string[];
}> {
  const { systemPrompt, toolRegistry, toolContext, write } = options;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

  // Convert ToolRegistry to Gemini FunctionDeclarations
  const functionDeclarations = toolRegistry.getAll().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: Type.OBJECT,
      properties: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, prop]) => [
          key,
          {
            type: mapType(prop.type),
            description: prop.description,
            ...(prop.enum ? { enum: prop.enum } : {}),
            ...(prop.items ? { items: { type: mapType(prop.items.type) } } : {}),
          },
        ])
      ),
      required: tool.parameters.required,
    },
  }));

  // Build conversation history
  const allMessages = options.messages;
  const lastMessage = allMessages[allMessages.length - 1];
  const historyMessages = allMessages.slice(0, -1);

  const history = historyMessages.map((msg) => ({
    role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
    parts: [{ text: msg.content }],
  }));

  // Create chat with model — supports automatic fallback on quota exhaustion
  function createChat(modelId: string) {
    return ai.chats.create({
      model: modelId,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ functionDeclarations }],
        maxOutputTokens: 65536,
        temperature: 0.3,
        topP: 0.8,
      },
      history,
    });
  }

  let chat = createChat(PRIMARY_MODEL);
  let currentModel = PRIMARY_MODEL;

  let fullAssistantText = '';
  const toolCallsMade: string[] = [];
  let loopCount = 0;

  // First message is the user's text; for function responses, pass Part[] as message
  let nextSendArgs: { message: string | Part[] } = {
    message: lastMessage.content,
  };

  while (loopCount < MAX_TOOL_LOOPS) {
    loopCount++;

    // Error recovery with retry + automatic model fallback on quota exhaustion
    let response;
    const MAX_RETRIES = 3;
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        response = await chat.sendMessage(nextSendArgs);
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err as Error;
        const msg = lastErr.message || '';
        console.error(
          `[geminiAgent] sendMessage error (attempt ${attempt + 1}/${MAX_RETRIES}, model=${currentModel}):`,
          msg
        );

        // Daily quota exhausted → switch to fallback model immediately
        const isDailyQuota = /quota.*per.*day|per_day|PerDay|retry in \d+h/i.test(msg);
        if (isDailyQuota && currentModel === PRIMARY_MODEL) {
          console.warn(`[geminiAgent] Daily quota exhausted for ${PRIMARY_MODEL}, switching to ${FALLBACK_MODEL}`);
          currentModel = FALLBACK_MODEL;
          chat = createChat(FALLBACK_MODEL);
          lastErr = null;
          // Retry immediately with fallback model (don't count as attempt)
          attempt--;
          continue;
        }

        const isTransient = /503|unavailable|overloaded|resource exhausted|too many requests|429/i.test(msg);
        if (isTransient && attempt < MAX_RETRIES - 1) {
          const delay = Math.min(2000 * Math.pow(2, attempt), 8000);
          write({ type: 'text', content: '' }); // keep connection alive
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break;
      }
    }
    if (lastErr || !response) {
      const rawMsg = lastErr?.message || 'Gemini API error';
      const isOverloaded = /503|unavailable|overloaded|high demand/i.test(rawMsg);
      const isQuota = /429|too many requests|resource exhausted|quota/i.test(rawMsg);
      const friendlyMsg = isOverloaded
        ? 'The AI model is temporarily overloaded. Please try again in a moment.'
        : isQuota
          ? 'API rate limit reached. Please wait a few seconds and try again.'
          : 'Something went wrong with the AI service. Please try again.';
      console.error('[geminiAgent] all retries failed:', rawMsg);
      write({ type: 'error', message: friendlyMsg, recoverable: true });
      break;
    }

    // Extract text
    const text = response.text;
    if (text) {
      fullAssistantText += text;
      write({ type: 'text', content: text });
    }

    // Extract function calls
    const functionCalls = response.functionCalls || [];
    if (functionCalls.length === 0) break;

    // Execute each function call
    const functionResponseParts: Part[] = [];

    for (const fc of functionCalls) {
      const toolName = fc.name || 'unknown';
      write({ type: 'tool_start', tool: toolName as AgentToolName, args: (fc.args || {}) as Record<string, unknown> });
      toolCallsMade.push(toolName);

      let toolResult: Record<string, unknown>;
      try {
        toolResult = await toolRegistry.execute(toolName, (fc.args as Record<string, unknown>) || {}, toolContext);
      } catch (err) {
        toolResult = { success: false, error: (err as Error).message };
        write({ type: 'error', message: (err as Error).message, recoverable: true });
      }

      write({ type: 'tool_result', tool: toolName as AgentToolName, result: toolResult });

      functionResponseParts.push({
        functionResponse: {
          name: toolName,
          response: toolResult as Record<string, unknown>,
        },
      } as Part);
    }

    // Send function responses in next iteration — pass Part[] directly as message
    nextSendArgs = { message: functionResponseParts };
  }

  return { assistantText: fullAssistantText, toolCallsMade };
}
