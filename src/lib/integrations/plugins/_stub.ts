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
      return { healthy: true, details: { note: 'Stub — real validation not yet implemented' } };
    },
    async healthCheck(credentials) {
      return this.testConnection(credentials);
    },
    async execute(action): Promise<ExecutionResult> {
      return { success: false, error: `Action "${action}" not yet implemented for ${manifest.name}` };
    },
    describeCapabilities() {
      return `${manifest.name}: ${manifest.actions.map((a) => a.name).join(', ')}`;
    },
  };
}
