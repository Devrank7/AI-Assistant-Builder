/**
 * Tests: WidgetIntegration Model + Widget Binding API
 *
 * 1. Lists bindings for a widget
 * 2. Creates a binding
 * 3. Rejects when integration not connected
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

// WidgetIntegration mock
const mockWIFind = vi.fn();
const mockWICreate = vi.fn();

vi.mock('@/models/WidgetIntegration', () => ({
  default: {
    find: (...args: unknown[]) => mockWIFind(...args),
    create: (...args: unknown[]) => mockWICreate(...args),
  },
}));

// Integration mock
const mockIntegrationFindOne = vi.fn();

vi.mock('@/models/Integration', () => ({
  default: {
    findOne: (...args: unknown[]) => ({ select: () => mockIntegrationFindOne(...args) }),
  },
}));

// Client mock
const mockClientFindOne = vi.fn();

vi.mock('@/models/Client', () => ({
  default: {
    findOne: (...args: unknown[]) => ({ select: () => mockClientFindOne(...args) }),
  },
}));

// Auth mock
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn().mockResolvedValue({
    authenticated: true,
    userId: 'user1',
    organizationId: 'org1',
    orgRole: 'owner',
    user: { email: 'test@test.com', plan: 'pro', subscriptionStatus: 'active' },
  }),
}));

// ---

describe('Widget Binding API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists bindings for a widget', async () => {
    // Widget ownership check passes
    mockClientFindOne.mockResolvedValue({ clientId: 'widget1' });

    // Return two bindings
    const bindings = [
      { _id: 'b1', widgetId: 'widget1', integrationSlug: 'hubspot', enabledActions: ['createContact'] },
      { _id: 'b2', widgetId: 'widget1', integrationSlug: 'calendly', enabledActions: ['getEventTypes'] },
    ];
    mockWIFind.mockResolvedValue(bindings);

    const { GET } = await import('@/app/api/integrations/widget-bindings/route');
    const request = new Request('http://localhost/api/integrations/widget-bindings?widgetId=widget1');
    (request as any).cookies = { get: () => ({ value: 'token' }) };

    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].integrationSlug).toBe('hubspot');
  });

  it('creates a binding when integration is connected', async () => {
    // Widget ownership check passes
    mockClientFindOne.mockResolvedValue({ clientId: 'widget1', organizationId: 'org1' });

    // Active integration connection found
    mockIntegrationFindOne.mockResolvedValue({ _id: 'conn1' });

    // New binding returned from create
    const newBinding = {
      _id: 'b3',
      userId: 'user1',
      organizationId: 'org1',
      widgetId: 'widget1',
      integrationSlug: 'hubspot',
      enabledActions: ['createContact'],
      triggerEvents: ['lead_captured'],
      config: {},
      enabled: true,
    };
    mockWICreate.mockResolvedValue(newBinding);

    const { POST } = await import('@/app/api/integrations/widget-bindings/route');
    const request = new Request('http://localhost/api/integrations/widget-bindings', {
      method: 'POST',
      body: JSON.stringify({
        widgetId: 'widget1',
        integrationSlug: 'hubspot',
        enabledActions: ['createContact'],
        triggerEvents: ['lead_captured'],
        config: {},
      }),
      headers: { 'content-type': 'application/json' },
    });
    (request as any).cookies = { get: () => ({ value: 'token' }) };

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.integrationSlug).toBe('hubspot');
    expect(data.data.enabledActions).toContain('createContact');
  });

  it('rejects creation when integration is not connected', async () => {
    // Widget ownership check passes
    mockClientFindOne.mockResolvedValue({ clientId: 'widget1', organizationId: 'org1' });

    // No active integration connection
    mockIntegrationFindOne.mockResolvedValue(null);

    const { POST } = await import('@/app/api/integrations/widget-bindings/route');
    const request = new Request('http://localhost/api/integrations/widget-bindings', {
      method: 'POST',
      body: JSON.stringify({
        widgetId: 'widget1',
        integrationSlug: 'salesforce',
        enabledActions: [],
      }),
      headers: { 'content-type': 'application/json' },
    });
    (request as any).cookies = { get: () => ({ value: 'token' }) };

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('salesforce');
  });
});
