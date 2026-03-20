import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));

const mockFind = vi.fn();
const mockCreate = vi.fn();
const mockCountDocuments = vi.fn();
const mockFindById = vi.fn();
const mockFindByIdAndUpdate = vi.fn();

vi.mock('@/models/AgentStoreItem', () => ({
  default: {
    find: (...args: unknown[]) => {
      const result = mockFind(...args);
      return {
        sort: vi.fn().mockReturnValue({
          skip: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(result),
          }),
        }),
      };
    },
    create: (...args: unknown[]) => mockCreate(...args),
    countDocuments: (...args: unknown[]) => mockCountDocuments(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findByIdAndUpdate: (...args: unknown[]) => mockFindByIdAndUpdate(...args),
  },
}));

describe('agentStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('listAgents returns paginated results', async () => {
    const mockAgents = [
      { _id: 'a1', name: 'Sales Bot', niche: 'dental', status: 'approved', installs: 50 },
      { _id: 'a2', name: 'Support Bot', niche: 'saas', status: 'approved', installs: 30 },
    ];
    mockFind.mockReturnValue(mockAgents);
    mockCountDocuments.mockResolvedValue(2);

    const { listAgents } = await import('@/lib/agentStoreService');
    const result = await listAgents({ page: 1, limit: 20 });

    expect(result).toHaveProperty('items');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('totalPages');
    expect(result.total).toBe(2);
  });

  it('submitAgent creates an agent in pending status', async () => {
    const mockAgent = {
      _id: 'agent-1',
      authorId: 'author-1',
      name: 'Dental Assistant',
      status: 'pending',
      installs: 0,
    };
    mockCreate.mockResolvedValue(mockAgent);

    const { submitAgent } = await import('@/lib/agentStoreService');
    const result = await submitAgent('author-1', {
      name: 'Dental Assistant',
      description: 'AI dental receptionist',
      niche: 'dental',
      category: 'booking',
      systemPrompt: 'You are a dental receptionist...',
    });

    expect(result.status).toBe('pending');
    expect(result.authorId).toBe('author-1');
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: 'author-1',
        status: 'pending',
      })
    );
  });

  it('installAgent increments install count', async () => {
    const mockUpdated = { _id: 'agent-1', name: 'Bot', installs: 51 };
    mockFindByIdAndUpdate.mockResolvedValue(mockUpdated);

    const { installAgent } = await import('@/lib/agentStoreService');
    const result = await installAgent('agent-1');

    expect(result).toBeTruthy();
    expect(result!.installs).toBe(51);
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith('agent-1', { $inc: { installs: 1 } }, { new: true });
  });
});
