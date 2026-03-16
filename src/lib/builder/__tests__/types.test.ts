import { describe, it, expect } from 'vitest';
import {
  BUILDER_STAGES,
  PANEL_MODES,
  AGENT_TOOL_NAMES,
  type BuilderStage,
  type PanelMode,
  type AgentToolName,
  type SSEEvent,
  type Suggestion,
  type SiteProfileV2,
  type IntegrationEntry,
  type Opportunity,
  type VersionEntry,
} from '../types';

describe('types', () => {
  it('includes new builder stages', () => {
    expect(BUILDER_STAGES).toContain('suggestions');
    expect(BUILDER_STAGES).toContain('workspace');
  });

  it('includes new panel modes', () => {
    expect(PANEL_MODES).toContain('integration_status');
  });

  it('includes all 19 agent tools', () => {
    const expected = [
      'analyze_site',
      'generate_design',
      'modify_design',
      'select_theme',
      'build_deploy',
      'crawl_knowledge',
      'modify_widget_code',
      'rollback',
      'test_widget',
      'web_search',
      'web_fetch',
      'search_api_docs',
      'write_integration',
      'test_integration',
      'guide_user',
      'analyze_opportunities',
      'suggest_improvements',
      'check_knowledge_gaps',
      'analyze_competitors',
    ];
    for (const tool of expected) {
      expect(AGENT_TOOL_NAMES).toContain(tool);
    }
  });

  it('SSEEvent union includes suggestions type', () => {
    const event: SSEEvent = {
      type: 'suggestions',
      suggestions: [{ id: '1', category: 'integration', title: 'Test', description: 'Desc', actions: [] }],
    };
    expect(event.type).toBe('suggestions');
  });
});
