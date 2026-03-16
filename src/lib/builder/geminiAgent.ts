// src/lib/builder/geminiAgent.ts
import { GoogleGenerativeAI, SchemaType, type Part, type Content } from '@google/generative-ai';
import type { ToolRegistry, ToolContext } from './toolRegistry';
import type { SSEEvent, AgentToolName } from './types';

const MAX_TOOL_LOOPS = 15;
const MODEL_ID = 'gemini-3.1-pro-preview';

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

/**
 * Map our ToolRegistry parameter types ("string", "number", etc.)
 * to Gemini's SchemaType enum (STRING, NUMBER, etc.)
 */
function mapSchemaType(type: string): SchemaType {
  switch (type.toLowerCase()) {
    case 'string':
      return SchemaType.STRING;
    case 'number':
      return SchemaType.NUMBER;
    case 'integer':
      return SchemaType.INTEGER;
    case 'boolean':
      return SchemaType.BOOLEAN;
    case 'array':
      return SchemaType.ARRAY;
    case 'object':
      return SchemaType.OBJECT;
    default:
      return SchemaType.STRING;
  }
}

export async function runAgentLoop(options: AgentRunOptions): Promise<{
  assistantText: string;
  toolCallsMade: string[];
}> {
  const { systemPrompt, toolRegistry, toolContext, write } = options;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  // Convert ToolRegistry to Gemini FunctionDeclarations
  const functionDeclarations = toolRegistry.getAll().map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: {
      type: SchemaType.OBJECT,
      properties: Object.fromEntries(
        Object.entries(tool.parameters.properties).map(([key, prop]) => [
          key,
          {
            type: mapSchemaType(prop.type),
            description: prop.description,
            ...(prop.enum ? { enum: prop.enum } : {}),
            ...(prop.items ? { items: { type: mapSchemaType(prop.items.type) } } : {}),
          },
        ])
      ),
      required: tool.parameters.required,
    },
  }));

  const model = genAI.getGenerativeModel({
    model: MODEL_ID,
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations }],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
  });

  // Build conversation history for Gemini (convert our messages to Gemini Content format)
  const history: Content[] = [];
  // Skip the last message — it will be sent as the new message via sendMessage()
  const allMessages = options.messages;
  const lastMessage = allMessages[allMessages.length - 1];
  const historyMessages = allMessages.slice(0, -1);

  for (const msg of historyMessages) {
    history.push({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    });
  }

  const chat = model.startChat({ history });

  let fullAssistantText = '';
  const toolCallsMade: string[] = [];
  let loopCount = 0;

  // Send the latest user message
  let currentParts: Part[] = [{ text: lastMessage.content }];

  while (loopCount < MAX_TOOL_LOOPS) {
    loopCount++;

    const result = await chat.sendMessage(currentParts);
    const response = result.response;
    const parts = response.candidates?.[0]?.content?.parts || [];

    // Collect text parts and function calls
    const functionCalls: { name: string; args: Record<string, unknown> }[] = [];

    for (const part of parts) {
      if (part.text) {
        fullAssistantText += part.text;
        write({ type: 'text', content: part.text });
      }
      if (part.functionCall) {
        functionCalls.push({
          name: part.functionCall.name,
          args: (part.functionCall.args as Record<string, unknown>) || {},
        });
      }
    }

    // If no function calls, we're done
    if (functionCalls.length === 0) break;

    // Execute each function call and build response parts
    const functionResponseParts: Part[] = [];

    for (const fc of functionCalls) {
      write({ type: 'tool_start', tool: fc.name as AgentToolName, args: fc.args });
      toolCallsMade.push(fc.name);

      let toolResult: Record<string, unknown>;
      try {
        toolResult = await toolRegistry.execute(fc.name, fc.args, toolContext);
      } catch (err) {
        toolResult = { success: false, error: (err as Error).message };
        write({ type: 'error', message: (err as Error).message, recoverable: true });
      }

      write({ type: 'tool_result', tool: fc.name as AgentToolName, result: toolResult });

      functionResponseParts.push({
        functionResponse: {
          name: fc.name,
          response: toolResult,
        },
      });
    }

    // Send function responses back to Gemini for next iteration
    currentParts = functionResponseParts;

    // Check finish reason
    const finishReason = response.candidates?.[0]?.finishReason;
    if (finishReason === 'STOP' && functionCalls.length === 0) break;
  }

  return { assistantText: fullAssistantText, toolCallsMade };
}
