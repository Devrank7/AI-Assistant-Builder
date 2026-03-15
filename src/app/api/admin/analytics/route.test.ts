import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyAdmin, mockConnectDB, mockChatLogAggregate, mockUserAggregate } = vi.hoisted(() => ({
  mockVerifyAdmin: vi.fn(),
  mockConnectDB: vi.fn(),
  mockChatLogAggregate: vi.fn(),
  mockUserAggregate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyAdmin: mockVerifyAdmin }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/ChatLog', () => ({
  default: { aggregate: mockChatLogAggregate },
}));
vi.mock('@/models/User', () => ({
  default: { aggregate: mockUserAggregate },
}));

import { GET } from './route';

// The route calls ChatLog.aggregate 4 times and User.aggregate once.
// We use mockImplementation to return different values per call count.
function setupAggregates(
  messagesPerDay: unknown[],
  messagesByChannel: unknown[],
  topClients: unknown[],
  chatQuality: unknown[],
  userGrowth: unknown[]
) {
  let callCount = 0;
  mockChatLogAggregate.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return Promise.resolve(messagesPerDay);
    if (callCount === 2) return Promise.resolve(messagesByChannel);
    if (callCount === 3) return Promise.resolve(topClients);
    return Promise.resolve(chatQuality);
  });
  mockUserAggregate.mockResolvedValue(userGrowth);
}

describe('GET /api/admin/analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAdmin.mockResolvedValue({ authenticated: true });
    mockConnectDB.mockResolvedValue(undefined);
  });

  it('returns all chart data keys', async () => {
    setupAggregates([], [], [], [], []);

    const req = new NextRequest('http://localhost/api/admin/analytics');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveProperty('messagesPerDay');
    expect(json.data).toHaveProperty('messagesByChannel');
    expect(json.data).toHaveProperty('topClients');
    expect(json.data).toHaveProperty('userGrowth');
    expect(json.data).toHaveProperty('chatQuality');
  });

  it('returns populated chart data when aggregations have results', async () => {
    setupAggregates(
      [{ _id: '2026-03-01', count: 10 }],
      [{ _id: 'website', count: 50 }],
      [{ _id: 'client1', messageCount: 30 }],
      [{ avgMessages: 4.5, totalSessions: 20 }],
      [{ _id: '2026-03-01', count: 2 }]
    );

    const req = new NextRequest('http://localhost/api/admin/analytics?days=30');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.messagesPerDay).toHaveLength(1);
    expect(json.data.messagesPerDay[0]).toEqual({ date: '2026-03-01', count: 10 });
    expect(json.data.messagesByChannel[0]).toEqual({ channel: 'website', count: 50 });
    expect(json.data.topClients[0]).toEqual({ clientId: 'client1', messageCount: 30 });
    expect(json.data.userGrowth[0]).toEqual({ date: '2026-03-01', count: 2 });
    expect(json.data.chatQuality.avgConversationLength).toBe(5);
    expect(json.data.chatQuality.totalSessions).toBe(20);
  });

  it('returns zero chatQuality defaults when no sessions exist', async () => {
    setupAggregates([], [], [], [], []);

    const req = new NextRequest('http://localhost/api/admin/analytics');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data.chatQuality.avgConversationLength).toBe(0);
    expect(json.data.chatQuality.totalSessions).toBe(0);
  });
});
