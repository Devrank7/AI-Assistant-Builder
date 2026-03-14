// src/test/builder-types.test.ts
import { describe, it, expect } from 'vitest';
import type { SiteProfile, SSEEvent, BuilderStage, PanelMode, AgentToolName } from '@/lib/builder/types';
import { BUILDER_STAGES, PANEL_MODES, AGENT_TOOL_NAMES } from '@/lib/builder/types';

describe('Builder Types', () => {
  it('should export all builder stages', () => {
    expect(BUILDER_STAGES).toEqual(['input', 'analysis', 'design', 'knowledge', 'deploy', 'integrations']);
  });

  it('should export all panel modes', () => {
    expect(PANEL_MODES).toEqual(['empty', 'live_preview', 'test_sandbox', 'ab_compare', 'crm_status']);
  });

  it('should export all agent tool names', () => {
    expect(AGENT_TOOL_NAMES).toContain('analyze_site');
    expect(AGENT_TOOL_NAMES).toContain('generate_themes');
    expect(AGENT_TOOL_NAMES).toContain('build_widget');
    expect(AGENT_TOOL_NAMES).toContain('crawl_knowledge');
    expect(AGENT_TOOL_NAMES).toContain('connect_crm');
    expect(AGENT_TOOL_NAMES).toContain('set_panel_mode');
    expect(AGENT_TOOL_NAMES).toContain('select_theme');
    expect(AGENT_TOOL_NAMES.length).toBe(7);
  });
});
