// src/lib/builder/types.ts

// --- Stage & Mode constants ---

export const BUILDER_STAGES = ['input', 'analysis', 'design', 'knowledge', 'deploy', 'integrations'] as const;
export type BuilderStage = (typeof BUILDER_STAGES)[number];

export const PANEL_MODES = ['empty', 'live_preview', 'test_sandbox', 'ab_compare', 'crm_status'] as const;
export type PanelMode = (typeof PANEL_MODES)[number];

export const AGENT_TOOL_NAMES = [
  'analyze_site',
  'generate_themes',
  'select_theme',
  'build_widget',
  'crawl_knowledge',
  'connect_crm',
  'set_panel_mode',
  'read_widget_code',
  'modify_widget_code',
  'rollback_widget',
  'add_integration',
] as const;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

// --- Site Profile ---

export interface SiteProfile {
  url: string;
  businessName: string;
  businessType: string;
  colors: string[];
  fonts: string[];
  favicon?: string;
  pages: { url: string; title: string; content: string }[];
  contactInfo?: { phone?: string; email?: string; address?: string };
}

// --- SSE Event Types ---

export type SSEEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_start'; tool: AgentToolName; args: Record<string, unknown> }
  | { type: 'tool_result'; tool: AgentToolName; result: Record<string, unknown> }
  | { type: 'theme_update'; theme: Record<string, unknown> }
  | { type: 'ab_variants'; variants: { label: string; theme: Record<string, unknown> }[] }
  | { type: 'panel_mode'; mode: PanelMode }
  | { type: 'progress'; stage: BuilderStage; status: 'active' | 'complete' }
  | { type: 'progress'; message: string }
  | { type: 'widget_ready'; clientId: string }
  | { type: 'crm_instruction'; provider: string; steps: string[] }
  | { type: 'error'; message: string; recoverable: boolean }
  | { type: 'knowledge_progress'; uploaded: number; total: number }
  | { type: 'session'; sessionId: string }
  | { type: 'done' };

// --- CRM Setup ---

export interface CRMSetupConfig {
  provider: string;
  displayName: string;
  instructionSteps: string[];
  requiredScopes?: string[];
  validateKey: (apiKey: string) => Promise<{ valid: boolean; error?: string }>;
  createTestContact: (apiKey: string) => Promise<{ id: string }>;
}

// --- Industry Template ---

export interface IndustryTemplate {
  id: string;
  label: string;
  emoji: string;
  defaultColors: string[];
  defaultFont: string;
  sampleQuickReplies: string[];
  sampleKnowledge: string[];
  systemPromptHints: string;
}
