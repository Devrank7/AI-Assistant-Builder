import type { SSEEvent, AgentToolName } from './types';
import ChatLog from '../../models/ChatLog';

export interface ToolContext {
  sessionId: string;
  userId: string;
  baseUrl: string;
  cookie: string;
  write: (event: SSEEvent) => void;
  userPlan?: string;
  pendingFileText?: string;
  /** Set when widget is already built — blocks Phase 1 rebuild tools */
  clientId?: string;
}

/**
 * Tools that modify the widget and should trigger chat history clearing.
 * After these tools succeed, end-user chat logs are deleted so visitors
 * get a fresh experience with the updated widget.
 */
const WIDGET_MODIFYING_TOOLS = new Set([
  'modify_design',
  'modify_widget_code',
  'modify_config',
  'modify_structure',
  'modify_component',
  'add_component',
  'build_deploy',
  'rollback',
  'create_integration',
  'connect_integration',
  'attach_integration_to_widget',
  'enable_ai_actions',
]);

export type ToolResult = Record<string, unknown>;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string; enum?: string[]; items?: { type: string } }>;
    required: string[];
  };
  executor: (args: Record<string, unknown>, context: ToolContext) => Promise<ToolResult>;
  model_hint?: 'claude' | 'gemini';
  category: 'core' | 'integration' | 'proactive';
}

export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
  };
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getToolsForClaude(): AnthropicTool[] {
    return Array.from(this.tools.values()).map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    }));
  }

  async execute(name: string, args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Unknown tool: ${name}`);
    }
    const result = await tool.executor(args, ctx);

    // Clear end-user chat history after widget-modifying tools succeed
    if (WIDGET_MODIFYING_TOOLS.has(name) && ctx.clientId) {
      const clientId = (args.clientId as string) || ctx.clientId;
      try {
        const { deletedCount } = await ChatLog.deleteMany({ clientId });
        if (deletedCount > 0) {
          console.log(`[ToolRegistry] Cleared ${deletedCount} chat logs for ${clientId} after ${name}`);
        }
      } catch (err) {
        console.error(`[ToolRegistry] Failed to clear chat logs for ${clientId}:`, err);
      }
    }

    return result;
  }

  getToolsByCategory(category: ToolDefinition['category']): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.category === category);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}
