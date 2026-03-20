import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock mongoose before importing service
vi.mock('@/lib/mongodb', () => ({ default: vi.fn().mockResolvedValue(undefined) }));

const mockCreate = vi.fn();
const mockFindOneAndUpdate = vi.fn();
const mockFindOne = vi.fn();
const mockFind = vi.fn().mockReturnValue({ sort: vi.fn().mockResolvedValue([]) });

vi.mock('@/models/CoBrowsingSession', () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
    findOne: (...args: unknown[]) => mockFindOne(...args),
    find: (...args: unknown[]) => mockFind(...args),
  },
}));

import { createSession, addHighlight, endSession } from '@/lib/coBrowsingService';

describe('coBrowsingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createSession creates a session with correct fields', async () => {
    const mockSession = {
      sessionId: 'test-uuid',
      clientId: 'client1',
      visitorId: 'visitor1',
      agentUserId: 'agent1',
      status: 'active',
    };
    mockCreate.mockResolvedValue(mockSession);

    const result = await createSession('client1', 'visitor1', 'agent1');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client1',
        visitorId: 'visitor1',
        agentUserId: 'agent1',
        status: 'active',
      })
    );
    expect(result).toEqual(mockSession);
  });

  it('addHighlight adds a highlight to session', async () => {
    const updatedSession = {
      sessionId: 's1',
      highlights: [{ selector: '.btn', label: 'Click here', color: '#FF0000' }],
    };
    mockFindOneAndUpdate.mockResolvedValue(updatedSession);

    const result = await addHighlight('s1', '.btn', 'Click here', '#FF0000');
    expect(mockFindOneAndUpdate).toHaveBeenCalledTimes(1);
    expect(result).toBeTruthy();
    expect(result!.selector).toBe('.btn');
  });

  it('endSession sets status to ended', async () => {
    const ended = { sessionId: 's1', status: 'ended', endedAt: new Date() };
    mockFindOneAndUpdate.mockResolvedValue(ended);

    const result = await endSession('s1');
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { sessionId: 's1' },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'ended' }) }),
      { new: true }
    );
    expect(result?.status).toBe('ended');
  });
});
