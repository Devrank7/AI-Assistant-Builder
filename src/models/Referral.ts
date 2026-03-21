import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReferredUser {
  userId: string;
  email: string;
  signedUpAt: Date;
  convertedAt?: Date;
  plan?: string;
  rewardPaid: boolean;
  rewardAmount: number;
}

export interface IReferralStats {
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
}

export interface IReferralProgram extends Document {
  referralId: string; // unique id like "REF-abc123"
  referrerId: string; // userId who owns this referral program
  referrerOrgId?: string;
  referralCode: string; // short code like "WINBIX-john"
  referralLink: string; // full URL
  referredUsers: IReferredUser[];
  stats: IReferralStats;
  rewardType: 'percentage' | 'fixed';
  rewardValue: number;
  isActive: boolean;
  payoutHistory: Array<{
    amount: number;
    requestedAt: Date;
    paidAt?: Date;
    status: 'pending' | 'paid' | 'rejected';
    note?: string;
  }>;
  notifyOnSignup: boolean;
  notifyOnConversion: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReferredUserSchema = new Schema<IReferredUser>(
  {
    userId: { type: String, required: true },
    email: { type: String, required: true },
    signedUpAt: { type: Date, required: true, default: Date.now },
    convertedAt: { type: Date, default: null },
    plan: { type: String, default: null },
    rewardPaid: { type: Boolean, default: false },
    rewardAmount: { type: Number, default: 0 },
  },
  { _id: false }
);

const ReferralProgramSchema = new Schema<IReferralProgram>(
  {
    referralId: { type: String, required: true, unique: true, index: true },
    referrerId: { type: String, required: true, unique: true, index: true },
    referrerOrgId: { type: String, default: null },
    referralCode: { type: String, required: true, unique: true, index: true },
    referralLink: { type: String, required: true },
    referredUsers: { type: [ReferredUserSchema], default: [] },
    stats: {
      totalClicks: { type: Number, default: 0 },
      totalSignups: { type: Number, default: 0 },
      totalConversions: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      pendingEarnings: { type: Number, default: 0 },
      paidEarnings: { type: Number, default: 0 },
    },
    rewardType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    rewardValue: { type: Number, default: 20 }, // 20% or $20
    isActive: { type: Boolean, default: true },
    payoutHistory: {
      type: [
        {
          amount: { type: Number, required: true },
          requestedAt: { type: Date, default: Date.now },
          paidAt: { type: Date, default: null },
          status: { type: String, enum: ['pending', 'paid', 'rejected'], default: 'pending' },
          note: { type: String, default: null },
        },
      ],
      default: [],
    },
    notifyOnSignup: { type: Boolean, default: true },
    notifyOnConversion: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const ReferralProgram: Model<IReferralProgram> =
  mongoose.models.ReferralProgram || mongoose.model<IReferralProgram>('ReferralProgram', ReferralProgramSchema);

export default ReferralProgram;
