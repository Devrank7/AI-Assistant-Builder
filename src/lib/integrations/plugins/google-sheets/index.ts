import { IntegrationPlugin, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

const BASE_URL = 'https://sheets.googleapis.com/v4/spreadsheets';
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive.readonly'];

async function resolveAccessToken(apiKey: string): Promise<string> {
  const { isServiceAccountJSON, getAccessTokenFromServiceAccount } = await import('@/lib/googleServiceAccount');
  if (isServiceAccountJSON(apiKey)) {
    return getAccessTokenFromServiceAccount(apiKey, SCOPES);
  }
  return apiKey;
}

async function sheetsFetch(path: string, credentials: Record<string, string>, options?: RequestInit) {
  const accessToken = await resolveAccessToken(credentials.apiKey);
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });
}

export const googleSheetsPlugin: IntegrationPlugin = {
  manifest: manifest as unknown as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {
    // Credentials are deleted from our database by the caller.
  },

  async testConnection(credentials): Promise<HealthResult> {
    try {
      // Try to access the Sheets API with a simple drive files list
      const accessToken = await resolveAccessToken(credentials.apiKey);
      const res = await fetch(
        'https://www.googleapis.com/drive/v3/files?pageSize=1&q=mimeType%3D%27application/vnd.google-apps.spreadsheet%27',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) {
        if (res.status === 401)
          return {
            healthy: false,
            error: 'Invalid credentials',
            suggestion: 'Re-authenticate with Google or provide a valid service account key.',
          };
        return { healthy: false, error: `Google Sheets API error: ${res.status}` };
      }
      return { healthy: true, details: { connected: true } };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        suggestion: 'Check your network connection or Google API status.',
      };
    }
  },

  async healthCheck(credentials) {
    return this.testConnection(credentials);
  },

  async execute(action, params, credentials): Promise<ExecutionResult> {
    try {
      switch (action) {
        case 'appendRow': {
          const spreadsheetId = params.spreadsheetId as string;
          const range = params.range as string;
          const values = typeof params.values === 'string' ? JSON.parse(params.values) : params.values;

          if (!spreadsheetId || !range) {
            return { success: false, error: 'Missing spreadsheetId or range' };
          }

          const res = await sheetsFetch(
            `/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
            credentials,
            {
              method: 'POST',
              body: JSON.stringify({
                values: Array.isArray(values[0]) ? values : [values],
              }),
            }
          );
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            return {
              success: false,
              error: `Google Sheets error ${res.status}: ${errBody.slice(0, 200)}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return {
            success: true,
            data: {
              updatedRange: data.updates?.updatedRange,
              updatedRows: data.updates?.updatedRows,
            },
          };
        }

        case 'readRange': {
          const spreadsheetId = params.spreadsheetId as string;
          const range = params.range as string;

          if (!spreadsheetId || !range) {
            return { success: false, error: 'Missing spreadsheetId or range' };
          }

          const res = await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(range)}`, credentials);
          if (!res.ok) {
            return {
              success: false,
              error: `Google Sheets error: ${res.status}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return {
            success: true,
            data: {
              values: data.values || [],
              range: data.range,
              rows: (data.values || []).length,
            },
          };
        }

        case 'searchRows': {
          const spreadsheetId = params.spreadsheetId as string;
          const range = params.range as string;
          const query = String(params.query).toLowerCase();

          if (!spreadsheetId || !range) {
            return { success: false, error: 'Missing spreadsheetId or range' };
          }

          // Read all data then filter client-side
          const res = await sheetsFetch(`/${spreadsheetId}/values/${encodeURIComponent(range)}`, credentials);
          if (!res.ok) {
            return {
              success: false,
              error: `Google Sheets error: ${res.status}`,
            };
          }
          const data = await res.json();
          const allRows = data.values || [];
          const matching = allRows.filter((row: string[]) =>
            row.some((cell: string) => String(cell).toLowerCase().includes(query))
          );

          return {
            success: true,
            data: {
              rows: matching,
              matchCount: matching.length,
              totalRows: allRows.length,
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
    return 'Google Sheets: Append rows, read cell ranges, search rows in spreadsheets.';
  },
};
