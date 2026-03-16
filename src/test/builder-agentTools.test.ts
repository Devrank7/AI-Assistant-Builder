// src/test/builder-agentTools.test.ts
import { describe, it, expect } from 'vitest';
import { GEMINI_TOOL_DECLARATIONS, getToolExecutor } from '@/lib/builder/agentTools';

describe('Agent Tools', () => {
  it('should have 11 tool declarations', () => {
    expect(GEMINI_TOOL_DECLARATIONS.length).toBe(11);
  });

  it('should have name and description on each tool', () => {
    for (const tool of GEMINI_TOOL_DECLARATIONS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
    }
  });

  it('should return executor for known tools', () => {
    expect(getToolExecutor('analyze_site')).toBeDefined();
    expect(getToolExecutor('build_deploy')).toBeDefined();
    expect(getToolExecutor('generate_design')).toBeDefined();
  });

  it('should return undefined for unknown tool', () => {
    expect(getToolExecutor('nonexistent' as never)).toBeUndefined();
  });
});
