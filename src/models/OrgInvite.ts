// src/models/OrgInvite.ts
import mongoose, { Schema, Document, Model } from 'mongoose';
import type { OrgRole } from './OrgMember';

export interface IOrgInvite extends Document {
  organizationId: string;
  email: string;
  role: OrgRole;
  token: string;
  invitedBy: string;
  expiresAt: Date;
  createdAt: Date;
}

const OrgInviteSchema = new Schema<IOrgInvite>(
  {
    organizationId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['owner', 'admin', 'editor', 'viewer'], default: 'viewer' },
    token: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

OrgInviteSchema.index({ organizationId: 1, email: 1 }, { unique: true });
OrgInviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OrgInvite: Model<IOrgInvite> =
  mongoose.models.OrgInvite || mongoose.model<IOrgInvite>('OrgInvite', OrgInviteSchema);

export default OrgInvite;
