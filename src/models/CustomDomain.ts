import mongoose, { Schema, Document, Model } from 'mongoose';

export type DomainStatus = 'pending_verification' | 'verified' | 'ssl_provisioning' | 'active' | 'failed' | 'expired';

export interface ICustomDomain extends Document {
  organizationId: string;
  clientId: string;
  domain: string;
  verificationToken: string;
  cnameTarget: string;
  status: DomainStatus;
  sslCertificateId?: string;
  sslExpiresAt?: Date;
  lastCheckedAt?: Date;
  verifiedAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomDomainSchema = new Schema<ICustomDomain>(
  {
    organizationId: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    domain: { type: String, required: true, unique: true, lowercase: true, trim: true },
    verificationToken: { type: String, required: true },
    cnameTarget: { type: String, default: 'proxy.winbixai.com' },
    status: {
      type: String,
      enum: ['pending_verification', 'verified', 'ssl_provisioning', 'active', 'failed', 'expired'],
      default: 'pending_verification',
    },
    sslCertificateId: { type: String },
    sslExpiresAt: { type: Date },
    lastCheckedAt: { type: Date },
    verifiedAt: { type: Date },
    error: { type: String },
  },
  { timestamps: true }
);

CustomDomainSchema.index({ organizationId: 1, status: 1 });
CustomDomainSchema.index({ domain: 1 }, { unique: true });

const CustomDomain: Model<ICustomDomain> =
  mongoose.models.CustomDomain || mongoose.model<ICustomDomain>('CustomDomain', CustomDomainSchema);

export default CustomDomain;
