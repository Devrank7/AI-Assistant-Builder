import mongoose, { Schema, Document, Model } from 'mongoose';

export type Plan = 'none' | 'basic' | 'pro' | 'free' | 'starter' | 'enterprise';
export type BillingPeriod = 'monthly' | 'annual';
export type SubStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export type AuthProvider = 'email' | 'google';

export interface IUser extends Document {
  email: string;
  passwordHash?: string;
  name: string;
  googleId?: string;
  authProvider: AuthProvider;
  emailVerified: boolean;
  stripeCustomerId: string;
  plan: Plan;
  billingPeriod: BillingPeriod;
  subscriptionStatus: SubStatus;
  trialEndsAt: Date | null;
  stripeSubscriptionId: string | null;
  refreshTokens: string[];
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
  emailVerificationToken: string | null;
  organizationId: string | null;
  onboardingCompleted: boolean;
  niche: string | null;
  referralCode: string | null;
  referredBy: string | null; // userId of referrer
  emailSequencesSent: string[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    googleId: { type: String, default: null, sparse: true },
    authProvider: { type: String, enum: ['email', 'google'], default: 'email' },
    emailVerified: { type: Boolean, default: false },
    stripeCustomerId: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['none', 'basic', 'pro', 'free', 'starter', 'enterprise'], default: 'none' },
    billingPeriod: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    subscriptionStatus: { type: String, enum: ['trial', 'active', 'past_due', 'canceled'], default: 'trial' },
    trialEndsAt: { type: Date, default: null },
    stripeSubscriptionId: { type: String, default: null },
    refreshTokens: { type: [String], default: [] },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    emailVerificationToken: { type: String, default: null },
    organizationId: { type: String, default: null, index: true },
    onboardingCompleted: { type: Boolean, default: false },
    niche: { type: String, default: null },
    referralCode: { type: String, default: null, unique: true, sparse: true },
    referredBy: { type: String, default: null, index: true },
    emailSequencesSent: { type: [String], default: [] },
  },
  { timestamps: true }
);

UserSchema.index({ googleId: 1 }, { sparse: true });
UserSchema.index({ referralCode: 1 }, { sparse: true });
UserSchema.index({ stripeCustomerId: 1 });
UserSchema.index({ passwordResetToken: 1 });
UserSchema.index({ emailVerificationToken: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
