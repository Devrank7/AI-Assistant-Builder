import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IResellerSubAccount {
  accountId: string;
  companyName: string;
  email: string;
  plan: string;
  status: 'active' | 'suspended' | 'canceled';
  widgetCount: number;
  monthlyRevenue: number;
  createdAt: Date;
}

export interface IPayoutHistoryEntry {
  amount: number;
  method: string;
  status: 'pending' | 'paid' | 'rejected';
  requestedAt: Date;
  paidAt?: Date;
}

export interface IResellerAccount extends Document {
  resellerId: string;
  userId: string;
  organizationId?: string;
  companyName: string;
  contactEmail: string;
  status: 'pending' | 'active' | 'suspended';
  tier: 'starter' | 'professional' | 'enterprise';
  commission: {
    percentage: number;
    minPayout: number;
  };
  subAccounts: IResellerSubAccount[];
  earnings: {
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
  };
  payoutHistory: IPayoutHistoryEntry[];
  settings: {
    whiteLabel: boolean;
    customDomain?: string;
    brandName?: string;
    brandLogo?: string;
  };
  // Legacy fields (kept for backwards compatibility)
  name?: string;
  email?: string;
  company?: string;
  billingOverride?: {
    markupPercent: number;
    customPricing?: Record<string, number>;
  };
  brandedLoginUrl?: string;
  brandedLogo?: string;
  maxSubAccounts?: number;
  totalRevenue?: number;
  createdAt: Date;
  updatedAt: Date;
}

const SubAccountSchema = new Schema<IResellerSubAccount>(
  {
    accountId: { type: String, required: true },
    companyName: { type: String, required: true },
    email: { type: String, required: true },
    plan: { type: String, default: 'starter' },
    status: { type: String, enum: ['active', 'suspended', 'canceled'], default: 'active' },
    widgetCount: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const PayoutHistorySchema = new Schema<IPayoutHistoryEntry>(
  {
    amount: { type: Number, required: true },
    method: { type: String, required: true },
    status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
    paidAt: { type: Date },
  },
  { _id: true }
);

const ResellerAccountSchema = new Schema<IResellerAccount>(
  {
    resellerId: { type: String },
    userId: { type: String },
    organizationId: { type: String },
    companyName: { type: String, default: '' },
    contactEmail: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'active', 'suspended'],
      default: 'active',
    },
    tier: {
      type: String,
      enum: ['starter', 'professional', 'enterprise'],
      default: 'starter',
    },
    commission: {
      percentage: { type: Number, default: 15 },
      minPayout: { type: Number, default: 50 },
    },
    subAccounts: [SubAccountSchema],
    earnings: {
      totalEarnings: { type: Number, default: 0 },
      pendingEarnings: { type: Number, default: 0 },
      paidEarnings: { type: Number, default: 0 },
      thisMonthEarnings: { type: Number, default: 0 },
      lastMonthEarnings: { type: Number, default: 0 },
    },
    payoutHistory: [PayoutHistorySchema],
    settings: {
      whiteLabel: { type: Boolean, default: false },
      customDomain: { type: String },
      brandName: { type: String },
      brandLogo: { type: String },
    },
    // Legacy fields
    name: { type: String },
    email: { type: String },
    company: { type: String },
    billingOverride: {
      markupPercent: { type: Number, default: 20 },
      customPricing: { type: Schema.Types.Mixed },
    },
    brandedLoginUrl: { type: String },
    brandedLogo: { type: String },
    maxSubAccounts: { type: Number, default: 50 },
    totalRevenue: { type: Number, default: 0 },
  },
  { timestamps: true }
);

ResellerAccountSchema.index({ organizationId: 1 });
ResellerAccountSchema.index({ userId: 1 });

const ResellerAccount: Model<IResellerAccount> =
  mongoose.models.ResellerAccount || mongoose.model<IResellerAccount>('ResellerAccount', ResellerAccountSchema);

export default ResellerAccount;
