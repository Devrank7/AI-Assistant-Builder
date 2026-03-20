import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock MongoDB
const mockConnectDB = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/mongodb', () => ({ default: mockConnectDB }));

// Mock models
const mockTrainingCreate = vi.fn();
const mockTrainingCountDocuments = vi.fn();
const mockTrainingAggregate = vi.fn();
const mockTrainingFind = vi.fn();
const mockTrainingFindOne = vi.fn();

vi.mock('@/models/TrainingExample', () => ({
  default: {
    create: (...args: unknown[]) => mockTrainingCreate(...args),
    countDocuments: (...args: unknown[]) => mockTrainingCountDocuments(...args),
    aggregate: (...args: unknown[]) => mockTrainingAggregate(...args),
    find: (...args: unknown[]) => mockTrainingFind(...args),
    findOne: (...args: unknown[]) => mockTrainingFindOne(...args),
  },
}));

vi.mock('@/models/KnowledgeChunk', () => ({
  default: {
    create: vi.fn(),
  },
}));

vi.mock('@/models/Correction', () => ({
  default: {
    find: vi.fn().mockResolvedValue([]),
  },
}));

// Mock multiModelProvider as not available
vi.mock('@/lib/multiModelProvider', () => {
  throw new Error('Module not found');
});

describe('Training Studio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('addTrainingExample', () => {
    it('should create a training example with default quality score of 50', async () => {
      mockTrainingCreate.mockImplementation((data: Record<string, unknown>) =>
        Promise.resolve({ ...data, _id: 'te_123' })
      );

      const { addTrainingExample } = await import('@/lib/trainingStudio');
      const result = await addTrainingExample({
        clientId: 'client1',
        userId: 'user1',
        userMessage: 'What are your hours?',
        idealResponse: 'We are open Monday to Friday, 9am to 5pm.',
      });

      expect(mockTrainingCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: 'client1',
          userMessage: 'What are your hours?',
          idealResponse: 'We are open Monday to Friday, 9am to 5pm.',
          qualityScore: 50,
          status: 'pending',
        })
      );
      expect(result).toBeDefined();
    });
  });

  describe('getTrainingStats', () => {
    it('should return aggregated statistics', async () => {
      mockTrainingCountDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(30) // pending
        .mockResolvedValueOnce(40) // approved
        .mockResolvedValueOnce(10) // rejected
        .mockResolvedValueOnce(20); // applied

      mockTrainingAggregate.mockResolvedValueOnce([{ _id: null, avgQuality: 72.5 }]).mockResolvedValueOnce([
        { _id: 'general', count: 50 },
        { _id: 'pricing', count: 30 },
      ]);

      const { getTrainingStats } = await import('@/lib/trainingStudio');
      const stats = await getTrainingStats('client1');

      expect(stats.total).toBe(100);
      expect(stats.pending).toBe(30);
      expect(stats.approved).toBe(40);
      expect(stats.avgQuality).toBe(73);
      expect(stats.categories).toHaveLength(2);
    });
  });

  describe('importFromCorrections', () => {
    it('should import corrections that are not yet imported', async () => {
      const mockCorrections = [
        {
          userQuestion: 'How much?',
          correctedAnswer: '$100',
          originalAnswer: 'I do not know',
        },
      ];

      const Correction = (await import('@/models/Correction')).default;
      vi.mocked(Correction.find).mockResolvedValue(mockCorrections);
      mockTrainingFindOne.mockResolvedValue(null); // not yet imported
      mockTrainingCreate.mockResolvedValue({});

      const { importFromCorrections } = await import('@/lib/trainingStudio');
      const result = await importFromCorrections('client1', 'user1');

      expect(result.imported).toBe(1);
      expect(mockTrainingCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'correction',
          userMessage: 'How much?',
          idealResponse: '$100',
          qualityScore: 70,
        })
      );
    });
  });
});
