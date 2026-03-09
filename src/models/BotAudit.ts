import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBotAudit extends Document {
  eventType: string;
  action: string;
  status: 'info' | 'success' | 'warning' | 'error';
  details: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const BotAuditSchema = new Schema<IBotAudit>(
  {
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info',
      index: true,
    },
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete after 30 days
BotAuditSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
BotAuditSchema.index({ eventType: 1, createdAt: -1 });

const BotAudit: Model<IBotAudit> = mongoose.models.BotAudit || mongoose.model<IBotAudit>('BotAudit', BotAuditSchema);

export default BotAudit;
