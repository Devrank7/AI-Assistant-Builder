import mongoose, { Schema, Document, Model } from 'mongoose';

export type ApiKeyStatus = 'active' | 'revoked' | 'expired';
export type ApiKeyScope = 'read' | 'write' | 'admin';
export type ApiKeyEnvironment = 'live' | 'test';

export interface IApiKey extends Document {
  keyHash: string;
  keyPrefix: string;
  name: string;
  userId: string;
  organizationId: string;
  environment: ApiKeyEnvironment;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  rateLimit: number;
  ipWhitelist: string[];
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  totalRequests: number;
  createdAt: Date;
  updatedAt: Date;
}

const ApiKeySchema = new Schema<IApiKey>(
  {
    keyHash: { type: String, required: true, unique: true },
    keyPrefix: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    userId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    environment: { type: String, enum: ['live', 'test'], default: 'live' },
    scopes: { type: [String], enum: ['read', 'write', 'admin'], default: ['read'] },
    status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active' },
    rateLimit: { type: Number, default: 100 },
    ipWhitelist: { type: [String], default: [] },
    expiresAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    totalRequests: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const ApiKey: Model<IApiKey> = mongoose.models.ApiKey || mongoose.model<IApiKey>('ApiKey', ApiKeySchema);

export default ApiKey;
