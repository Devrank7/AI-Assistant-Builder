import mongoose, { Schema, Document } from 'mongoose';

export interface IPendingAction extends Document {
  confirmId: string;
  tool: string;
  args: Record<string, unknown>;
  sessionId: string;
  widgetId: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const PendingActionSchema = new Schema<IPendingAction>(
  {
    confirmId: { type: String, required: true, unique: true, index: true },
    tool: { type: String, required: true },
    args: { type: Schema.Types.Mixed, required: true },
    sessionId: { type: String, required: true },
    widgetId: { type: String, required: true },
    userId: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// TTL index — MongoDB auto-deletes expired documents
PendingActionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PendingAction || mongoose.model<IPendingAction>('PendingAction', PendingActionSchema);
