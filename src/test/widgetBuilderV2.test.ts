import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockFind = vi.fn();
const mockInsertMany = vi.fn();
const mockFindByIdAndUpdate = vi.fn();
const mockBulkWrite = vi.fn();
const mockDeleteMany = vi.fn();

vi.mock('@/models/WidgetComponent', () => ({
  default: {
    find: (...args: unknown[]) => {
      const result = mockFind(...args);
      return {
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockResolvedValue(result),
        }),
      };
    },
    insertMany: (...args: unknown[]) => mockInsertMany(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
    bulkWrite: (...args: unknown[]) => mockBulkWrite(...args),
    deleteMany: (...args: unknown[]) => mockDeleteMany(...args),
  },
}));

describe('widgetBuilderV2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getComponents returns existing components', async () => {
    const mockComponents = [
      { _id: 'c1', type: 'header', name: 'Header', order: 0, isVisible: true },
      { _id: 'c2', type: 'chat_area', name: 'Chat Area', order: 1, isVisible: true },
    ];
    mockFind.mockReturnValue(mockComponents);

    const { getComponents } = await import('@/lib/widgetBuilderV2');
    const result = await getComponents('widget-1');

    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('header');
    expect(result[1].type).toBe('chat_area');
  });

  it('generateCSSVariables produces valid CSS', async () => {
    const { generateCSSVariables } = await import('@/lib/widgetBuilderV2');

    const components = [
      {
        _id: 'c1',
        type: 'header',
        name: 'Header',
        order: 0,
        isVisible: true,
        cssVariables: { '--header-bg': '#1a1a2e', '--header-text': '#ffffff' },
        props: {},
        widgetId: 'w1',
        clientId: 'w1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        _id: 'c2',
        type: 'chat_area',
        name: 'Chat',
        order: 1,
        isVisible: false,
        cssVariables: { '--chat-bg': '#0f0f1a' },
        props: {},
        widgetId: 'w1',
        clientId: 'w1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never[];

    const css = generateCSSVariables(components);
    expect(css).toContain(':host {');
    expect(css).toContain('--header-bg: #1a1a2e');
    expect(css).toContain('--header-text: #ffffff');
    // Hidden component should not be included
    expect(css).not.toContain('--chat-bg');
  });

  it('reorderComponents calls bulkWrite with correct order', async () => {
    mockBulkWrite.mockResolvedValue({});

    const { reorderComponents } = await import('@/lib/widgetBuilderV2');
    await reorderComponents('widget-1', { c1: 2, c2: 0, c3: 1 });

    expect(mockBulkWrite).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          updateOne: expect.objectContaining({
            filter: { _id: 'c1', widgetId: 'widget-1' },
            update: { $set: { order: 2 } },
          }),
        }),
      ])
    );
  });
});
