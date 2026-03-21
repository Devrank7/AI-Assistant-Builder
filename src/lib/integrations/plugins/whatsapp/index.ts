import { IntegrationPlugin, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

const BASE_URL = 'https://gate.whapi.cloud';

async function whapiFetch(path: string, apiToken: string, options?: RequestInit) {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiToken}`,
      ...options?.headers,
    },
  });
}

export const whatsappPlugin: IntegrationPlugin = {
  manifest: manifest as unknown as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {
    // WHAPI token invalidation handled on their side.
    // Credentials deleted from our database by the caller.
  },

  async testConnection(credentials): Promise<HealthResult> {
    try {
      const res = await whapiFetch('/settings', credentials.apiKey);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403)
          return {
            healthy: false,
            error: 'Invalid WHAPI token',
            suggestion: 'Check your WHAPI API token at whapi.cloud dashboard.',
          };
        return { healthy: false, error: `WHAPI error: ${res.status}` };
      }
      const data = await res.json();
      return {
        healthy: true,
        details: {
          phone: data.phone || data.wid || 'connected',
        },
      };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        suggestion: 'Check your network connection or WHAPI service status.',
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
        case 'sendMessage': {
          // WHAPI expects phone number as chatId (with @c.us suffix for personal chats)
          const to = String(params.phone).replace(/[^0-9]/g, '');
          const chatId = to.includes('@') ? to : `${to}@s.whatsapp.net`;

          const res = await whapiFetch('/messages/text', apiToken, {
            method: 'POST',
            body: JSON.stringify({
              to: chatId,
              body: params.text,
            }),
          });
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            return {
              success: false,
              error: `WHAPI error ${res.status}: ${errBody.slice(0, 200)}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return {
            success: true,
            data: {
              messageId: data.message?.id || data.sent?.id,
              sent: true,
            },
          };
        }

        case 'sendTemplate': {
          const to = String(params.phone).replace(/[^0-9]/g, '');
          const chatId = to.includes('@') ? to : `${to}@s.whatsapp.net`;

          const res = await whapiFetch('/messages/template', apiToken, {
            method: 'POST',
            body: JSON.stringify({
              to: chatId,
              template: {
                name: params.templateName,
                language: { code: (params.language as string) || 'en' },
                components: params.parameters
                  ? [
                      {
                        type: 'body',
                        parameters: String(params.parameters)
                          .split(',')
                          .map((p) => ({ type: 'text', text: p.trim() })),
                      },
                    ]
                  : undefined,
              },
            }),
          });
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            return {
              success: false,
              error: `WHAPI error ${res.status}: ${errBody.slice(0, 200)}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return {
            success: true,
            data: { messageId: data.message?.id, sent: true },
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
    return 'WhatsApp (WHAPI): Send text messages and template messages to WhatsApp numbers.';
  },
};
