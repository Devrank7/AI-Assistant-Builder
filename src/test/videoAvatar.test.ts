import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn().mockResolvedValue(undefined) }));

const mockCreate = vi.fn();
const mockFind = vi.fn().mockReturnValue({ sort: vi.fn().mockResolvedValue([]) });
const mockFindById = vi.fn();
const mockFindByIdAndDelete = vi.fn();

vi.mock('@/models/VideoAvatar', () => ({
  default: {
    create: (...args: unknown[]) => mockCreate(...args),
    find: (...args: unknown[]) => mockFind(...args),
    findById: (...args: unknown[]) => mockFindById(...args),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: (...args: unknown[]) => mockFindByIdAndDelete(...args),
  },
}));

import { createAvatar, listAvatars, deleteAvatar } from '@/lib/videoAvatarService';

describe('videoAvatarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('createAvatar creates with provider and style', async () => {
    const mockAvatar = {
      _id: 'a1',
      clientId: 'c1',
      name: 'Test Avatar',
      provider: 'heygen',
      style: 'professional',
      gender: 'neutral',
    };
    mockCreate.mockResolvedValue(mockAvatar);

    const result = await createAvatar('c1', {
      name: 'Test Avatar',
      provider: 'heygen',
      style: 'professional',
      gender: 'neutral',
    });
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'c1',
        name: 'Test Avatar',
        provider: 'heygen',
      })
    );
    expect(result.name).toBe('Test Avatar');
  });

  it('listAvatars returns avatars for clientId', async () => {
    const avatars = [{ _id: 'a1', name: 'Avatar 1' }];
    mockFind.mockReturnValue({ sort: vi.fn().mockResolvedValue(avatars) });

    const result = await listAvatars('c1');
    expect(mockFind).toHaveBeenCalledWith({ clientId: 'c1' });
    expect(result).toHaveLength(1);
  });

  it('deleteAvatar removes avatar by id', async () => {
    mockFindByIdAndDelete.mockResolvedValue({ _id: 'a1' });

    const result = await deleteAvatar('a1');
    expect(mockFindByIdAndDelete).toHaveBeenCalledWith('a1');
    expect(result).toBeTruthy();
  });
});
