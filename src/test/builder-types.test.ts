// src/test/builder-types.test.ts
import { describe, it, expect } from 'vitest';
import type { SiteProfile, SSEEvent, BuilderStage, PanelMode, AgentToolName } from '@/lib/builder/types';
import { BUILDER_STAGES, PANEL_MODES, AGENT_TOOL_NAMES } from '@/lib/builder/types';

describe('Builder Types', () => {
  it('should export all builder stages', () => {
    expect(BUILDER_STAGES).toEqual([
      'input',
      'analysis',
      'design',
      'knowledge',
      'deploy',
      'integrations',
      'suggestions',
      'workspace',
    ]);
  });

  it('should export all panel modes', () => {
    expect(PANEL_MODES).toEqual([
      'empty',
      'live_preview',
      'test_sandbox',
      'ab_compare',
      'crm_status',
      'integration_status',
    ]);
  });

  it('should export all agent tool names', () => {
    expect(AGENT_TOOL_NAMES).toContain('analyze_site');
    expect(AGENT_TOOL_NAMES).toContain('generate_design');
    expect(AGENT_TOOL_NAMES).toContain('build_deploy');
    expect(AGENT_TOOL_NAMES).toContain('crawl_knowledge');
    expect(AGENT_TOOL_NAMES).toContain('guide_user');
    expect(AGENT_TOOL_NAMES).toContain('modify_widget_code');
    expect(AGENT_TOOL_NAMES).toContain('select_theme');
    expect(AGENT_TOOL_NAMES).toContain('rollback');
    expect(AGENT_TOOL_NAMES).toContain('research_api');
    expect(AGENT_TOOL_NAMES).toContain('create_integration');
    expect(AGENT_TOOL_NAMES).toContain('test_integration_config');
    expect(AGENT_TOOL_NAMES).toContain('activate_integration');
    expect(AGENT_TOOL_NAMES).toContain('deactivate_integration');
    expect(AGENT_TOOL_NAMES).toContain('list_integrations');
  });
});
