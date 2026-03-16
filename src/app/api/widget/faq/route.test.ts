import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockConnectDB, mockKnowledgeFind } = vi.hoisted(() => ({
  mockConnectDB: vi.fn(),
  mockKnowledgeFind: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/KnowledgeChunk', () => ({
  default: { find: mockKnowledgeFind },
}));

import { GET } from './route';

describe('GET /api/widget/faq', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns 400 without clientId', async () => {
    const req = new NextRequest('http://localhost/api/widget/faq');
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it('returns FAQ items from knowledge chunks', async () => {
    mockKnowledgeFind.mockReturnValue({
      select: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { _id: '1', text: 'Q: What is X?\nA: X is a thing.', source: 'General' },
            { _id: '2', text: 'Q: How to Y?\nA: Do Y like this.', source: 'How-to' },
          ]),
        }),
      }),
    });

    const req = new NextRequest('http://localhost/api/widget/faq?clientId=test123');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(json.data[0].question).toBe('What is X?');
    expect(json.data[0].answer).toBe('X is a thing.');
  });
});
