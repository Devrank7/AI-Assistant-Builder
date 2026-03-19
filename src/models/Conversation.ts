import mongoose, { Schema, Document, Model } from 'mongoose';

export type ConversationStatus = 'bot' | 'handoff' | 'assigned' | 'resolved' | 'closed';
export type HandoffReason = 'low_confidence' | 'negative_sentiment' | 'user_request' | 'high_value';
export type MessageSender = 'visitor' | 'bot' | 'operator';

export interface IConversation extends Document {
  conversationId: string;
  clientId: string;
  contactId: string;
  sessionId: string;
  channel: string;
  status: ConversationStatus;
  assignedTo: string | null;
  handoffReason: HandoffReason | null;
  lastMessage: {
    text: string;
    sender: MessageSender;
    timestamp: Date;
  };
  unreadCount: number;
  aiSuggestedReply: string | null;
  metadata: {
    pageUrl?: string;
    userAgent?: string;
    ip?: string;
    referrer?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    conversationId: { type: String, required: true, unique: true },
    clientId: { type: String, required: true, index: true },
    contactId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    channel: { type: String, required: true, enum: ['web', 'telegram', 'whatsapp', 'instagram'] },
    status: {
      type: String,
      required: true,
      enum: ['bot', 'handoff', 'assigned', 'resolved', 'closed'],
      default: 'bot',
    },
    assignedTo: { type: String, default: null },
    handoffReason: {
      type: String,
      enum: ['low_confidence', 'negative_sentiment', 'user_request', 'high_value', null],
      default: null,
    },
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: String, enum: ['visitor', 'bot', 'operator'], default: 'visitor' },
      timestamp: { type: Date, default: Date.now },
    },
    unreadCount: { type: Number, default: 0 },
    aiSuggestedReply: { type: String, default: null },
    metadata: {
      pageUrl: String,
      userAgent: String,
      ip: String,
      referrer: String,
    },
  },
  { timestamps: true }
);

ConversationSchema.index({ clientId: 1, status: 1 });
ConversationSchema.index({ assignedTo: 1, status: 1 });

const Conversation: Model<IConversation> =
  mongoose.models.Conversation || mongoose.model<IConversation>('Conversation', ConversationSchema);
export default Conversation;
