import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IComplianceConfig extends Document {
  organizationId: string;
  hipaaMode: boolean;
  soc2AuditEnabled: boolean;
  gdprDpaGenerated: boolean;
  dataResidency: 'us' | 'eu' | 'auto';
  retentionDays: number;
  piiFields: string[];
  lastAuditExport?: Date;
  dpaGeneratedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ComplianceConfigSchema = new Schema(
  {
    organizationId: { type: String, required: true, unique: true },
    hipaaMode: { type: Boolean, default: false },
    soc2AuditEnabled: { type: Boolean, default: false },
    gdprDpaGenerated: { type: Boolean, default: false },
    dataResidency: {
      type: String,
      enum: ['us', 'eu', 'auto'],
      default: 'auto',
    },
    retentionDays: { type: Number, default: 365 },
    piiFields: { type: [String], default: ['email', 'phone', 'name', 'address'] },
    lastAuditExport: { type: Date },
    dpaGeneratedAt: { type: Date },
  },
  { timestamps: true }
);

const ComplianceConfig: Model<IComplianceConfig> =
  mongoose.models.ComplianceConfig || mongoose.model<IComplianceConfig>('ComplianceConfig', ComplianceConfigSchema);

export default ComplianceConfig;
