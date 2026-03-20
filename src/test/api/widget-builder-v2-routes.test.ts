import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyUser: vi.fn(),
}));
vi.mock('@/lib/widgetBuilderV2', () => ({
  getComponents: vi.fn(),
  reorderComponents: vi.fn(),
  updateComponent: vi.fn(),
  exportToThemeJson: vi.fn(),
}));
vi.mock('@/models/WidgetComponent', () => ({
  default: {
    create: vi.fn(),
    findOne: vi.fn(),
    findByIdAndDelete: vi.fn(),
  },
}));

function createRequest(method: string, url: string, body?: unknown) {
  return new NextRequest(new URL(url, 'http://localhost:3000'), {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } } : {}),
  });
}

const mockAuth = {
  authenticated: true,
  userId: 'u1',
  organizationId: 'org1',
  orgRole: 'owner',
  user: { email: 'test@test.com' },
};
const mockUnauth = {
  authenticated: false,
  response: new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 401 }),
};

import { verifyUser } from '@/lib/auth';
import { getComponents, reorderComponents, updateComponent, exportToThemeJson } from '@/lib/widgetBuilderV2';
import WidgetComponent from '@/models/WidgetComponent';

const mockVerifyUser = vi.mocked(verifyUser);
const mockGetComponents = vi.mocked(getComponents);
const mockReorder = vi.mocked(reorderComponents);
const mockUpdateComponent = vi.mocked(updateComponent);
const mockExportTheme = vi.mocked(exportToThemeJson);

describe('GET /api/widget-builder-v2/[widgetId] (components)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/widget-builder-v2/[widgetId]/route');
    const res = await GET(createRequest('GET', '/api/widget-builder-v2/w1'), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns components list', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const components = [{ _id: 'c1', type: 'header', name: 'Header', order: 0 }];
    mockGetComponents.mockResolvedValue(components as never);

    const { GET } = await import('@/app/api/widget-builder-v2/[widgetId]/route');
    const res = await GET(createRequest('GET', '/api/widget-builder-v2/w1'), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(components);
    expect(mockGetComponents).toHaveBeenCalledWith('w1');
  });
});

describe('PUT /api/widget-builder-v2/[widgetId] (batch update)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { PUT } = await import('@/app/api/widget-builder-v2/[widgetId]/route');
    const res = await PUT(createRequest('PUT', '/api/widget-builder-v2/w1', { updates: [] }), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });
    expect(res.status).toBe(401);
  });

  it('batch updates components', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const updates = [
      { id: 'c1', props: { title: 'New' } },
      { id: 'c2', isVisible: false },
    ];
    mockUpdateComponent.mockResolvedValue({ _id: 'c1' } as never);

    const { PUT } = await import('@/app/api/widget-builder-v2/[widgetId]/route');
    const res = await PUT(createRequest('PUT', '/api/widget-builder-v2/w1', { updates }), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(mockUpdateComponent).toHaveBeenCalledTimes(2);
  });

  it('batch updates with reorder', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const updates = [{ id: 'c1', props: { title: 'New' } }];
    const orderMap = { c1: 1, c2: 0 };
    mockUpdateComponent.mockResolvedValue({} as never);
    mockReorder.mockResolvedValue(undefined as never);

    const { PUT } = await import('@/app/api/widget-builder-v2/[widgetId]/route');
    const res = await PUT(createRequest('PUT', '/api/widget-builder-v2/w1', { updates, orderMap }), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });

    expect(res.status).toBe(200);
    expect(mockReorder).toHaveBeenCalledWith('w1', orderMap);
  });

  it('reorders without updates', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const orderMap = { c1: 1, c2: 0 };
    mockReorder.mockResolvedValue(undefined as never);
    const reordered = [
      { _id: 'c2', order: 0 },
      { _id: 'c1', order: 1 },
    ];
    mockGetComponents.mockResolvedValue(reordered as never);

    const { PUT } = await import('@/app/api/widget-builder-v2/[widgetId]/route');
    const res = await PUT(createRequest('PUT', '/api/widget-builder-v2/w1', { orderMap }), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(reordered);
  });

  it('returns 400 when neither updates nor orderMap provided', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);

    const { PUT } = await import('@/app/api/widget-builder-v2/[widgetId]/route');
    const res = await PUT(createRequest('PUT', '/api/widget-builder-v2/w1', { foo: 'bar' }), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Provide updates array or orderMap');
  });
});

