import { CRMAdapter, CalendarAdapter } from './types';
import { hubspotAdapter } from './hubspot';

// NOTE: Full calendar plugin implementations (IntegrationPlugin interface) exist at:
//   src/lib/integrations/plugins/google-calendar/index.ts  → googleCalendarPlugin
//   src/lib/integrations/plugins/calendly/index.ts         → calendlyPlugin
//
// Those plugins use the generic IntegrationPlugin interface (execute/healthCheck/connect)
// which is different from the CalendarAdapter interface (getAvailability/createBooking)
// used by this registry.
//
// TODO: Either wrap the IntegrationPlugin implementations to satisfy CalendarAdapter,
// or migrate callers to use the PluginRegistry (src/lib/integrations/core/PluginRegistry.ts)
// which already supports these plugins natively.

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
  // google_calendar and calendly are implemented as IntegrationPlugins, not CalendarAdapters.
  // See NOTE above.
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
