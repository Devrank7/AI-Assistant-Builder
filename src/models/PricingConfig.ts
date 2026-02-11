import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPricingConfig extends Document {
  key: string;
  baseMonthlyPrice: number;
  annualDiscount: number;
  costWarningThreshold: number;
  costBlockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

const PricingConfigSchema = new Schema<IPricingConfig>(
  {
    key: { type: String, required: true, unique: true, default: 'global' },
    baseMonthlyPrice: { type: Number, required: true, default: 65 },
    annualDiscount: { type: Number, required: true, default: 0.15, min: 0, max: 1 },
    costWarningThreshold: { type: Number, required: true, default: 20 },
    costBlockThreshold: { type: Number, required: true, default: 40 },
  },
  { timestamps: true }
);

const PricingConfig: Model<IPricingConfig> =
  mongoose.models.PricingConfig || mongoose.model<IPricingConfig>('PricingConfig', PricingConfigSchema);

export default PricingConfig;