describe('POST /api/widget-builder-v2/[widgetId]/components', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { POST } = await import('@/app/api/widget-builder-v2/[widgetId]/components/route');
    const res = await POST(
      createRequest('POST', '/api/widget-builder-v2/w1/components', { type: 'header', name: 'Header' }),
      { params: Promise.resolve({ widgetId: 'w1' }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 400 when type or name missing', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const { POST } = await import('@/app/api/widget-builder-v2/[widgetId]/components/route');
    const res = await POST(createRequest('POST', '/api/widget-builder-v2/w1/components', { type: 'header' }), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('Missing required fields: type, name');
  });

  it('creates component with auto-incremented order', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(WidgetComponent.findOne).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue({ order: 2 }),
        }),
      }),
    } as never);
    const created = { _id: 'comp1', widgetId: 'w1', type: 'header', name: 'Header', order: 3 };
    vi.mocked(WidgetComponent.create).mockResolvedValue(created as never);

    const { POST } = await import('@/app/api/widget-builder-v2/[widgetId]/components/route');
    const res = await POST(
      createRequest('POST', '/api/widget-builder-v2/w1/components', { type: 'header', name: 'Header' }),
      { params: Promise.resolve({ widgetId: 'w1' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Component added');
  });

  it('starts order at 0 when no existing components', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(WidgetComponent.findOne).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(null),
        }),
      }),
    } as never);
    vi.mocked(WidgetComponent.create).mockResolvedValue({ _id: 'comp1', order: 0 } as never);

    const { POST } = await import('@/app/api/widget-builder-v2/[widgetId]/components/route');
    await POST(createRequest('POST', '/api/widget-builder-v2/w1/components', { type: 'chat', name: 'Chat' }), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });

    expect(vi.mocked(WidgetComponent.create)).toHaveBeenCalledWith(expect.objectContaining({ order: 0 }));
  });
});

describe('PATCH /api/widget-builder-v2/[widgetId]/components/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { PATCH } = await import('@/app/api/widget-builder-v2/[widgetId]/components/[id]/route');
    const res = await PATCH(
      createRequest('PATCH', '/api/widget-builder-v2/w1/components/c1', { props: { title: 'New' } }),
      { params: Promise.resolve({ widgetId: 'w1', id: 'c1' }) }
    );
    expect(res.status).toBe(401);
  });

  it('returns 404 when component not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    mockUpdateComponent.mockResolvedValue(null as never);

    const { PATCH } = await import('@/app/api/widget-builder-v2/[widgetId]/components/[id]/route');
    const res = await PATCH(createRequest('PATCH', '/api/widget-builder-v2/w1/components/c1', { props: {} }), {
      params: Promise.resolve({ widgetId: 'w1', id: 'c1' }),
    });
    expect(res.status).toBe(404);
  });

  it('updates component successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const updated = { _id: 'c1', props: { title: 'Updated' } };
    mockUpdateComponent.mockResolvedValue(updated as never);

    const { PATCH } = await import('@/app/api/widget-builder-v2/[widgetId]/components/[id]/route');
    const res = await PATCH(
      createRequest('PATCH', '/api/widget-builder-v2/w1/components/c1', { props: { title: 'Updated' } }),
      { params: Promise.resolve({ widgetId: 'w1', id: 'c1' }) }
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(updated);
  });
});

describe('DELETE /api/widget-builder-v2/[widgetId]/components/[id]', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { DELETE } = await import('@/app/api/widget-builder-v2/[widgetId]/components/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/widget-builder-v2/w1/components/c1'), {
      params: Promise.resolve({ widgetId: 'w1', id: 'c1' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 404 when component not found', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(WidgetComponent.findByIdAndDelete).mockResolvedValue(null as never);

    const { DELETE } = await import('@/app/api/widget-builder-v2/[widgetId]/components/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/widget-builder-v2/w1/components/c1'), {
      params: Promise.resolve({ widgetId: 'w1', id: 'c1' }),
    });
    expect(res.status).toBe(404);
  });

  it('deletes component successfully', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    vi.mocked(WidgetComponent.findByIdAndDelete).mockResolvedValue({ _id: 'c1' } as never);

    const { DELETE } = await import('@/app/api/widget-builder-v2/[widgetId]/components/[id]/route');
    const res = await DELETE(createRequest('DELETE', '/api/widget-builder-v2/w1/components/c1'), {
      params: Promise.resolve({ widgetId: 'w1', id: 'c1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.message).toBe('Component deleted');
  });
});

describe('GET /api/widget-builder-v2/[widgetId]/export', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 401 when unauthenticated', async () => {
    mockVerifyUser.mockResolvedValue(mockUnauth as never);
    const { GET } = await import('@/app/api/widget-builder-v2/[widgetId]/export/route');
    const res = await GET(createRequest('GET', '/api/widget-builder-v2/w1/export'), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });
    expect(res.status).toBe(401);
  });

  it('exports widget as theme JSON', async () => {
    mockVerifyUser.mockResolvedValue(mockAuth as never);
    const themeJson = { theme: 'dark', components: [], cssVariables: {} };
    mockExportTheme.mockResolvedValue(themeJson as never);

    const { GET } = await import('@/app/api/widget-builder-v2/[widgetId]/export/route');
    const res = await GET(createRequest('GET', '/api/widget-builder-v2/w1/export'), {
      params: Promise.resolve({ widgetId: 'w1' }),
    });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data).toEqual(themeJson);
    expect(mockExportTheme).toHaveBeenCalledWith('w1');
  });
});
