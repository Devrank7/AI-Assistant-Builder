// src/app/api/admin/stats/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockUserAggregate,
  mockUserCountDocuments,
  mockClientCountDocuments,
  mockChatLogAggregate,
  mockUserFind,
  mockClientFind,
} = vi.hoisted(() => ({
  mockUserAggregate: vi.fn(),
  mockUserCountDocuments: vi.fn(),
  mockClientCountDocuments: vi.fn(),
  mockChatLogAggregate: vi.fn(),
  mockUserFind: vi.fn(),
  mockClientFind: vi.fn(),
}));

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/lib/auth', () => ({
  verifyAdmin: vi.fn().mockResolvedValue({ authenticated: true, role: 'admin' }),
}));

vi.mock('@/models/User', () => ({
  default: {
    aggregate: mockUserAggregate,
    countDocuments: mockUserCountDocuments,
    find: mockUserFind,
  },
}));
vi.mock('@/models/Client', () => ({
  default: {
    countDocuments: mockClientCountDocuments,
    find: mockClientFind,
  },
}));
vi.mock('@/models/ChatLog', () => ({
  default: { aggregate: mockChatLogAggregate },
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('GET /api/admin/stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserCountDocuments.mockResolvedValue(100);
    mockClientCountDocuments.mockResolvedValue(50);
    mockUserAggregate.mockResolvedValue([{ basic: 10, pro: 5 }]);
    mockChatLogAggregate.mockResolvedValue([{ count: 200 }]);
    const userChainable = {
      sort: vi.fn(),
      limit: vi.fn(),
      lean: vi.fn().mockResolvedValue([]),
    };
    userChainable.sort.mockReturnValue(userChainable);
    userChainable.limit.mockReturnValue(userChainable);
    mockUserFind.mockReturnValue(userChainable);

    const clientChainable = {
      sort: vi.fn(),
      limit: vi.fn(),
      lean: vi.fn().mockResolvedValue([]),
    };
    clientChainable.sort.mockReturnValue(clientChainable);
    clientChainable.limit.mockReturnValue(clientChainable);
    mockClientFind.mockReturnValue(clientChainable);
  });

  it('returns 200 with dashboard stats', async () => {
    const req = new NextRequest('http://localhost/api/admin/stats');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.kpi).toBeDefined();
    expect(body.data.kpi.totalUsers).toBe(100);
  });
});
