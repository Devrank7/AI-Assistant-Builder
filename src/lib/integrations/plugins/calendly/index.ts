import { IntegrationPlugin, ConnectionResult, HealthResult, ExecutionResult } from '../../core/types';
import manifestJson from './manifest.json';
import type { PluginManifest } from '../../core/types';

const manifest = manifestJson as unknown as PluginManifest;

// Auto-generated from integration.config.json — DO NOT EDIT MANUALLY
// To update: modify integration.config.json and re-run generate-integration.js

const config = {
  provider: 'calendly',
  name: 'Calendly',
  category: 'calendar',
  color: '#006BFF',
  baseUrl: 'https://api.calendly.com',
  auth: {
    type: 'bearer',
    header: 'Authorization',
    prefix: 'Bearer',
    fields: [
      {
        key: 'apiKey',
        label: 'Personal Access Token',
        type: 'password',
        required: true,
        placeholder: 'eyJhbG...',
      },
    ],
  },
  actions: [
    {
      id: 'getEventTypes',
      name: 'Get Event Types',
      description: 'List available appointment types',
      method: 'GET',
      path: '/event_types',
      queryParams: {
        user: '{{auth.userUri}}',
      },
      responseMapping: {
        root: 'collection',
        fields: {
          id: 'uri',
          name: 'name',
          duration: 'duration',
          url: 'scheduling_url',
        },
      },
    },
    {
      id: 'createBooking',
      name: 'Book Appointment',
      description: 'Schedule an appointment for a customer',
      method: 'POST',
      path: '/scheduled_events',
      body: {
        event_type: '{{params.eventTypeId}}',
        invitee: {
          email: '{{params.email}}',
          name: '{{params.name}}',
        },
      },
      responseMapping: {
        root: 'resource',
        fields: {
          id: 'uri',
          status: 'status',
          startTime: 'start_time',
        },
      },
    },
  ],
  healthCheck: {
    method: 'GET',
    path: '/users/me',
    successField: 'resource.uri',
  },
} as const;

function resolveTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{(\w+\.\w+)\}\}/g, (_, p) => {
    const [scope, key] = p.split('.');
    return context[scope]?.[key] ?? '';
  });
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function buildHeaders(credentials: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authType = config.auth.type;
  const credKey = config.auth.fields[0].key;

  if (authType === 'bearer') {
    headers[config.auth.header || 'Authorization'] = `${config.auth.prefix || 'Bearer'} ${credentials[credKey]}`;
  } else if (authType === 'api-key-header') {
    headers[config.auth.header || 'X-API-Key'] = credentials[credKey];
  } else if (authType === 'basic') {
    const user = credentials.username || '';
    const pass = credentials.password || credentials[credKey] || '';
    headers['Authorization'] = 'Basic ' + Buffer.from(user + ':' + pass).toString('base64');
  }
  return headers;
}

// Named export — matches existing convention (calendlyPlugin, hubspotPlugin, etc.)
export const calendlyPlugin: IntegrationPlugin = {
  manifest,

  async connect(credentials: Record<string, string>): Promise<ConnectionResult> {
    const health = await this.healthCheck(credentials);
    return { success: health.healthy, error: health.error, metadata: {} };
  },

  async disconnect(): Promise<void> {},

  async testConnection(credentials: Record<string, string>): Promise<HealthResult> {
    return this.healthCheck(credentials);
  },

  async healthCheck(credentials: Record<string, string>): Promise<HealthResult> {
    try {
      const hcPath = resolveTemplate(config.healthCheck.path, { auth: credentials, params: {} });
      const url = config.baseUrl + hcPath;
      const headers = buildHeaders(credentials);
      const res = await fetch(url, { method: config.healthCheck.method, headers });
      if (!res.ok) return { healthy: false, error: `HTTP ${res.status}` };
      const data = await res.json();
      return { healthy: !!getNestedValue(data, config.healthCheck.successField) };
    } catch (err) {
      return { healthy: false, error: (err as Error).message };
    }
  },

  async execute(
    action: string,
    params: Record<string, unknown>,
    credentials: Record<string, string>
  ): Promise<ExecutionResult> {
    const actionDef = config.actions.find((a) => a.id === action);
    if (!actionDef) return { success: false, error: `Unknown action: ${action}` };

    try {
      const context = { params, auth: credentials };
      let url = config.baseUrl + resolveTemplate(actionDef.path, context);
      const headers = buildHeaders(credentials);
      const fetchOpts: RequestInit = { method: actionDef.method, headers };

      if ((actionDef as any).body && ['POST', 'PUT', 'PATCH'].includes(actionDef.method)) {
        fetchOpts.body = JSON.stringify(JSON.parse(resolveTemplate(JSON.stringify((actionDef as any).body), context)));
      }
      if ((actionDef as any).queryParams) {
        const qp = new URLSearchParams();
        for (const [k, v] of Object.entries((actionDef as any).queryParams)) {
          qp.set(k, resolveTemplate(v as string, context));
        }
        url += '?' + qp.toString();
      }

      const res = await fetch(url, fetchOpts);
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return {
          success: false,
          error: `${action} failed: HTTP ${res.status} — ${errText.slice(0, 200)}`,
          retryable: res.status >= 500,
        };
      }

      const data = await res.json();
      const mapping = (actionDef as any).responseMapping;
      const root = mapping?.root ? getNestedValue(data, mapping.root) : data;

      if (mapping?.fields && root) {
        const mapItem = (item: any) => {
          const mapped: Record<string, any> = {};
          for (const [ourKey, apiKey] of Object.entries(mapping.fields)) {
            mapped[ourKey] = getNestedValue(item, apiKey as string);
          }
          return mapped;
        };
        return { success: true, data: Array.isArray(root) ? root.map(mapItem) : mapItem(root) };
      }
      return { success: true, data: root || data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  },

  describeCapabilities(): string {
    return config.actions
      .map((a: { id: string; name: string; description?: string }) => `${a.id}: ${a.description || a.name}`)
      .join('; ');
  },
};

// No default export — barrel file uses named import: import { calendlyPlugin } from './calendly';
