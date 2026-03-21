import { IntegrationPlugin, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

function telegramUrl(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`;
}

export const telegramPlugin: IntegrationPlugin = {
  manifest: manifest as unknown as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {
    // Webhook cleanup requires bot token, which is not passed to disconnect().
    // Credentials are deleted from our database by the caller.
  },

  async testConnection(credentials): Promise<HealthResult> {
    try {
      const res = await fetch(telegramUrl(credentials.apiKey, 'getMe'));
      if (!res.ok) {
        if (res.status === 401)
          return {
            healthy: false,
            error: 'Invalid bot token',
            suggestion: 'Create a new bot or get your token from @BotFather on Telegram.',
          };
        return { healthy: false, error: `Telegram API error: ${res.status}` };
      }
      const data = await res.json();
      if (!data.ok) return { healthy: false, error: data.description || 'Unknown error' };
      return {
        healthy: true,
        details: {
          botName: data.result?.first_name,
          botUsername: data.result?.username,
        },
      };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        suggestion: 'Check your network connection.',
      };
    }
  },

  async healthCheck(credentials) {
    return this.testConnection(credentials);
  },

  async execute(action, params, credentials): Promise<ExecutionResult> {
    const token = credentials.apiKey;
    try {
      switch (action) {
        case 'sendMessage': {
          const res = await fetch(telegramUrl(token, 'sendMessage'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: params.chatId,
              text: params.text,
              parse_mode: (params.parseMode as string) || 'HTML',
            }),
          });
          const data = await res.json();
          if (!data.ok)
            return {
              success: false,
              error: data.description || 'Failed to send message',
              retryable: res.status >= 500,
            };
          return {
            success: true,
            data: {
              messageId: data.result?.message_id,
              chatId: data.result?.chat?.id,
            },
          };
        }

        case 'sendPhoto': {
          const res = await fetch(telegramUrl(token, 'sendPhoto'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: params.chatId,
              photo: params.photoUrl,
              caption: params.caption || '',
            }),
          });
          const data = await res.json();
          if (!data.ok)
            return {
              success: false,
              error: data.description || 'Failed to send photo',
              retryable: res.status >= 500,
            };
          return {
            success: true,
            data: { messageId: data.result?.message_id },
          };
        }

        case 'getMe': {
          const res = await fetch(telegramUrl(token, 'getMe'));
          const data = await res.json();
          if (!data.ok) return { success: false, error: data.description || 'Failed' };
          return {
            success: true,
            data: {
              id: data.result?.id,
              firstName: data.result?.first_name,
              username: data.result?.username,
              isBot: data.result?.is_bot,
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
    return 'Telegram Bot: Send text messages and photos to Telegram chats, get bot info.';
  },
};
