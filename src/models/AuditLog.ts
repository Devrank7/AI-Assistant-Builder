import mongoose, { Schema, Document, Model } from 'mongoose';

export type AuditAction =
  | 'client.create'
  | 'client.update'
  | 'client.delete'
  | 'client.suspend'
  | 'client.activate'
  | 'settings.update'
  | 'knowledge.upload'
  | 'knowledge.delete'
  | 'webhook.create'
  | 'webhook.delete'
  | 'payment.setup'
  | 'payment.cancel'
  | 'invoice.create'
  | 'export.data'
  | 'model.change'
  | 'admin.login';

export interface IAuditLog extends Document {
  actor: string; // 'admin' | clientId
  actorType: 'admin' | 'client' | 'system';
  action: AuditAction;
  targetId?: string; // clientId or resource ID
  details: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  organizationId?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actor: {
      type: String,
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: ['admin', 'client', 'system'],
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ip: String,
    userAgent: String,
    organizationId: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete after 90 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
