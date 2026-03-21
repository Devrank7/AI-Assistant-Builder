// src/models/ABTest.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface IVariantConfig {
  greeting?: string;
  systemPrompt?: string;
  theme?: Record<string, string>;
  quickReplies?: string[];
  position?: string;
}

export interface IVariantStats {
  impressions: number;
  conversations: number;
  messages: number;
  conversions: number;
  avgSatisfaction: number;
  avgResponseTime: number;
}

export interface IABVariant {
  variantId: string;
  name: string;
  trafficPercent: number;
  config: IVariantConfig;
  stats: IVariantStats;
}

export interface IABTest extends Document {
  testId: string;
  clientId: string;
  organizationId: string;
  userId: string;
  name: string;
  description: string;
  status: ABTestStatus;
  variants: IABVariant[];
  winnerVariantId?: string;
  confidenceLevel?: number;
  startDate?: Date;
  endDate?: Date;
  minSampleSize: number;
  createdAt: Date;
  updatedAt: Date;
}

const VariantConfigSchema = new Schema(
  {
    greeting: { type: String },
    systemPrompt: { type: String },
    theme: { type: Schema.Types.Mixed, default: {} },
    quickReplies: { type: [String], default: [] },
    position: { type: String },
  },
  { _id: false }
);

const VariantStatsSchema = new Schema(
  {
    impressions: { type: Number, default: 0 },
    conversations: { type: Number, default: 0 },
    messages: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    avgSatisfaction: { type: Number, default: 0 },
    avgResponseTime: { type: Number, default: 0 },
  },
  { _id: false }
);

const ABVariantSchema = new Schema(
  {
    variantId: { type: String, required: true },
    name: { type: String, required: true },
    trafficPercent: { type: Number, required: true, min: 0, max: 100 },
    config: { type: VariantConfigSchema, default: () => ({}) },
    stats: { type: VariantStatsSchema, default: () => ({}) },
  },
  { _id: false }
);

const ABTestSchema = new Schema<IABTest>(
  {
    testId: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    status: {
      type: String,
      enum: ['draft', 'running', 'paused', 'completed'],
      default: 'draft',
      index: true,
    },
    variants: [ABVariantSchema],
    winnerVariantId: { type: String },
    confidenceLevel: { type: Number },
    startDate: { type: Date },
    endDate: { type: Date },
    minSampleSize: { type: Number, default: 100 },
  },
  { timestamps: true }
);

ABTestSchema.index({ clientId: 1, status: 1 });
ABTestSchema.index({ organizationId: 1, createdAt: -1 });

const ABTest: Model<IABTest> = mongoose.models.ABTest || mongoose.model<IABTest>('ABTest', ABTestSchema);

export default ABTest;
