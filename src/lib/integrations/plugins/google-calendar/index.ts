import { IntegrationPlugin, HealthResult, ExecutionResult } from '../../core/types';
import manifest from './manifest.json';

const BASE_URL = 'https://www.googleapis.com/calendar/v3';

async function gcalFetch(path: string, accessToken: string, options?: RequestInit) {
  return fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...options?.headers,
    },
  });
}

export const googleCalendarPlugin: IntegrationPlugin = {
  manifest: manifest as unknown as IntegrationPlugin['manifest'],

  async connect(credentials) {
    const result = await this.testConnection(credentials);
    if (!result.healthy) return { success: false, error: result.error };
    return { success: true };
  },

  async disconnect() {},

  async testConnection(credentials): Promise<HealthResult> {
    try {
      const res = await gcalFetch('/calendars/primary', credentials.apiKey);
      if (!res.ok) {
        if (res.status === 401)
          return {
            healthy: false,
            error: 'Invalid OAuth2 token',
            suggestion: 'Re-authenticate with Google to get a fresh access token.',
          };
        return { healthy: false, error: `Google Calendar API error: ${res.status}` };
      }
      const data = await res.json();
      return {
        healthy: true,
        details: { calendarId: data.id, summary: data.summary },
      };
    } catch (err) {
      return {
        healthy: false,
        error: err instanceof Error ? err.message : 'Connection failed',
        suggestion: 'Check your network connection or Google Calendar service status.',
      };
    }
  },

  async healthCheck(credentials) {
    return this.testConnection(credentials);
  },

  async execute(action, params, credentials): Promise<ExecutionResult> {
    const accessToken = credentials.apiKey;
    try {
      switch (action) {
        case 'listEvents': {
          const timeMin = (params.timeMin as string) || new Date().toISOString();
          const timeMax = (params.timeMax as string) || new Date(Date.now() + 7 * 86400000).toISOString();
          const maxResults = params.maxResults || 10;
          const qs = new URLSearchParams({
            timeMin,
            timeMax,
            maxResults: String(maxResults),
            singleEvents: 'true',
            orderBy: 'startTime',
          });
          const res = await gcalFetch(`/calendars/primary/events?${qs.toString()}`, accessToken);
          if (!res.ok)
            return {
              success: false,
              error: `Google Calendar error: ${res.status}`,
              retryable: res.status >= 500,
            };
          const data = await res.json();
          return {
            success: true,
            data: {
              events: (data.items || []).map((e: Record<string, unknown>) => ({
                id: e.id,
                summary: e.summary,
                start: e.start,
                end: e.end,
                htmlLink: e.htmlLink,
              })),
              total: data.items?.length || 0,
            },
          };
        }

        case 'createEvent': {
          const res = await gcalFetch('/calendars/primary/events', accessToken, {
            method: 'POST',
            body: JSON.stringify({
              summary: params.title,
              description: params.description || '',
              start: {
                dateTime: params.start,
                timeZone: (params.timeZone as string) || 'UTC',
              },
              end: {
                dateTime: params.end,
                timeZone: (params.timeZone as string) || 'UTC',
              },
              attendees: params.attendees
                ? (params.attendees as string[]).map((email) => ({
                    email,
                  }))
                : undefined,
            }),
          });
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            return {
              success: false,
              error: `Google Calendar error ${res.status}: ${errBody.slice(0, 200)}`,
              retryable: res.status >= 500,
            };
          }
          const data = await res.json();
          return {
            success: true,
            data: {
              id: data.id,
              htmlLink: data.htmlLink,
              status: data.status,
            },
          };
        }

        case 'checkAvailability': {
          const timeMin = (params.timeMin as string) || new Date().toISOString();
          const timeMax = (params.timeMax as string) || new Date(Date.now() + 86400000).toISOString();
          const res = await gcalFetch('/freeBusy', accessToken, {
            method: 'POST',
            body: JSON.stringify({
              timeMin,
              timeMax,
              items: [{ id: 'primary' }],
            }),
          });
          if (!res.ok)
            return {
              success: false,
              error: `Google Calendar error: ${res.status}`,
            };
          const data = await res.json();
          const busy = data.calendars?.primary?.busy || [];
          return {
            success: true,
            data: {
              busy,
              busyCount: busy.length,
            },
          };
        }

        case 'getSlots': {
          // Get available slots by checking freeBusy
          const date = params.date as string;
          const duration = parseInt((params.duration as string) || '30', 10);
          const dayStart = new Date(`${date}T09:00:00Z`).toISOString();
          const dayEnd = new Date(`${date}T17:00:00Z`).toISOString();

          const res = await gcalFetch('/freeBusy', accessToken, {
            method: 'POST',
            body: JSON.stringify({
              timeMin: dayStart,
              timeMax: dayEnd,
              items: [{ id: 'primary' }],
            }),
          });
          if (!res.ok)
            return {
              success: false,
              error: `Google Calendar error: ${res.status}`,
            };
          const data = await res.json();
          const busy = (data.calendars?.primary?.busy || []) as { start: string; end: string }[];

          // Calculate available slots
          const slots: { start: string; end: string }[] = [];
          let current = new Date(dayStart);
          const end = new Date(dayEnd);

          while (current < end) {
            const slotEnd = new Date(current.getTime() + duration * 60000);
            if (slotEnd > end) break;

            const isBusy = busy.some((b) => new Date(b.start) < slotEnd && new Date(b.end) > current);

            if (!isBusy) {
              slots.push({
                start: current.toISOString(),
                end: slotEnd.toISOString(),
              });
            }
            current = slotEnd;
          }

          return { success: true, data: { slots, total: slots.length } };
        }

        case 'cancelEvent': {
          const res = await gcalFetch(`/calendars/primary/events/${params.eventId}`, accessToken, { method: 'DELETE' });
          if (!res.ok && res.status !== 204)
            return {
              success: false,
              error: `Google Calendar error: ${res.status}`,
            };
          return { success: true, data: { deleted: true } };
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
    return 'Google Calendar: List events, create events, check availability (freeBusy), get available time slots.';
  },
};
