// src/lib/integrations/core/types.ts

export interface AuthField {
  key: string;
  label: string;
  type: 'password' | 'text';
  required: boolean;
  placeholder?: string;
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  inputSchema: Record<string, string>;
}

export interface PluginManifest {
  slug: string;
  name: string;
  category: 'crm' | 'calendar' | 'payment' | 'notification' | 'data';
  description: string;
  icon: string;
  color: string;
  authFields: AuthField[];
  actions: ActionDefinition[];
  healthEndpoint?: string;
  docsUrl?: string;
  status: 'active' | 'coming_soon' | 'deprecated';
}

export interface ConnectionResult {
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface HealthResult {
  healthy: boolean;
  error?: string;
  suggestion?: string;
  details?: Record<string, unknown>;
}

export interface ExecutionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  retryable?: boolean;
  suggestion?: string;
}

export interface IntegrationPlugin {
  manifest: PluginManifest;
  connect(credentials: Record<string, string>): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  testConnection(credentials: Record<string, string>): Promise<HealthResult>;
  healthCheck(credentials: Record<string, string>): Promise<HealthResult>;
  execute(
    action: string,
    params: Record<string, unknown>,
    credentials: Record<string, string>
  ): Promise<ExecutionResult>;
  describeCapabilities(): string;
}
