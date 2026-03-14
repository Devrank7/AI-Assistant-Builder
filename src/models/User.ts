import mongoose, { Schema, Document, Model } from 'mongoose';

export type Plan = 'none' | 'basic' | 'pro';
export type BillingPeriod = 'monthly' | 'annual';
export type SubStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  name: string;
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
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    stripeCustomerId: { type: String, required: true, unique: true },
    plan: { type: String, enum: ['none', 'basic', 'pro'], default: 'none' },
    billingPeriod: { type: String, enum: ['monthly', 'annual'], default: 'monthly' },
    subscriptionStatus: { type: String, enum: ['trial', 'active', 'past_due', 'canceled'], default: 'trial' },
    trialEndsAt: { type: Date, default: null },
    stripeSubscriptionId: { type: String, default: null },
    refreshTokens: { type: [String], default: [] },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    emailVerificationToken: { type: String, default: null },
  },
  { timestamps: true }
);

UserSchema.index({ stripeCustomerId: 1 });
UserSchema.index({ passwordResetToken: 1 });
UserSchema.index({ emailVerificationToken: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
