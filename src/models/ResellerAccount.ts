import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IResellerSubAccount {
  organizationId: string;
  name: string;
  createdAt: Date;
}

export interface IResellerAccount extends Document {
  organizationId: string;
  name: string;
  email: string;
  company: string;
  subAccounts: IResellerSubAccount[];
  billingOverride: {
    markupPercent: number;
    customPricing?: Record<string, number>;
  };
  brandedLoginUrl?: string;
  brandedLogo?: string;
  maxSubAccounts: number;
  totalRevenue: number;
  status: 'active' | 'suspended';
  createdAt: Date;
  updatedAt: Date;
}

const ResellerAccountSchema = new Schema<IResellerAccount>(
  {
    organizationId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    company: { type: String, required: true },
    subAccounts: [
      {
        organizationId: { type: String, required: true },
        name: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    billingOverride: {
      markupPercent: { type: Number, default: 20, min: 0, max: 100 },
      customPricing: { type: Schema.Types.Mixed },
    },
    brandedLoginUrl: { type: String },
    brandedLogo: { type: String },
    maxSubAccounts: { type: Number, default: 50 },
    totalRevenue: { type: Number, default: 0 },
    status: { type: String, required: true, enum: ['active', 'suspended'], default: 'active' },
  },
  { timestamps: true }
);

ResellerAccountSchema.index({ organizationId: 1 });

const ResellerAccount: Model<IResellerAccount> =
  mongoose.models.ResellerAccount || mongoose.model<IResellerAccount>('ResellerAccount', ResellerAccountSchema);

export default ResellerAccount;
