import { IntegrationPlugin, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

const BASE_URL = 'https://api.hubapi.com';

async function hubspotFetch(path: string, apiKey: string, options?: RequestInit) {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...options?.headers,
    },
  });
}

export const hubspotPlugin: IntegrationPlugin = {
  manifest: manifest as unknown as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {},

  async testConnection(credentials): Promise<HealthResult> {
    try {
      const res = await hubspotFetch('/crm/v3/objects/contacts?limit=1', credentials.apiKey);
      if (!res.ok) {
        const status = res.status;
        if (status === 401)
          return {
            healthy: false,
            error: 'Invalid API Key',
            suggestion:
              'The API key is invalid or expired. Generate a new one at HubSpot Settings > Integrations > API Key.',
          };
        return { healthy: false, error: `HubSpot API error: ${status}` };
      }
      const data = await res.json();
      return { healthy: true, details: { contactCount: data.total || 0 } };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        suggestion: 'Check your network connection or HubSpot service status.',
      };
    }
  },

  async healthCheck(credentials) {
    return this.testConnection(credentials);
  },

  async execute(action, params, credentials): Promise<ExecutionResult> {
    const apiKey = credentials.apiKey;
    try {
      switch (action) {
        case 'createContact': {
          const res = await hubspotFetch('/crm/v3/objects/contacts', apiKey, {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                email: params.email,
                firstname: typeof params.name === 'string' ? params.name.split(' ')[0] : '',
                lastname: typeof params.name === 'string' ? params.name.split(' ').slice(1).join(' ') : '',
                phone: params.phone || '',
                company: params.company || '',
              },
            }),
          });
          if (!res.ok) return { success: false, error: `HubSpot error: ${res.status}`, retryable: res.status >= 500 };
          const data = await res.json();
          return { success: true, data: { id: data.id } };
        }
        case 'createDeal': {
          const res = await hubspotFetch('/crm/v3/objects/deals', apiKey, {
            method: 'POST',
            body: JSON.stringify({
              properties: {
                dealname: params.dealname,
                amount: params.amount || '',
                pipeline: params.pipeline || 'default',
              },
            }),
          });
          if (!res.ok) return { success: false, error: `HubSpot error: ${res.status}`, retryable: res.status >= 500 };
          const data = await res.json();
          return { success: true, data: { id: data.id } };
        }
        case 'searchContacts': {
          const res = await hubspotFetch('/crm/v3/objects/contacts/search', apiKey, {
            method: 'POST',
            body: JSON.stringify({
              filterGroups: [{ filters: [{ propertyName: 'email', operator: 'CONTAINS_TOKEN', value: params.query }] }],
              limit: 10,
            }),
          });
          if (!res.ok) return { success: false, error: `HubSpot error: ${res.status}` };
          const data = await res.json();
          return { success: true, data: { contacts: data.results, total: data.total } };
        }
        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Execution failed', retryable: true };
    }
  },

  describeCapabilities() {
    return 'HubSpot CRM: Create and search contacts, create deals in the sales pipeline.';
  },
};
