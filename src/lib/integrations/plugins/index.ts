import { pluginRegistry } from '../core/PluginRegistry';
import { hubspotPlugin } from './hubspot';
import { salesforcePlugin } from './salesforce';
import { pipedrivePlugin } from './pipedrive';
import { googleCalendarPlugin } from './google-calendar';
import { calendlyPlugin } from './calendly';
import { stripePlugin } from './stripe';
import { telegramPlugin } from './telegram';
import { whatsappPlugin } from './whatsapp';
import { emailSmtpPlugin } from './email-smtp';
import { googleSheetsPlugin } from './google-sheets';

export function registerAllPlugins() {
  [
    hubspotPlugin,
    salesforcePlugin,
    pipedrivePlugin,
    googleCalendarPlugin,
    calendlyPlugin,
    stripePlugin,
    telegramPlugin,
    whatsappPlugin,
    emailSmtpPlugin,
    googleSheetsPlugin,
  ].forEach((plugin) => pluginRegistry.register(plugin));
}
