import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn() }));
vi.mock('@/models/Feedback', () => ({
  default: { countDocuments: vi.fn().mockResolvedValue(10) },
}));
vi.mock('@/models/ChatLog', () => ({
  default: { findOne: vi.fn() },
}));
vi.mock('@/models/Correction', () => ({
  default: {
    findOne: vi.fn(),
    create: vi.fn().mockResolvedValue({ _id: 'corr-1' }),
    countDocuments: vi.fn(),
    find: vi.fn(),
  },
}));
vi.mock('@/models/KnowledgeChunk', () => ({
  default: {
    find: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    lean: vi.fn().mockResolvedValue([{ text: 'Our hours are 9-5.' }]),
  },
}));
vi.mock('@google/generative-ai', () => {
  class MockGoogleGenerativeAI {
    getGenerativeModel() {
      return {
        generateContent: vi.fn().mockResolvedValue({
          response: {
            text: () => 'Our office hours are 9am to 5pm, Monday through Friday.',
          },
        }),
      };
    }
  }
  return { GoogleGenerativeAI: MockGoogleGenerativeAI };
});

describe('autoLearning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process negative feedback and create a correction', async () => {
    const ChatLog = (await import('@/models/ChatLog')).default;
    (ChatLog.findOne as any).mockResolvedValue({
      messages: [
        { role: 'user', content: 'What are your hours?', timestamp: new Date() },
        { role: 'assistant', content: 'I do not know.', timestamp: new Date() },
      ],
    });

    const Correction = (await import('@/models/Correction')).default;
    (Correction.findOne as any).mockResolvedValue(null);

    const { processNegativeFeedback } = await import('@/lib/autoLearning');
    const result = await processNegativeFeedback('client-1', 'session-1', 1, 'Wrong answer');

    expect(result.correctionCreated).toBe(true);
    expect(result.correction).toBeDefined();
    expect(Correction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        userQuestion: 'What are your hours?',
        status: 'pending',
        source: 'auto_learning',
      })
    );
  });

  it('should skip correction if one already exists for same question', async () => {
    const ChatLog = (await import('@/models/ChatLog')).default;
    (ChatLog.findOne as any).mockResolvedValue({
      messages: [
        { role: 'user', content: 'What are your hours?' },
        { role: 'assistant', content: 'Bad answer' },
      ],
    });

    const Correction = (await import('@/models/Correction')).default;
    (Correction.findOne as any).mockResolvedValue({ _id: 'existing-correction' });

    const { processNegativeFeedback } = await import('@/lib/autoLearning');
    const result = await processNegativeFeedback('client-1', 'session-1', 1);

    expect(result.correctionCreated).toBe(false);
    expect(Correction.create).not.toHaveBeenCalled();
  });

  it('should return false if chat log not found', async () => {
    const ChatLog = (await import('@/models/ChatLog')).default;
    (ChatLog.findOne as any).mockResolvedValue(null);

    const { processNegativeFeedback } = await import('@/lib/autoLearning');
    const result = await processNegativeFeedback('client-1', 'session-1', 1);

    expect(result.correctionCreated).toBe(false);
  });

  it('should get learning stats correctly', async () => {
    const Feedback = (await import('@/models/Feedback')).default;
    (Feedback.countDocuments as any).mockResolvedValue(20);

    const Correction = (await import('@/models/Correction')).default;
    (Correction.countDocuments as any)
      .mockResolvedValueOnce(15) // corrections generated
      .mockResolvedValueOnce(10); // corrections applied

    const { getLearningStats } = await import('@/lib/autoLearning');
    const stats = await getLearningStats('client-1');

    expect(stats.totalNegativeFeedback).toBe(20);
    expect(stats.correctionsGenerated).toBe(15);
    expect(stats.correctionsApplied).toBe(10);
    expect(stats.improvementRate).toBe(50); // 10/20 * 100
  });

  it('should auto-apply pending corrections with valid content', async () => {
    const Correction = (await import('@/models/Correction')).default;
    const mockCorrections = [
      {
        correctedAnswer: 'A valid corrected answer that is long enough.',
        status: 'pending',
        save: vi.fn().mockResolvedValue(true),
      },
      {
        correctedAnswer: 'Short',
        status: 'pending',
        save: vi.fn().mockResolvedValue(true),
      },
    ];
    (Correction.find as any).mockResolvedValue(mockCorrections);

    const { autoApplyCorrections } = await import('@/lib/autoLearning');
    const applied = await autoApplyCorrections('client-1');

    expect(applied).toBe(1); // Only the first one is long enough (>10 chars)
    expect(mockCorrections[0].status).toBe('applied');
    expect(mockCorrections[0].save).toHaveBeenCalled();
  });
});
