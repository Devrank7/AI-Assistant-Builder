// src/lib/abTestService.ts
import { randomUUID, createHash } from 'crypto';
import connectDB from '@/lib/mongodb';
import ABTest, { IVariantConfig } from '@/models/ABTest';
import { chiSquaredTest } from '@/lib/abTestStats';

/* ── Helpers ── */

function generateTestId(): string {
  return `abt_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function generateVariantId(): string {
  return `var_${randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

/* ── Types ── */

export interface CreateTestInput {
  name: string;
  description?: string;
  clientId: string;
  minSampleSize?: number;
  variants?: Array<{
    name: string;
    trafficPercent: number;
    config: IVariantConfig;
  }>;
}

/* ── Service functions ── */

/**
 * Create a new A/B test with at least Control + Variant A.
 */
export async function createTest(userId: string, organizationId: string, data: CreateTestInput) {
  await connectDB();

  const variants =
    data.variants && data.variants.length >= 2
      ? data.variants.map((v) => ({
          variantId: generateVariantId(),
          name: v.name,
          trafficPercent: v.trafficPercent,
          config: v.config || {},
          stats: {
            impressions: 0,
            conversations: 0,
            messages: 0,
            conversions: 0,
            avgSatisfaction: 0,
            avgResponseTime: 0,
          },
        }))
      : [
          {
            variantId: generateVariantId(),
            name: 'Control',
            trafficPercent: 50,
            config: {},
            stats: {
              impressions: 0,
              conversations: 0,
              messages: 0,
              conversions: 0,
              avgSatisfaction: 0,
              avgResponseTime: 0,
            },
          },
          {
            variantId: generateVariantId(),
            name: 'Variant A',
            trafficPercent: 50,
            config: {},
            stats: {
              impressions: 0,
              conversations: 0,
              messages: 0,
              conversions: 0,
              avgSatisfaction: 0,
              avgResponseTime: 0,
            },
          },
        ];

  const test = await ABTest.create({
    testId: generateTestId(),
    userId,
    organizationId,
    clientId: data.clientId,
    name: data.name,
    description: data.description || '',
    status: 'draft',
    variants,
    minSampleSize: data.minSampleSize ?? 100,
  });

  return test;
}

/**
 * Start a test (draft → running).
 */
export async function startTest(testId: string) {
  await connectDB();
  const test = await ABTest.findOne({ testId });
  if (!test) throw new Error('Test not found');
  if (test.status !== 'draft') throw new Error(`Cannot start test in status: ${test.status}`);

  test.status = 'running';
  test.startDate = new Date();
  await test.save();
  return test;
}

/**
 * Pause a running test.
 */
export async function pauseTest(testId: string) {
  await connectDB();
  const test = await ABTest.findOne({ testId });
  if (!test) throw new Error('Test not found');
  if (test.status !== 'running') throw new Error(`Cannot pause test in status: ${test.status}`);

  test.status = 'paused';
  await test.save();
  return test;
}

/**
 * Resume a paused test.
 */
export async function resumeTest(testId: string) {
  await connectDB();
  const test = await ABTest.findOne({ testId });
  if (!test) throw new Error('Test not found');
  if (test.status !== 'paused') throw new Error(`Cannot resume test in status: ${test.status}`);

  test.status = 'running';
  await test.save();
  return test;
}

/**
 * Complete a test — auto-calculates the winner using chi-squared test.
 */
export async function completeTest(testId: string) {
  await connectDB();
  const test = await ABTest.findOne({ testId });
  if (!test) throw new Error('Test not found');
  if (!['running', 'paused'].includes(test.status)) throw new Error(`Cannot complete test in status: ${test.status}`);

  test.status = 'completed';
  test.endDate = new Date();

  // Determine winner via chi-squared
  const variantData = test.variants.map((v) => ({
    visitors: v.stats.impressions,
    conversions: v.stats.conversions,
  }));

  const result = chiSquaredTest(variantData);
  test.confidenceLevel = result.confidence;

  if (result.significant && result.winnerIndex !== null) {
    test.winnerVariantId = test.variants[result.winnerIndex].variantId;
  }

  await test.save();
  return test;
}

/**
 * Get the currently running test for a widget.
 */
export async function getActiveTest(clientId: string) {
  await connectDB();
  return ABTest.findOne({ clientId, status: 'running' });
}

/**
 * Deterministic variant assignment by hashing visitorId.
 * Returns the variantId to serve to the visitor.
 */
export async function assignVariant(clientId: string, visitorId: string): Promise<string | null> {
  await connectDB();
  const test = await ABTest.findOne({ clientId, status: 'running' });
  if (!test || test.variants.length === 0) return null;

  // Deterministic hash → integer in [0, 10000)
  const hash = createHash('sha256').update(`${test.testId}:${visitorId}`).digest('hex');
  const num = parseInt(hash.slice(0, 8), 16) % 10000;

  // Walk through traffic splits (stored as percents that sum to 100)
  let cumulative = 0;
  for (const variant of test.variants) {
    cumulative += variant.trafficPercent * 100; // scale to 10000
    if (num < cumulative) return variant.variantId;
  }

  // Fallback: first variant
  return test.variants[0].variantId;
}

/**
 * Record an impression for a specific variant.
 */
export async function recordImpression(testId: string, variantId: string) {
  await connectDB();
  await ABTest.updateOne({ testId, 'variants.variantId': variantId }, { $inc: { 'variants.$.stats.impressions': 1 } });
}

/**
 * Record a conversion for a specific variant.
 */
export async function recordConversion(testId: string, variantId: string) {
  await connectDB();
  await ABTest.updateOne({ testId, 'variants.variantId': variantId }, { $inc: { 'variants.$.stats.conversions': 1 } });
}

/**
 * Calculate statistical confidence between two variants using z-test for proportions.
 * Returns confidence level (0-100).
 */
export function calculateConfidenceBetweenVariants(
  aImpressions: number,
  aConversions: number,
  bImpressions: number,
  bConversions: number
): number {
  if (aImpressions === 0 || bImpressions === 0) return 0;

  const pA = aConversions / aImpressions;
  const pB = bConversions / bImpressions;
  const pPool = (aConversions + bConversions) / (aImpressions + bImpressions);

  const se = Math.sqrt(pPool * (1 - pPool) * (1 / aImpressions + 1 / bImpressions));
  if (se === 0) return 0;

  const z = Math.abs((pA - pB) / se);

  // Approximate normal CDF
  const confidence = normalCDF(z) * 100;
  return Math.round(Math.min(99.9, confidence));
}

function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const poly =
    0.31938153 * t - 0.356563782 * t ** 2 + 1.781477937 * t ** 3 - 1.821255978 * t ** 4 + 1.330274429 * t ** 5;
  const approx = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp((-z * z) / 2) * poly;
  return z >= 0 ? approx : 1 - approx;
}
