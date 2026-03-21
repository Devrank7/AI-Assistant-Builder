import { IntegrationPlugin, PluginManifest, HealthResult, ExecutionResult } from '../core/types';

export function createStubPlugin(manifest: PluginManifest): IntegrationPlugin {
  return {
    manifest,
    async connect(credentials) {
      const result = await this.testConnection(credentials);
      return result.healthy ? { success: true } : { success: false, error: result.error };
    },
    async disconnect() {},
    async testConnection(credentials): Promise<HealthResult> {
      const key = credentials.apiKey || credentials.token || Object.values(credentials)[0];
      if (!key) return { healthy: false, error: 'No credentials provided' };
      // Stub plugin — no real API validation implemented yet
      return { healthy: false, error: 'Plugin not fully configured — real connection test not yet implemented' };
    },
    async healthCheck(credentials) {
      return this.testConnection(credentials);
    },
    async execute(action): Promise<ExecutionResult> {
      return {
        success: false,
        error: `The "${manifest.name}" integration is not yet configured. To enable it, provide valid credentials for "${manifest.slug}" in your integration settings. Action requested: "${action}".`,
      };
    },
    describeCapabilities() {
      return `${manifest.name}: ${manifest.actions.map((a) => a.name).join(', ')}`;
    },
  };
}
