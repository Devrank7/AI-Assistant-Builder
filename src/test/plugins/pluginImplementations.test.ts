import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock global fetch for all tests
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('Plugin Implementations', () => {
  it('salesforcePlugin: execute createContact sends POST to /sobjects/Contact', async () => {
    const { salesforcePlugin } = await import('@/lib/integrations/plugins/salesforce');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'contact-sf-001' }),
    });

    const result = await salesforcePlugin.execute(
      'createContact',
      { email: 'test@acme.com', name: 'John Doe' },
      { apiKey: 'fake-token', instanceUrl: 'https://mycompany.salesforce.com' }
    );

    expect(result.success).toBe(true);
    expect((result.data as Record<string, string>).id).toBe('contact-sf-001');
    expect(mockFetch).toHaveBeenCalledOnce();
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('/services/data/v59.0/sobjects/Contact');
    expect(callUrl).toContain('mycompany.salesforce.com');
  });

  it('pipedrivePlugin: execute searchPersons sends GET with term query param', async () => {
    const { pipedrivePlugin } = await import('@/lib/integrations/plugins/pipedrive');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          items: [{ item: { id: 1, name: 'Jane Smith', email: 'jane@test.com' } }],
        },
      }),
    });

    const result = await pipedrivePlugin.execute('searchPersons', { query: 'Jane' }, { apiKey: 'pd-test-token' });

    expect(result.success).toBe(true);
    const data = result.data as { persons: Array<{ name: string }>; total: number };
    expect(data.persons).toHaveLength(1);
    expect(data.persons[0].name).toBe('Jane Smith');
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('/api/v1/persons/search');
    expect(callUrl).toContain('term=Jane');
    expect(callUrl).toContain('api_token=pd-test-token');
  });

  it('stripePlugin: execute createCustomer sends form-urlencoded POST to /v1/customers', async () => {
    const { stripePlugin } = await import('@/lib/integrations/plugins/stripe');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'cus_test123', email: 'customer@test.com' }),
    });

    const result = await stripePlugin.execute(
      'createCustomer',
      { email: 'customer@test.com', name: 'Test Customer' },
      { apiKey: 'sk_test_fake' }
    );

    expect(result.success).toBe(true);
    expect((result.data as Record<string, string>).id).toBe('cus_test123');
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('/v1/customers');
    const callOpts = mockFetch.mock.calls[0][1] as RequestInit;
    expect(callOpts.method).toBe('POST');
    expect((callOpts.headers as Record<string, string>)['Authorization']).toContain('Bearer sk_test_fake');
    expect((callOpts.headers as Record<string, string>)['Content-Type']).toBe('application/x-www-form-urlencoded');
  });

  it('telegramPlugin: execute sendMessage calls api.telegram.org with bot token', async () => {
    const { telegramPlugin } = await import('@/lib/integrations/plugins/telegram');

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        result: { message_id: 42, chat: { id: 12345 } },
      }),
    });

    const result = await telegramPlugin.execute(
      'sendMessage',
      { chatId: '12345', text: 'Hello from test' },
      { apiKey: '123:ABC' }
    );

    expect(result.success).toBe(true);
    expect((result.data as Record<string, number>).messageId).toBe(42);
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toBe('https://api.telegram.org/bot123:ABC/sendMessage');
  });

  it('all plugins have manifest, connect, execute, and describeCapabilities', async () => {
    const { salesforcePlugin } = await import('@/lib/integrations/plugins/salesforce');
    const { pipedrivePlugin } = await import('@/lib/integrations/plugins/pipedrive');
    const { stripePlugin } = await import('@/lib/integrations/plugins/stripe');
    const { telegramPlugin } = await import('@/lib/integrations/plugins/telegram');
    const { whatsappPlugin } = await import('@/lib/integrations/plugins/whatsapp');
    const { googleCalendarPlugin } = await import('@/lib/integrations/plugins/google-calendar');
    const { googleSheetsPlugin } = await import('@/lib/integrations/plugins/google-sheets');
    const { emailSmtpPlugin } = await import('@/lib/integrations/plugins/email-smtp');

    const plugins = [
      salesforcePlugin,
      pipedrivePlugin,
      stripePlugin,
      telegramPlugin,
      whatsappPlugin,
      googleCalendarPlugin,
      googleSheetsPlugin,
      emailSmtpPlugin,
    ];

    for (const plugin of plugins) {
      expect(plugin.manifest).toBeDefined();
      expect(plugin.manifest.slug).toBeTruthy();
      expect(typeof plugin.connect).toBe('function');
      expect(typeof plugin.execute).toBe('function');
      expect(typeof plugin.describeCapabilities).toBe('function');
      expect(plugin.describeCapabilities()).toBeTruthy();
    }
  });
});
