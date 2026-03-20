import { IntegrationPlugin, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

const BASE_URL = 'https://api.pipedrive.com';

async function pipedriveFetch(path: string, apiToken: string, options?: RequestInit) {
  const separator = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${separator}api_token=${apiToken}`;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
}

export const pipedrivePlugin: IntegrationPlugin = {
  manifest: manifest as unknown as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {},

  async testConnection(credentials): Promise<HealthResult> {
    try {
      const res = await pipedriveFetch('/api/v1/users/me', credentials.apiKey);
      if (!res.ok) {
        if (res.status === 401)
          return {
            healthy: false,
            error: 'Invalid API token',
            suggestion: 'Generate a new API token in Pipedrive Settings > Personal preferences > API.',
          };
        return { healthy: false, error: `Pipedrive API error: ${res.status}` };
      }
      const data = await res.json();
      return {
        healthy: true,
        details: { userName: data.data?.name || 'Unknown' },
      };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        suggestion: 'Check your network connection or Pipedrive service status.',
      };
    }
  },

  async healthCheck(credentials) {
    return this.testConnection(credentials);
  },

  async execute(action, params, credentials): Promise<ExecutionResult> {
    const apiToken = credentials.apiKey;
    try {
      switch (action) {
        case 'createPerson': {
          const res = await pipedriveFetch('/api/v1/persons', apiToken, {
            method: 'POST',
            body: JSON.stringify({
              name: params.name,
              email: params.email ? [{ value: String(params.email), primary: true, label: 'work' }] : undefined,
              phone: params.phone ? [{ value: String(params.phone), primary: true, label: 'work' }] : undefined,
            }),
          });
          if (!res.ok) {
            return {
              success: false,
              error: `Pipedrive error: ${res.status}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return { success: true, data: { id: data.data?.id } };
        }

        case 'createDeal': {
          const res = await pipedriveFetch('/api/v1/deals', apiToken, {
            method: 'POST',
            body: JSON.stringify({
              title: params.title,
              value: params.value ? Number(params.value) : undefined,
              currency: (params.currency as string) || 'USD',
              person_id: params.personId ? Number(params.personId) : undefined,
            }),
          });
          if (!res.ok) {
            return {
              success: false,
              error: `Pipedrive error: ${res.status}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return { success: true, data: { id: data.data?.id } };
        }

        case 'searchPersons': {
          const res = await pipedriveFetch(
            `/api/v1/persons/search?term=${encodeURIComponent(String(params.query))}`,
            apiToken
          );
          if (!res.ok) {
            return { success: false, error: `Pipedrive error: ${res.status}` };
          }
          const data = await res.json();
          const persons = (data.data?.items || []).map((item: { item: Record<string, unknown> }) => item.item);
          return {
            success: true,
            data: { persons, total: persons.length },
          };
        }

        default:
          return { success: false, error: `Unknown action: ${action}` };
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Execution failed',
        retryable: true,
      };
    }
  },

  describeCapabilities() {
    return 'Pipedrive CRM: Create and search persons, create deals in the sales pipeline.';
  },
};
