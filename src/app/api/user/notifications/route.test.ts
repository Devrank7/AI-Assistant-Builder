// src/app/api/user/notifications/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyUser, mockConnectDB, mockNotifFind, mockNotifUpdateMany } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockNotifFind: vi.fn(),
  mockNotifUpdateMany: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/Notification', () => ({
  default: { find: mockNotifFind, updateMany: mockNotifUpdateMany },
}));

import { GET, PATCH } from './route';

describe('User Notifications API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectDB.mockResolvedValue(undefined);
    mockVerifyUser.mockResolvedValue({
      authenticated: true,
      userId: 'user1',
      organizationId: 'org1',
      orgRole: 'owner',
      user: { email: 'a@b.com', plan: 'pro', subscriptionStatus: 'active' },
    });
  });

  it('GET returns user notifications', async () => {
    mockNotifFind.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([
          {
            _id: 'n1',
            type: 'widget_deployed',
            title: 'Widget ready',
            message: 'Your widget is live',
            isRead: false,
          },
        ]),
      }),
    });

    const req = new NextRequest('http://localhost/api/user/notifications');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('PATCH marks notifications as read', async () => {
    mockNotifUpdateMany.mockResolvedValue({ modifiedCount: 3 });

    const req = new NextRequest('http://localhost/api/user/notifications', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    const res = await PATCH(req);
    const json = await res.json();

    expect(json.success).toBe(true);
  });
});
