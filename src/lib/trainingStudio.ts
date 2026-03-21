import connectDB from './mongodb';
import TrainingExample, { type ITrainingExample } from '@/models/TrainingExample';
import KnowledgeChunk from '@/models/KnowledgeChunk';
import Correction from '@/models/Correction';
import { generateEmbedding } from '@/lib/gemini';

// Try to import generateWithFallback for AI quality scoring
let generateWithFallback: ((prompt: string) => Promise<string>) | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/lib/multiModelProvider');
  generateWithFallback = mod.generateWithFallback;
} catch {
  // multiModelProvider not available — use default quality score
}

async function scoreQuality(userMessage: string, idealResponse: string): Promise<number> {
  if (!generateWithFallback) return 50;

  try {
    const prompt = `Rate the quality of this training example on a scale of 0-100.
Consider: relevance, completeness, clarity, helpfulness.
User message: "${userMessage}"
Ideal response: "${idealResponse}"
Return ONLY a number between 0 and 100.`;

    const result = await generateWithFallback(prompt);
    const score = parseInt(result.trim(), 10);
    if (isNaN(score) || score < 0 || score > 100) return 50;
    return score;
  } catch {
    return 50;
  }
}

export async function addTrainingExample(data: {
  clientId: string;
  userId: string;
  source?: string;
  userMessage: string;
  idealResponse: string;
  actualResponse?: string;
  category?: string;
  tags?: string[];
}): Promise<ITrainingExample> {
  await connectDB();

  const qualityScore = await scoreQuality(data.userMessage, data.idealResponse);

  const example = await TrainingExample.create({
    ...data,
    source: data.source || 'manual',
    tags: data.tags || [],
    qualityScore,
    status: 'pending',
  });

  return example;
}

export async function applyTrainingExamples(clientId: string): Promise<{ applied: number }> {
  await connectDB();

  const approved = await TrainingExample.find({
    clientId,
    status: 'approved',
  });

  let applied = 0;

  for (const example of approved) {
    // Convert to knowledge chunk
    const text = `Q: ${example.userMessage}\nA: ${example.idealResponse}`;

    // Generate a real embedding for semantic search
    const embedding = await generateEmbedding(text);

    await KnowledgeChunk.create({
      clientId,
      text,
      embedding,
      source: 'training_studio',
    });

    example.status = 'applied';
    example.appliedAt = new Date();
    await example.save();
    applied++;
  }

  return { applied };
}

export async function getTrainingStats(clientId: string) {
  await connectDB();

  const [total, pending, approved, rejected, applied] = await Promise.all([
    TrainingExample.countDocuments({ clientId }),
    TrainingExample.countDocuments({ clientId, status: 'pending' }),
    TrainingExample.countDocuments({ clientId, status: 'approved' }),
    TrainingExample.countDocuments({ clientId, status: 'rejected' }),
    TrainingExample.countDocuments({ clientId, status: 'applied' }),
  ]);

  const avgQualityResult = await TrainingExample.aggregate([
    { $match: { clientId } },
    { $group: { _id: null, avgQuality: { $avg: '$qualityScore' } } },
  ]);

  const categoryBreakdown = await TrainingExample.aggregate([
    { $match: { clientId, category: { $ne: null } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  return {
    total,
    pending,
    approved,
    rejected,
    applied,
    avgQuality: Math.round(avgQualityResult[0]?.avgQuality || 0),
    categories: categoryBreakdown.map((c) => ({ category: c._id, count: c.count })),
  };
}

export async function importFromCorrections(clientId: string, userId: string): Promise<{ imported: number }> {
  await connectDB();

  const corrections = await Correction.find({
    clientId,
    status: 'applied',
  });

  let imported = 0;

  for (const correction of corrections) {
    // Check if already imported
    const exists = await TrainingExample.findOne({
      clientId,
      userMessage: correction.userQuestion,
      source: 'correction',
    });

    if (exists) continue;

    await TrainingExample.create({
      clientId,
      userId,
      source: 'correction',
      userMessage: correction.userQuestion,
      idealResponse: correction.correctedAnswer,
      actualResponse: correction.originalAnswer,
      qualityScore: 70, // Corrections already went through review
      status: 'pending',
    });

    imported++;
  }

  return { imported };
}
