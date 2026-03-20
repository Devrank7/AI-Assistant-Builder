import mongoose, { Schema, Document, Model } from 'mongoose';

export type SSOProtocol = 'saml' | 'oidc';

export interface ISSOConfig extends Document {
  organizationId: string;
  protocol: SSOProtocol;
  provider: string;
  // SAML fields
  entryPoint: string | null;
  issuer: string | null;
  cert: string | null;
  // OIDC fields
  clientId: string | null;
  clientSecret: string | null;
  discoveryUrl: string | null;
  // General settings
  autoProvision: boolean;
  defaultRole: string;
  allowedDomains: string[];
  enforceSSO: boolean;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SSOConfigSchema = new Schema<ISSOConfig>(
  {
    organizationId: { type: String, required: true, unique: true, index: true },
    protocol: { type: String, enum: ['saml', 'oidc'], required: true, default: 'saml' },
    provider: { type: String, default: 'custom' },
    // SAML
    entryPoint: { type: String, default: null },
    issuer: { type: String, default: null },
    cert: { type: String, default: null },
    // OIDC
    clientId: { type: String, default: null },
    clientSecret: { type: String, default: null },
    discoveryUrl: { type: String, default: null },
    // Settings
    autoProvision: { type: Boolean, default: true },
    defaultRole: { type: String, default: 'viewer' },
    allowedDomains: { type: [String], default: [] },
    enforceSSO: { type: Boolean, default: false },
    enabled: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const SSOConfig: Model<ISSOConfig> =
  mongoose.models.SSOConfig || mongoose.model<ISSOConfig>('SSOConfig', SSOConfigSchema);

export default SSOConfig;
