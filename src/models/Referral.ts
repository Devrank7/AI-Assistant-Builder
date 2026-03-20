import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReferral extends Document {
  referrerId: string;
  refereeId: string;
  code: string;
  rewardApplied: boolean;
  rewardType: 'starter_month' | 'none';
  createdAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: String, required: true, index: true },
    refereeId: { type: String, required: true, unique: true },
    code: { type: String, required: true, index: true },
    rewardApplied: { type: Boolean, default: false },
    rewardType: { type: String, enum: ['starter_month', 'none'], default: 'none' },
  },
  { timestamps: true }
);

const Referral: Model<IReferral> = mongoose.models.Referral || mongoose.model<IReferral>('Referral', ReferralSchema);

export default Referral;
