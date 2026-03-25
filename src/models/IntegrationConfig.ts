// src/models/IntegrationConfig.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IIntegrationConfigAction {
  id: string;
  name: string;
  description: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  headers?: Record<string, string>;
  bodyTemplate?: unknown;
  queryTemplate?: Record<string, string>;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
  responseMapping?: {
    successField?: string;
    dataField?: string;
    errorField?: string;
  };
}

export interface IIntegrationConfig extends Document {
  userId: string;
  clientId: string;
  provider: string;
  displayName: string;
  auth: {
    type:
      | 'api_key'
      | 'bearer'
      | 'basic'
      | 'none'
      | 'oauth2_service_account'
      | 'oauth2_auth_code'
      | 'oauth2_client_credentials';
    credentials: string;
    headerName?: string;
    headerPrefix?: string;
    authValueField?: string;
    scopes?: string[];
    tokenUrl?: string;
  };
  baseUrl: string;
  actions: IIntegrationConfigAction[];
  config: Record<string, unknown>;
  systemPromptAddition?: string;
  status: 'draft' | 'tested' | 'active' | 'inactive' | 'error';
  lastTestResult?: {
    success: boolean;
    response?: unknown;
    error?: string;
    timestamp: Date;
  };
  consecutiveFailures: number;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationConfigActionSchema = new Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    method: { type: String, enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], required: true },
    path: { type: String, required: true },
    headers: { type: Schema.Types.Mixed },
    bodyTemplate: { type: Schema.Types.Mixed },
    queryTemplate: { type: Schema.Types.Mixed },
    inputSchema: {
      type: {
        type: String,
        default: 'object',
      },
      properties: { type: Schema.Types.Mixed, default: {} },
      required: { type: [String], default: [] },
    },
    responseMapping: {
      successField: String,
      dataField: String,
      errorField: String,
    },
  },
  { _id: false }
);

const IntegrationConfigSchema = new Schema<IIntegrationConfig>(
  {
    userId: { type: String, required: true, index: true },
    clientId: { type: String, required: true },
    provider: { type: String, required: true },
    displayName: { type: String, required: true },
    auth: {
      type: {
        type: String,
        enum: [
          'api_key',
          'bearer',
          'basic',
          'none',
          'oauth2_service_account',
          'oauth2_auth_code',
          'oauth2_client_credentials',
        ],
        required: true,
      },
      credentials: { type: String, required: true },
      headerName: String,
      headerPrefix: String,
      authValueField: String,
      scopes: { type: [String], default: undefined },
      tokenUrl: String,
    },
    baseUrl: { type: String, required: true },
    actions: { type: [IntegrationConfigActionSchema], required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    systemPromptAddition: String,
    status: {
      type: String,
      enum: ['draft', 'tested', 'active', 'inactive', 'error'],
      default: 'draft',
    },
    lastTestResult: {
      success: Boolean,
      response: Schema.Types.Mixed,
      error: String,
      timestamp: Date,
    },
    consecutiveFailures: { type: Number, default: 0 },
  },
  { timestamps: true }
);

IntegrationConfigSchema.index({ userId: 1, clientId: 1, provider: 1 }, { unique: true });
IntegrationConfigSchema.index({ clientId: 1, status: 1 });

export default mongoose.models.IntegrationConfig ||
  mongoose.model<IIntegrationConfig>('IntegrationConfig', IntegrationConfigSchema);
