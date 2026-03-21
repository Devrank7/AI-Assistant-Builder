import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAuditLogEntry {
  action: string;
  user: string;
  timestamp: Date;
  details: string;
}

export interface IComplianceConfig extends Document {
  organizationId: string;
  userId?: string;

  // SOC2
  soc2Enabled: boolean;
  auditLogging: boolean;
  encryptionAtRest: boolean;
  accessControl: boolean;
  incidentResponsePlan: boolean;

  // HIPAA
  hipaaMode: boolean;
  piiEncryption: boolean;
  accessAuditTrail: boolean;
  dataMinimization: boolean;
  breachNotificationPlan: boolean;

  // GDPR
  gdprConsent: boolean;
  rightToErasure: boolean;
  dataPortability: boolean;
  cookieConsent: boolean;
  dpaGenerated: boolean;

  // General
  dataResidency: 'US' | 'EU' | 'APAC';
  retentionDays: number;
  ipWhitelist: string[];
  mfaRequired: boolean;

  // Scores
  complianceScore: number;
  soc2Score: number;
  hipaaScore: number;
  gdprScore: number;

  // Audit
  lastAuditDate?: Date;
  nextAuditDate?: Date;
  auditLog: IAuditLogEntry[];

  // Legacy compat
  piiFields: string[];
  lastAuditExport?: Date;
  dpaGeneratedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const AuditLogEntrySchema = new Schema<IAuditLogEntry>(
  {
    action: { type: String, required: true },
    user: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    details: { type: String, default: '' },
  },
  { _id: false }
);

const ComplianceConfigSchema = new Schema<IComplianceConfig>(
  {
    organizationId: { type: String, required: true, unique: true },
    userId: { type: String },

    // SOC2
    soc2Enabled: { type: Boolean, default: false },
    auditLogging: { type: Boolean, default: false },
    encryptionAtRest: { type: Boolean, default: false },
    accessControl: { type: Boolean, default: true },
    incidentResponsePlan: { type: Boolean, default: false },

    // HIPAA
    hipaaMode: { type: Boolean, default: false },
    piiEncryption: { type: Boolean, default: false },
    accessAuditTrail: { type: Boolean, default: false },
    dataMinimization: { type: Boolean, default: false },
    breachNotificationPlan: { type: Boolean, default: false },

    // GDPR
    gdprConsent: { type: Boolean, default: false },
    rightToErasure: { type: Boolean, default: false },
    dataPortability: { type: Boolean, default: false },
    cookieConsent: { type: Boolean, default: false },
    dpaGenerated: { type: Boolean, default: false },

    // General
    dataResidency: { type: String, enum: ['US', 'EU', 'APAC'], default: 'US' },
    retentionDays: { type: Number, default: 365 },
    ipWhitelist: { type: [String], default: [] },
    mfaRequired: { type: Boolean, default: false },

    // Scores (auto-calculated, stored for quick retrieval)
    complianceScore: { type: Number, default: 0 },
    soc2Score: { type: Number, default: 0 },
    hipaaScore: { type: Number, default: 0 },
    gdprScore: { type: Number, default: 0 },

    // Audit timeline
    lastAuditDate: { type: Date },
    nextAuditDate: { type: Date },
    auditLog: { type: [AuditLogEntrySchema], default: [] },

    // Legacy compat
    piiFields: { type: [String], default: ['email', 'phone', 'name', 'address'] },
    lastAuditExport: { type: Date },
    dpaGeneratedAt: { type: Date },
  },
  { timestamps: true }
);

const ComplianceConfig: Model<IComplianceConfig> =
  mongoose.models.ComplianceConfig || mongoose.model<IComplianceConfig>('ComplianceConfig', ComplianceConfigSchema);

export default ComplianceConfig;
