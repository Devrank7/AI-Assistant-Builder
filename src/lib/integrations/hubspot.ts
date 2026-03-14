import { CRMAdapter, CRMContact } from './types';

export const hubspotAdapter: CRMAdapter = {
  provider: 'hubspot',

  async createContact(contact: CRMContact, accessToken: string) {
    const res = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        properties: {
          email: contact.email,
          firstname: contact.name?.split(' ')[0] || '',
          lastname: contact.name?.split(' ').slice(1).join(' ') || '',
          phone: contact.phone || '',
          company: contact.company || '',
        },
      }),
    });
    if (!res.ok) throw new Error(`HubSpot error: ${res.status}`);
    const data = await res.json();
    return { id: data.id };
  },

  async getContacts(accessToken: string, limit = 10) {
    const res = await fetch(`https://api.hubapi.com/crm/v3/objects/contacts?limit=${limit}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new Error(`HubSpot error: ${res.status}`);
    const data = await res.json();
    return data.results.map((c: Record<string, unknown>) => ({
      id: c.id as string,
      email: (c.properties as Record<string, string>).email,
      name: `${(c.properties as Record<string, string>).firstname || ''} ${(c.properties as Record<string, string>).lastname || ''}`.trim(),
      phone: (c.properties as Record<string, string>).phone,
      company: (c.properties as Record<string, string>).company,
    }));
  },

  async refreshToken(refreshToken: string) {
    const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.HUBSPOT_CLIENT_ID!,
        client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
        refresh_token: refreshToken,
      }),
    });
    if (!res.ok) throw new Error('HubSpot token refresh failed');
    const data = await res.json();
    return { accessToken: data.access_token, refreshToken: data.refresh_token, expiresIn: data.expires_in };
  },
};
