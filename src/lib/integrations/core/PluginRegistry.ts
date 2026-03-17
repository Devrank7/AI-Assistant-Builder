import { IntegrationPlugin, PluginManifest, ExecutionResult } from './types';
import { decrypt } from '@/lib/encryption';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';
import WidgetIntegration from '@/models/WidgetIntegration';

class PluginRegistry {
  private plugins: Map<string, IntegrationPlugin> = new Map();
  private loaded = false;

  private ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    const { registerAllPlugins } = require('@/lib/integrations/plugins');
    registerAllPlugins();
  }

  register(plugin: IntegrationPlugin): void {
    this.plugins.set(plugin.manifest.slug, plugin);
  }

  get(slug: string): IntegrationPlugin | null {
    this.ensureLoaded();
    return this.plugins.get(slug) || null;
  }

  getAllManifests(): PluginManifest[] {
    this.ensureLoaded();
    return Array.from(this.plugins.values()).map((p) => p.manifest);
  }

  async getConnectedManifests(userId: string): Promise<(PluginManifest & { connectionId: string; status: string })[]> {
    await connectDB();
    const connections = await Integration.find({ userId, status: { $ne: 'disconnected' } })
      .select('provider status')
      .lean();

    return connections
      .map((conn: { _id: unknown; provider: string; status: string }) => {
        const plugin = this.plugins.get(conn.provider);
        if (!plugin) return null;
        return {
          ...plugin.manifest,
          connectionId: String(conn._id),
          status: conn.status,
        };
      })
      .filter(Boolean) as (PluginManifest & { connectionId: string; status: string })[];
  }

  async executeAction(
    slug: string,
    action: string,
    params: Record<string, unknown>,
    userId: string,
    widgetId: string
  ): Promise<ExecutionResult> {
    const plugin = this.get(slug);
    if (!plugin) return { success: false, error: `Plugin "${slug}" not found` };

    await connectDB();
    const binding = await WidgetIntegration.findOne({
      userId,
      widgetId,
      integrationSlug: slug,
      enabled: true,
    }).lean();

    if (!binding) {
      return { success: false, error: `Integration "${slug}" not enabled for widget "${widgetId}"` };
    }

    if (!binding.enabledActions?.includes(action)) {
      return { success: false, error: `Action "${action}" not enabled for this widget` };
    }

    const connection = await Integration.findOne({
      userId,
      provider: slug,
      status: 'connected',
    }).lean();

    if (!connection) {
      return { success: false, error: `No active connection for "${slug}"` };
    }

    const credentials: Record<string, string> = {};
    if (connection.accessToken) credentials.apiKey = decrypt(connection.accessToken);

    return plugin.execute(action, params, credentials);
  }
}

export const pluginRegistry = new PluginRegistry();
