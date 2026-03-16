import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrgPlan = 'free' | 'starter' | 'pro' | 'enterprise';
export type OrgBillingPeriod = 'monthly' | 'annual';
export type OrgSubStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export interface OrgLimits {
  maxWidgets: number;
  maxMessages: number;
  maxTeamMembers: number;
  features: string[];
}

export const PLAN_LIMITS: Record<OrgPlan, OrgLimits> = {
  free: { maxWidgets: 1, maxMessages: 100, maxTeamMembers: 1, features: ['chat'] },
  starter: { maxWidgets: 3, maxMessages: 1000, maxTeamMembers: 2, features: ['chat', 'faq', 'form'] },
  pro: { maxWidgets: 999, maxMessages: 999999, maxTeamMembers: 5, features: ['all'] },
  enterprise: {
    maxWidgets: 999,
    maxMessages: 999999,
    maxTeamMembers: 999,
    features: ['all', 'whitelabel', 'custom_api'],
  },
};

export interface IOrganization extends Document {
  name: string;
  ownerId: string;
  plan: OrgPlan;
  billingPeriod: OrgBillingPeriod;
  subscriptionStatus: OrgSubStatus;
  trialEndsAt: Date | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  limits: OrgLimits;
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    ownerId: { type: String, required: true, index: true },
    plan: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
    billingPeriod: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    subscriptionStatus: { type: String, enum: ['trial', 'active', 'past_due', 'canceled'], default: 'active' },
    trialEndsAt: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    limits: {
      maxWidgets: { type: Number, default: 1 },
      maxMessages: { type: Number, default: 100 },
      maxTeamMembers: { type: Number, default: 1 },
      features: { type: [String], default: ['chat'] },
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ stripeCustomerId: 1 }, { sparse: true });

const Organization: Model<IOrganization> =
  mongoose.models.Organization || mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
