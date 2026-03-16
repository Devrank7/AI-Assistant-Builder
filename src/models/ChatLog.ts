import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatLog extends Document {
  clientId: string;
  sessionId: string;
  messages: IChatMessage[];
  metadata: {
    userAgent?: string;
    ip?: string;
    page?: string;
    channel?: 'website' | 'telegram' | 'whatsapp' | 'instagram';
  };
  variantId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const ChatLogSchema = new Schema(
  {
    clientId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    messages: [ChatMessageSchema],
    metadata: {
      userAgent: String,
      ip: String,
      page: String,
      channel: { type: String, enum: ['website', 'telegram', 'whatsapp', 'instagram'], default: 'website' },
    },
    variantId: { type: String, default: null, index: true },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
ChatLogSchema.index({ clientId: 1, createdAt: -1 });
ChatLogSchema.index({ clientId: 1, sessionId: 1 });

// TTL index: auto-delete chat logs after 365 days (GDPR data retention)
ChatLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default mongoose.models.ChatLog || mongoose.model<IChatLog>('ChatLog', ChatLogSchema);
