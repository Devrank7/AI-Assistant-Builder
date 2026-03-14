// src/lib/builder/crmSetup.ts
import type { CRMSetupConfig } from './types';

const crmConfigs: Record<string, CRMSetupConfig> = {
  hubspot: {
    provider: 'hubspot',
    displayName: 'HubSpot',
    instructionSteps: [
      'Go to your HubSpot account at app.hubspot.com',
      'Click Settings (gear icon) in the top navigation',
      'Navigate to Integrations → Private Apps',
      'Click "Create a private app"',
      'Name it "WinBix AI" and go to the Scopes tab',
      'Enable these scopes: crm.objects.contacts.read, crm.objects.contacts.write',
      'Click "Create app" and copy the access token',
      'Paste the access token here',
    ],
    requiredScopes: ['crm.objects.contacts.read', 'crm.objects.contacts.write'],
    async validateKey(apiKey: string) {
      try {
        const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        if (res.ok) return { valid: true };
        const data = await res.json();
        return { valid: false, error: data.message || 'Invalid API key' };
      } catch (err) {
        return { valid: false, error: (err as Error).message };
      }
    },
    async createTestContact(apiKey: string) {
      const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: {
            email: `test-${Date.now()}@winbixai.com`,
            firstname: 'WinBix',
            lastname: 'Test Contact',
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to create test contact');
      const data = await res.json();
      return { id: data.id };
    },
  },
};

export function getCRMSetup(provider: string): CRMSetupConfig | null {
  return crmConfigs[provider] || null;
}

export function getSupportedProviders(): string[] {
  return Object.keys(crmConfigs);
}
