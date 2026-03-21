import { CRMAdapter, CalendarAdapter, CalendarSlot, BookingRequest } from './types';
import { hubspotAdapter } from './hubspot';
import { googleCalendarPlugin } from './plugins/google-calendar';
import { calendlyPlugin } from './plugins/calendly';

const crmAdapters: Record<string, CRMAdapter> = {
  hubspot: hubspotAdapter,
  // Other adapters will be added as they're implemented:
  // salesforce: salesforceAdapter,
  // pipedrive: pipedriveAdapter,
  // zoho: zohoAdapter,
  // freshsales: freshsalesAdapter,
  // bitrix24: bitrix24Adapter,
  // monday: mondayAdapter,
};

/**
 * Wraps googleCalendarPlugin (IntegrationPlugin) to satisfy CalendarAdapter interface.
 * getAvailability → execute('checkAvailability') → maps busy blocks to CalendarSlot[]
 * createBooking   → execute('createEvent')        → returns { id, link }
 */
const googleCalendarAdapter: CalendarAdapter = {
  provider: 'google_calendar',

  async getAvailability(accessToken: string, startDate: string, endDate: string): Promise<CalendarSlot[]> {
    const result = await googleCalendarPlugin.execute(
      'checkAvailability',
      { timeMin: startDate, timeMax: endDate },
      { apiKey: accessToken }
    );
    if (!result.success || !result.data) return [];
    const busy = (result.data as { busy: { start: string; end: string }[] }).busy || [];
    return busy.map((b) => ({ start: b.start, end: b.end, available: false }));
  },

  async createBooking(accessToken: string, booking: BookingRequest): Promise<{ id: string; link?: string }> {
    const result = await googleCalendarPlugin.execute(
      'createEvent',
      {
        title: booking.title,
        start: booking.startTime,
        end: booking.endTime,
        attendees: [booking.attendeeEmail],
      },
      { apiKey: accessToken }
    );
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create Google Calendar event');
    }
    const data = result.data as { id: string; htmlLink?: string };
    return { id: data.id, link: data.htmlLink };
  },
};

/**
 * Wraps calendlyPlugin (IntegrationPlugin) to satisfy CalendarAdapter interface.
 * getAvailability → execute('getEventTypes') → returns event types as available slots
 * createBooking   → execute('createBooking') → returns { id }
 */
const calendlyAdapter: CalendarAdapter = {
  provider: 'calendly',

  async getAvailability(accessToken: string, _startDate: string, _endDate: string): Promise<CalendarSlot[]> {
    // Calendly doesn't expose a free/busy endpoint — return available event types as slots
    const result = await calendlyPlugin.execute('getEventTypes', {}, { apiKey: accessToken });
    if (!result.success || !result.data) return [];
    const eventTypes = Array.isArray(result.data) ? result.data : [result.data];
    return eventTypes.map((et: { id?: string; name?: string; url?: string }) => ({
      start: _startDate,
      end: _endDate,
      available: true,
      // Extra info surfaced through the slot fields
      ...(et.url ? { link: et.url } : {}),
    }));
  },

  async createBooking(_accessToken: string, booking: BookingRequest): Promise<{ id: string; link?: string }> {
    const result = await calendlyPlugin.execute(
      'createBooking',
      {
        email: booking.attendeeEmail,
        name: booking.attendeeName || booking.attendeeEmail,
      },
      { apiKey: _accessToken }
    );
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to create Calendly booking');
    }
    const data = result.data as { id?: string; uri?: string };
    return { id: data.id || data.uri || 'unknown' };
  },
};

const calendarAdapters: Record<string, CalendarAdapter> = {
  google_calendar: googleCalendarAdapter,
  calendly: calendlyAdapter,
};

export function getCRMAdapter(provider: string): CRMAdapter | null {
  return crmAdapters[provider] || null;
}

export function getCalendarAdapter(provider: string): CalendarAdapter | null {
  return calendarAdapters[provider] || null;
}

export function getSupportedCRMs(): string[] {
  return Object.keys(crmAdapters);
}

export function getSupportedCalendars(): string[] {
  return Object.keys(calendarAdapters);
}
