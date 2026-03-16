import { describe, it, expect, vi } from 'vitest';
import { ToolRegistry, type ToolDefinition, type ToolContext } from '../toolRegistry';

const mockTool: ToolDefinition = {
  name: 'test_tool',
  description: 'A test tool',
  parameters: {
    type: 'object' as const,
    properties: { input: { type: 'string', description: 'test input' } },
    required: ['input'],
  },
  executor: async (args) => ({ echoed: args.input }),
  category: 'core',
};

describe('ToolRegistry', () => {
  it('registers and retrieves tools', () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    expect(registry.has('test_tool')).toBe(true);
    expect(registry.has('nonexistent')).toBe(false);
  });

  it('converts tools to Anthropic format', () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    const tools = registry.getToolsForClaude();
    expect(tools).toHaveLength(1);
    expect(tools[0]).toEqual({
      name: 'test_tool',
      description: 'A test tool',
      input_schema: {
        type: 'object',
        properties: { input: { type: 'string', description: 'test input' } },
        required: ['input'],
      },
    });
  });

  it('executes a tool', async () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    const ctx = { sessionId: 's1', userId: 'u1', baseUrl: 'http://localhost', cookie: '', write: vi.fn() };
    const result = await registry.execute('test_tool', { input: 'hello' }, ctx);
    expect(result).toEqual({ echoed: 'hello' });
  });

  it('throws on executing unknown tool', async () => {
    const registry = new ToolRegistry();
    const ctx = { sessionId: 's1', userId: 'u1', baseUrl: 'http://localhost', cookie: '', write: vi.fn() };
    await expect(registry.execute('unknown', {}, ctx)).rejects.toThrow('Unknown tool: unknown');
  });

  it('lists tools by category', () => {
    const registry = new ToolRegistry();
    registry.register(mockTool);
    registry.register({ ...mockTool, name: 'int_tool', category: 'integration' });
    expect(registry.getToolsByCategory('core')).toHaveLength(1);
    expect(registry.getToolsByCategory('integration')).toHaveLength(1);
  });
});
