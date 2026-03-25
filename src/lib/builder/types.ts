// src/lib/builder/types.ts

// --- Stage & Mode constants ---

export const BUILDER_STAGES = ['input', 'analysis', 'design', 'knowledge', 'customize', 'deploy'] as const;
export type BuilderStage = (typeof BUILDER_STAGES)[number];

export const PANEL_MODES = [
  'empty',
  'live_preview',
  'test_sandbox',
  'ab_compare',
  'crm_status',
  'integration_status',
] as const;
export type PanelMode = (typeof PANEL_MODES)[number];

export const AGENT_TOOL_NAMES = [
  // Core (13)
  'analyze_site',
  'generate_design',
  'modify_design',
  'select_theme',
  'build_deploy',
  'crawl_knowledge',
  'modify_widget_code',
  'modify_config',
  'modify_structure',
  'modify_component',
  'add_component',
  'rollback',
  'test_widget',
  // General-purpose (moved from integrationTools to coreTools)
  'web_search',
  'web_fetch',
  'guide_user',
  'open_connection_wizard',
  // Dynamic Integration (6 new tools)
  'research_api',
  'create_integration',
  'test_integration_config',
  'activate_integration',
  'deactivate_integration',
  'list_integrations',
  // No-URL builder
  'create_theme_from_scratch',
  'upload_knowledge_text',
  // Proactive (4)
  'analyze_opportunities',
  'suggest_improvements',
  'check_knowledge_gaps',
  'analyze_competitors',
] as const;
export type AgentToolName = (typeof AGENT_TOOL_NAMES)[number];

// --- Site Profile (enhanced) ---

export interface SiteProfile {
  url: string;
  businessName: string;
  businessType: string;
  colors: string[];
  backgroundColors?: string[];
  fonts: string[];
  favicon?: string;
  pages: { url: string; title: string; content: string; crawled?: boolean }[];
  contactInfo?: { phone?: string; email?: string; address?: string };
}

export interface SiteProfileV2 extends SiteProfile {
  totalPages: number;
  crawledPages: number;
  detectedFeatures: string[];
}

// --- Suggestion ---

export interface Suggestion {
  id: string;
  category: 'knowledge_gap' | 'integration' | 'design' | 'feature';
  title: string;
  description: string;
  actions: { label: string; action: string }[];
}

// --- Integration Entry ---

export interface IntegrationEntry {
  provider: string;
  status: 'suggested' | 'configuring' | 'connected' | 'failed';
  handlerPath?: string;
  apiKeyEncrypted?: string;
}

// --- Opportunity ---

export interface Opportunity {
  id: string;
  type: 'knowledge_gap' | 'integration' | 'design' | 'feature';
  description: string;
  status: 'pending' | 'accepted' | 'dismissed';
}

// --- Version Entry ---

export interface VersionEntry {
  number: number;
  description: string;
  timestamp: Date;
  scriptPath: string;
}

// --- Agent Types ---

export type AgentType = 'orchestrator' | 'design' | 'content' | 'knowledge' | 'integration' | 'qa' | 'deploy';

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
  | { type: 'suggestions'; suggestions: Suggestion[] }
  | { type: 'agent_switch'; agent: AgentType; task: string }
  | { type: 'open_connection_wizard'; slug: string }
  | { type: 'action_confirm'; tool: string; args: Record<string, unknown>; confirmId: string; description: string }
  | { type: 'action_confirmed'; tool: string; confirmId: string; result: Record<string, unknown> }
  | { type: 'action_rejected'; tool: string; confirmId: string }
  | { type: 'action_trace'; tool: string; status: 'success' | 'error'; durationMs: number; summary?: string }
  | { type: 'done' };

// --- CRM Setup (legacy, kept for backward compat) ---

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
