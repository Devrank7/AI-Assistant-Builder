// src/lib/builder/__tests__/toolsIndex.test.ts
import { describe, it, expect } from 'vitest';
import { createToolRegistry } from '../tools/index';

describe('createToolRegistry', () => {
  it('registers all 19 tools', () => {
    const registry = createToolRegistry();
    const tools = registry.getAll();
    expect(tools.length).toBe(19);
  });

  it('has 9 core, 6 integration, 4 proactive tools', () => {
    const registry = createToolRegistry();
    expect(registry.getToolsByCategory('core')).toHaveLength(9);
    expect(registry.getToolsByCategory('integration')).toHaveLength(6);
    expect(registry.getToolsByCategory('proactive')).toHaveLength(4);
  });

  it('generates Anthropic-format tools array', () => {
    const registry = createToolRegistry();
    const claudeTools = registry.getToolsForClaude();
    expect(claudeTools.length).toBe(19);
    for (const tool of claudeTools) {
      expect(tool).toHaveProperty('name');
      expect(tool).toHaveProperty('description');
      expect(tool).toHaveProperty('input_schema');
      expect(tool.input_schema).toHaveProperty('type', 'object');
    }
  });
});
