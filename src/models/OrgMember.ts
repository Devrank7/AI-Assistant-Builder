import mongoose, { Schema, Document, Model } from 'mongoose';

export type OrgRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface IOrgMember extends Document {
  organizationId: string;
  userId: string;
  role: OrgRole;
  createdAt: Date;
  updatedAt: Date;
}

const OrgMemberSchema = new Schema<IOrgMember>(
  {
    organizationId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'viewer' },
  },
  { timestamps: true }
);

OrgMemberSchema.index({ organizationId: 1, userId: 1 }, { unique: true });

const OrgMember: Model<IOrgMember> =
  mongoose.models.OrgMember || mongoose.model<IOrgMember>('OrgMember', OrgMemberSchema);

export default OrgMember;
