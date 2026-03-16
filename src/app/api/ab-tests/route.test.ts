// src/app/api/ab-tests/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const { mockVerifyUser, mockConnectDB, mockABTestFind, mockABTestCreate } = vi.hoisted(() => ({
  mockVerifyUser: vi.fn(),
  mockConnectDB: vi.fn(),
  mockABTestFind: vi.fn(),
  mockABTestCreate: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ verifyUser: mockVerifyUser }));
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));
vi.mock('@/models/ABTest', () => ({
  default: { find: mockABTestFind, create: mockABTestCreate },
}));

import { GET, POST } from './route';

describe('A/B Tests API', () => {
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

  it('GET returns tests for organization', async () => {
    mockABTestFind.mockReturnValue({
      sort: vi.fn().mockResolvedValue([{ _id: 't1', name: 'Test 1', status: 'running', clientId: 'w1', variants: [] }]),
    });

    const req = new NextRequest('http://localhost/api/ab-tests');
    const res = await GET(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
  });

  it('POST creates a new test', async () => {
    mockABTestCreate.mockResolvedValue({
      _id: 't1',
      name: 'Greeting Test',
      clientId: 'w1',
      status: 'draft',
      variants: [
        { id: 'a', label: 'Variant A', config: { greeting: 'Hi!' }, visitors: 0, conversions: 0 },
        { id: 'b', label: 'Variant B', config: { greeting: 'Hello!' }, visitors: 0, conversions: 0 },
      ],
    });

    const req = new NextRequest('http://localhost/api/ab-tests', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Greeting Test',
        clientId: 'w1',
        variants: [
          { label: 'Variant A', config: { greeting: 'Hi!' } },
          { label: 'Variant B', config: { greeting: 'Hello!' } },
        ],
      }),
    });
    const res = await POST(req);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(mockABTestCreate).toHaveBeenCalled();
  });
});
