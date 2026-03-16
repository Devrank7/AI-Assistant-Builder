// src/lib/builder/anthropicAgent.ts
import Anthropic from '@anthropic-ai/sdk';
import type { ToolRegistry, ToolContext } from './toolRegistry';
import type { SSEEvent, AgentToolName } from './types';

const MAX_TOOL_LOOPS = 15;

interface AgentMessage {
  role: 'user' | 'assistant';
  content: string | Anthropic.ContentBlock[];
}

export interface AgentRunOptions {
  systemPrompt: string;
  messages: AgentMessage[];
  toolRegistry: ToolRegistry;
  toolContext: ToolContext;
  write: (event: SSEEvent) => void;
}

export async function runAgentLoop(options: AgentRunOptions): Promise<{
  assistantText: string;
  toolCallsMade: string[];
}> {
  const { systemPrompt, toolRegistry, toolContext, write } = options;
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const tools = toolRegistry.getToolsForClaude();
  const messages: Anthropic.MessageParam[] = options.messages.map((m) => ({
    role: m.role,
    content: m.content as string,
  }));

  let fullAssistantText = '';
  const toolCallsMade: string[] = [];
  let loopCount = 0;

  while (loopCount < MAX_TOOL_LOOPS) {
    loopCount++;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      tools: tools as Anthropic.Tool[],
      messages,
    });

    // Collect text and tool_use blocks
    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];

    for (const block of response.content) {
      if (block.type === 'text') {
        fullAssistantText += block.text;
        write({ type: 'text', content: block.text });
      } else if (block.type === 'tool_use') {
        toolUseBlocks.push(block);
      }
    }

    // If no tool calls, we're done
    if (toolUseBlocks.length === 0) break;

    // Add assistant message with all content blocks
    messages.push({ role: 'assistant', content: response.content });

    // Execute each tool call and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const toolBlock of toolUseBlocks) {
      const toolName = toolBlock.name;
      const toolArgs = toolBlock.input as Record<string, unknown>;

      write({ type: 'tool_start', tool: toolName as AgentToolName, args: toolArgs });
      toolCallsMade.push(toolName);

      let result: Record<string, unknown>;
      try {
        result = await toolRegistry.execute(toolName, toolArgs, toolContext);
      } catch (err) {
        result = { success: false, error: (err as Error).message };
        write({ type: 'error', message: (err as Error).message, recoverable: true });
      }

      write({ type: 'tool_result', tool: toolName as AgentToolName, result });

      toolResults.push({
        type: 'tool_result',
        tool_use_id: toolBlock.id,
        content: JSON.stringify(result),
      });
    }

    // Add all tool results as a single user message
    messages.push({ role: 'user', content: toolResults });

    // Check stop reason
    if (response.stop_reason === 'end_turn') break;
  }

  return { assistantText: fullAssistantText, toolCallsMade };
}
