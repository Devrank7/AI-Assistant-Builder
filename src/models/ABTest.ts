// src/models/ABTest.ts
import mongoose, { Schema, Document, Model } from 'mongoose';

export type ABTestStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface IABVariant {
  id: string;
  label: string;
  config: Record<string, unknown>;
  visitors: number;
  conversions: number;
}

export interface IABTest extends Document {
  clientId: string;
  organizationId: string;
  name: string;
  status: ABTestStatus;
  variants: IABVariant[];
  winnerVariantId: string | null;
  minVisitors: number;
  startedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ABVariantSchema = new Schema(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    visitors: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
  },
  { _id: false }
);

const ABTestSchema = new Schema<IABTest>(
  {
    clientId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['draft', 'running', 'paused', 'completed'], default: 'draft' },
    variants: [ABVariantSchema],
    winnerVariantId: { type: String, default: null },
    minVisitors: { type: Number, default: 100 },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ABTestSchema.index({ clientId: 1, status: 1 });

const ABTest: Model<IABTest> = mongoose.models.ABTest || mongoose.model<IABTest>('ABTest', ABTestSchema);

export default ABTest;
