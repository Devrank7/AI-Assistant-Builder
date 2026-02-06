import mongoose, { Schema, Document, Model } from 'mongoose';
import { SubscriptionTier } from '@/lib/pricing';

// Subscription status enum
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'suspended';
export type PaymentMethod = 'cryptomus' | 'dodo' | 'liqpay' | null;

export interface IClient extends Document {
  clientId: string;
  clientToken: string;
  username: string;
  email: string;
  website: string;
  phone?: string;
  addresses?: string[];
  instagram?: string;
  telegram?: string; // For payment notifications
  requests: number;
  tokens: number;
  costUsd: number; // Total lifetime API cost in USD
  monthlyTokensInput: number;
  monthlyTokensOutput: number;
  monthlyCostUsd: number; // Current month API cost in USD
  costResetDate: Date; // Date when monthly counters were last reset
  costWarningNotified: boolean; // Whether $20 warning was sent this month
  startDate: Date;
  folderPath: string;

  // Subscription fields
  isActive: boolean;
  subscriptionStatus: SubscriptionStatus;
  paymentMethod: PaymentMethod;
  nextPaymentDate: Date | null;
  lastPaymentDate: Date | null;
  paymentFailedCount: number;
  gracePeriodEnd: Date | null;

  // Prepayment fields
  prepaidMonths: number; // Number of months prepaid (1, 3, 6, 12)
  prepaidUntil: Date | null; // Date until which subscription is prepaid
  subscriptionTier: SubscriptionTier; // Current subscription tier
  lastPrepaymentAmount: number; // Amount of last prepayment in USD

  // Extra AI credits (top-up when hitting $40 limit)
  extraCreditsUsd: number; // Purchased additional credits (reset with monthly counters)
  extraCreditsExpiry: Date | null; // When extra credits expire

  // Provider-specific IDs
  cryptomusSubscriptionId: string | null;
  externalCustomerId: string | null; // For Dodo/LiqPay in future

  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    clientToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    website: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    addresses: {
      type: [String],
      required: false,
      default: [],
    },
    instagram: {
      type: String,
      required: false,
    },
    telegram: {
      type: String,
      required: false,
    },
    requests: {
      type: Number,
      required: true,
      default: 0,
    },
    tokens: {
      type: Number,
      required: true,
      default: 0,
    },
    costUsd: {
      type: Number,
      default: 0,
    },
    monthlyTokensInput: {
      type: Number,
      default: 0,
    },
    monthlyTokensOutput: {
      type: Number,
      default: 0,
    },
    monthlyCostUsd: {
      type: Number,
      default: 0,
    },
    costResetDate: {
      type: Date,
      default: Date.now,
    },
    costWarningNotified: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    folderPath: {
      type: String,
      required: true,
    },

    // Subscription fields
    isActive: {
      type: Boolean,
      default: true,
    },
    subscriptionStatus: {
      type: String,
      enum: ['trial', 'active', 'past_due', 'canceled', 'suspended'],
      default: 'trial',
    },
    paymentMethod: {
      type: String,
      enum: ['cryptomus', 'dodo', 'liqpay', null],
      default: null,
    },
    nextPaymentDate: {
      type: Date,
      default: null,
    },
    lastPaymentDate: {
      type: Date,
      default: null,
    },
    paymentFailedCount: {
      type: Number,
      default: 0,
    },
    gracePeriodEnd: {
      type: Date,
      default: null,
    },

    // Prepayment fields
    prepaidMonths: {
      type: Number,
      default: 1,
    },
    prepaidUntil: {
      type: Date,
      default: null,
    },
    subscriptionTier: {
      type: String,
      enum: ['monthly', 'quarterly', 'semi_annual', 'annual'],
      default: 'monthly',
    },
    lastPrepaymentAmount: {
      type: Number,
      default: 0,
    },

    // Extra AI credits (top-up when hitting monthly limit)
    extraCreditsUsd: {
      type: Number,
      default: 0,
    },
    extraCreditsExpiry: {
      type: Date,
      default: null,
    },

    // Provider-specific IDs
    cryptomusSubscriptionId: {
      type: String,
      default: null,
    },
    externalCustomerId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for payment queries
ClientSchema.index({ nextPaymentDate: 1, subscriptionStatus: 1 });
ClientSchema.index({ gracePeriodEnd: 1 });

const Client: Model<IClient> = mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
