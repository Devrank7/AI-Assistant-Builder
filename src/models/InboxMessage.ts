/**
 * Inbox Message Model
 *
 * Shared omnichannel inbox — unified view of all conversations across channels.
 * Each message maps to a conversation thread with AI-suggested replies.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type InboxStatus = 'open' | 'assigned' | 'resolved' | 'snoozed';
export type InboxPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface IInboxThread extends Document {
  clientId: string;
  sessionId: string;
  visitorId?: string;
  channel: 'website' | 'telegram' | 'whatsapp' | 'instagram';
  status: InboxStatus;
  priority: InboxPriority;
  assignedTo?: string; // userId of assigned agent
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageRole: 'user' | 'assistant' | 'agent';
  messageCount: number;
  unreadCount: number;
  aiSuggestedReply?: string;
  tags: string[];
  snoozedUntil?: Date;
  resolvedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const InboxThreadSchema = new Schema<IInboxThread>(
  {
    clientId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    visitorId: String,
    channel: {
      type: String,
      enum: ['website', 'telegram', 'whatsapp', 'instagram'],
      required: true,
    },
    status: {
      type: String,
      enum: ['open', 'assigned', 'resolved', 'snoozed'],
      default: 'open',
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    assignedTo: String,
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
    lastMessageRole: { type: String, enum: ['user', 'assistant', 'agent'], default: 'user' },
    messageCount: { type: Number, default: 0 },
    unreadCount: { type: Number, default: 0 },
    aiSuggestedReply: String,
    tags: [String],
    snoozedUntil: Date,
    resolvedAt: Date,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

InboxThreadSchema.index({ clientId: 1, status: 1, lastMessageAt: -1 });
InboxThreadSchema.index({ clientId: 1, sessionId: 1 }, { unique: true });
InboxThreadSchema.index({ clientId: 1, channel: 1, status: 1 });
InboxThreadSchema.index({ clientId: 1, assignedTo: 1, status: 1 });

const InboxThread: Model<IInboxThread> =
  mongoose.models.InboxThread || mongoose.model<IInboxThread>('InboxThread', InboxThreadSchema);

export default InboxThread;
