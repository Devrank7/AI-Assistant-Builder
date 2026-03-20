import { IntegrationPlugin, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

async function salesforceFetch(instanceUrl: string, path: string, accessToken: string, options?: RequestInit) {
  return fetch(`${instanceUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });
}

function parseInstanceUrl(credentials: Record<string, string>): string {
  // instanceUrl can be provided directly or we default to login.salesforce.com
  return credentials.instanceUrl || credentials.instance_url || 'https://login.salesforce.com';
}

export const salesforcePlugin: IntegrationPlugin = {
  manifest: manifest as unknown as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {},

  async testConnection(credentials): Promise<HealthResult> {
    try {
      const instanceUrl = parseInstanceUrl(credentials);
      const res = await salesforceFetch(instanceUrl, '/services/data/v59.0/sobjects', credentials.apiKey);
      if (!res.ok) {
        if (res.status === 401)
          return {
            healthy: false,
            error: 'Invalid access token',
            suggestion: 'The access token is invalid or expired. Re-authenticate with Salesforce.',
          };
        return { healthy: false, error: `Salesforce API error: ${res.status}` };
      }
      const data = await res.json();
      return {
        healthy: true,
        details: { objectCount: Array.isArray(data.sobjects) ? data.sobjects.length : 0 },
      };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        suggestion: 'Check your network connection or Salesforce service status.',
      };
    }
  },

  async healthCheck(credentials) {
    return this.testConnection(credentials);
  },

  async execute(action, params, credentials): Promise<ExecutionResult> {
    const accessToken = credentials.apiKey;
    const instanceUrl = parseInstanceUrl(credentials);
    try {
      switch (action) {
        case 'createContact': {
          const nameParts = typeof params.name === 'string' ? params.name.split(' ') : [''];
          const res = await salesforceFetch(instanceUrl, '/services/data/v59.0/sobjects/Contact', accessToken, {
            method: 'POST',
            body: JSON.stringify({
              Email: params.email,
              FirstName: nameParts[0] || '',
              LastName: nameParts.slice(1).join(' ') || '(not provided)',
              Phone: params.phone || undefined,
              Company: params.company || undefined,
            }),
          });
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            return {
              success: false,
              error: `Salesforce error ${res.status}: ${errBody.slice(0, 200)}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return { success: true, data: { id: data.id } };
        }

        case 'createOpportunity': {
          const res = await salesforceFetch(instanceUrl, '/services/data/v59.0/sobjects/Opportunity', accessToken, {
            method: 'POST',
            body: JSON.stringify({
              Name: params.name,
              Amount: params.amount ? Number(params.amount) : undefined,
              StageName: (params.stage as string) || 'Prospecting',
              CloseDate:
                (params.closeDate as string) || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            }),
          });
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            return {
              success: false,
              error: `Salesforce error ${res.status}: ${errBody.slice(0, 200)}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return { success: true, data: { id: data.id } };
        }

        case 'searchContacts': {
          const query = String(params.query || '').replace(/'/g, "\\'");
          const soql = `SELECT Id, FirstName, LastName, Email, Phone FROM Contact WHERE Name LIKE '%${query}%' OR Email LIKE '%${query}%' LIMIT 10`;
          const res = await salesforceFetch(
            instanceUrl,
            `/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
            accessToken
          );
          if (!res.ok) {
            return {
              success: false,
              error: `Salesforce error: ${res.status}`,
            };
          }
          const data = await res.json();
          return {
            success: true,
            data: {
              contacts: data.records || [],
              total: data.totalSize || 0,
            },
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
    return 'Salesforce CRM: Create contacts and opportunities, search contacts with SOQL queries.';
  },
};
