import { CRMAdapter, CalendarAdapter } from './types';
import { hubspotAdapter } from './hubspot';

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

const calendarAdapters: Record<string, CalendarAdapter> = {
  // google_calendar: googleCalendarAdapter,
  // calendly: calendlyAdapter,
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
