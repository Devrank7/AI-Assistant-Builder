import mongoose, { Schema, Document, Model } from 'mongoose';

export type HandoffStatus = 'pending' | 'active' | 'resolved';
export type HandoffChannel = 'website' | 'telegram' | 'whatsapp' | 'instagram';

export interface IHandoff extends Document {
  clientId: string;
  sessionId: string;
  channel: HandoffChannel;
  status: HandoffStatus;
  customerName?: string;
  customerContact?: string;
  reason?: string;
  lastCustomerMessage?: string;
  assignedTo?: string;
  requestedAt: Date;
  assignedAt?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const HandoffSchema = new Schema<IHandoff>(
  {
    clientId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    channel: {
      type: String,
      enum: ['website', 'telegram', 'whatsapp', 'instagram'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'active', 'resolved'],
      default: 'pending',
    },
    customerName: String,
    customerContact: String,
    reason: String,
    lastCustomerMessage: String,
    assignedTo: String,
    requestedAt: { type: Date, default: Date.now },
    assignedAt: Date,
    resolvedAt: Date,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

HandoffSchema.index({ clientId: 1, status: 1 });
HandoffSchema.index({ clientId: 1, sessionId: 1 });

const Handoff: Model<IHandoff> = mongoose.models.Handoff || mongoose.model<IHandoff>('Handoff', HandoffSchema);

export default Handoff;
