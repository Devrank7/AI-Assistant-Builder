import { IntegrationPlugin, PluginManifest, ExecutionResult } from './types';
import { decrypt, encrypt } from '@/lib/encryption';
import connectDB from '@/lib/mongodb';
import Integration from '@/models/Integration';
import WidgetIntegration from '@/models/WidgetIntegration';

// OAuth2 token refresh configs per provider
const OAUTH_REFRESH_CONFIGS: Record<string, { tokenUrl: string; clientIdEnv: string; clientSecretEnv: string }> = {
  google_calendar: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  },
  google_sheets: {
    tokenUrl: 'https://oauth2.googleapis.com/token',
    clientIdEnv: 'GOOGLE_CLIENT_ID',
    clientSecretEnv: 'GOOGLE_CLIENT_SECRET',
  },
  salesforce: {
    tokenUrl: 'https://login.salesforce.com/services/oauth2/token',
    clientIdEnv: 'SALESFORCE_CLIENT_ID',
    clientSecretEnv: 'SALESFORCE_CLIENT_SECRET',
  },
  hubspot: {
    tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
    clientIdEnv: 'HUBSPOT_CLIENT_ID',
    clientSecretEnv: 'HUBSPOT_CLIENT_SECRET',
  },
};

async function refreshOAuthToken(provider: string, refreshToken: string, connectionId: string): Promise<string | null> {
  const config = OAUTH_REFRESH_CONFIGS[provider];
  if (!config) return null;

  const clientId = process.env[config.clientIdEnv];
  const clientSecret = process.env[config.clientSecretEnv];
  if (!clientId || !clientSecret) return null;

  try {
    const res = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const newAccessToken = data.access_token;
    if (!newAccessToken) return null;

    // Update DB with new token
    await Integration.findByIdAndUpdate(connectionId, {
      accessToken: encrypt(newAccessToken),
      tokenExpiry: new Date(Date.now() + (data.expires_in || 3600) * 1000),
      ...(data.refresh_token ? { refreshToken: encrypt(data.refresh_token) } : {}),
      lastError: null,
    });

    return newAccessToken;
  } catch {
    return null;
  }
}

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

    let credentials: Record<string, string> = {};
    if (connection.accessToken) {
      credentials.apiKey = decrypt(connection.accessToken);
      credentials.accessToken = decrypt(connection.accessToken);
    }
    if (connection.refreshToken) credentials.refreshToken = decrypt(connection.refreshToken);

    // Auto-refresh expired OAuth tokens
    if (connection.tokenExpiry && connection.refreshToken) {
      const expiresAt = new Date(connection.tokenExpiry).getTime();
      const isExpired = expiresAt < Date.now() + 60_000; // refresh if <1 min left
      if (isExpired) {
        const decryptedRefresh = decrypt(connection.refreshToken);
        const newToken = await refreshOAuthToken(slug, decryptedRefresh, String(connection._id));
        if (newToken) {
          credentials.apiKey = newToken;
          credentials.accessToken = newToken;
        }
        // If refresh fails, try with existing token anyway — it might still work
      }
    }

    // Pull all provider-specific fields from metadata
    const meta = (connection.metadata || {}) as Record<string, unknown>;
    if (meta.instanceUrl) credentials.instanceUrl = String(meta.instanceUrl);
    if (meta.subdomain) credentials.subdomain = String(meta.subdomain);
    if (meta.accountId) credentials.accountId = String(meta.accountId);
    if (meta.calendarId) credentials.calendarId = String(meta.calendarId);
    if (meta.botToken) credentials.botToken = String(meta.botToken);
    if (meta.chatId) credentials.chatId = String(meta.chatId);
    // SMTP-specific fields
    if (meta.host) credentials.host = String(meta.host);
    if (meta.port) credentials.port = String(meta.port);
    if (meta.user) credentials.user = String(meta.user);
    if (meta.email) credentials.email = String(meta.email);

    // Execute with retry on 401 (token might have been refreshed by another request)
    const result = await plugin.execute(action, params, credentials);
    if (!result.success && result.error?.includes('401') && connection.refreshToken) {
      const decryptedRefresh = decrypt(connection.refreshToken);
      const newToken = await refreshOAuthToken(slug, decryptedRefresh, String(connection._id));
      if (newToken) {
        credentials = { ...credentials, apiKey: newToken, accessToken: newToken };
        return plugin.execute(action, params, credentials);
      }
    }
    return result;
  }
}

export const pluginRegistry = new PluginRegistry();
