/**
 * Conversation Insight Model
 *
 * Stores AI-analyzed insights from chat sessions:
 * - Signal detection (buying, churn, competitor, complaints, etc.)
 * - Sentiment scoring
 * - Topic extraction
 * - Action items
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type InsightType =
  | 'intent'
  | 'buying_signal'
  | 'churn_indicator'
  | 'competitor_mention'
  | 'complaint'
  | 'feature_request'
  | 'positive_feedback'
  | 'escalation_needed'
  | 'upsell_opportunity';

export type SignalType =
  | 'buying_signal'
  | 'churn_risk'
  | 'competitor_mention'
  | 'complaint'
  | 'feature_request'
  | 'positive_feedback'
  | 'escalation_needed'
  | 'upsell_opportunity';

export interface ISignal {
  type: SignalType;
  confidence: number;
  text: string;
  timestamp?: Date;
}

export interface ISentiment {
  overall: number; // -1 to 1
  trend: 'improving' | 'declining' | 'stable';
}

export interface IConversationInsight extends Document {
  clientId: string;
  conversationId: string; // sessionId from ChatLog
  contactId?: string; // visitorId / contact
  signals: ISignal[];
  sentiment: ISentiment;
  topics: string[];
  summary: string;
  actionItems: string[];
  analyzedAt: Date;
  // Legacy fields (kept for backwards compatibility with existing data)
  sessionId?: string;
  visitorId?: string;
  type?: InsightType;
  label?: string;
  confidence?: number;
  details?: string;
  messageIndex?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SignalSchema = new Schema<ISignal>(
  {
    type: {
      type: String,
      enum: [
        'buying_signal',
        'churn_risk',
        'competitor_mention',
        'complaint',
        'feature_request',
        'positive_feedback',
        'escalation_needed',
        'upsell_opportunity',
      ],
      required: true,
    },
    confidence: { type: Number, default: 0.7, min: 0, max: 1 },
    text: { type: String, default: '' },
    timestamp: Date,
  },
  { _id: false }
);

const ConversationInsightSchema = new Schema<IConversationInsight>(
  {
    clientId: { type: String, required: true, index: true },
    conversationId: { type: String, required: true, index: true },
    contactId: { type: String, index: true },
    signals: [SignalSchema],
    sentiment: {
      overall: { type: Number, default: 0 },
      trend: { type: String, enum: ['improving', 'declining', 'stable'], default: 'stable' },
    },
    topics: [{ type: String }],
    summary: { type: String, default: '' },
    actionItems: [{ type: String }],
    analyzedAt: { type: Date, default: Date.now },
    // Legacy fields
    sessionId: { type: String, index: true },
    visitorId: { type: String, index: true },
    type: {
      type: String,
      enum: [
        'intent',
        'buying_signal',
        'churn_indicator',
        'competitor_mention',
        'complaint',
        'feature_request',
        'positive_feedback',
        'escalation_needed',
        'upsell_opportunity',
      ],
    },
    label: { type: String },
    confidence: { type: Number, default: 0.8, min: 0, max: 1 },
    details: { type: String, default: '' },
    messageIndex: Number,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ConversationInsightSchema.index({ clientId: 1, analyzedAt: -1 });
ConversationInsightSchema.index({ clientId: 1, createdAt: -1 });
ConversationInsightSchema.index({ clientId: 1, 'signals.type': 1, analyzedAt: -1 });
// Unique constraint: one insight record per conversation
ConversationInsightSchema.index({ clientId: 1, conversationId: 1 }, { unique: true, sparse: true });

const ConversationInsight: Model<IConversationInsight> =
  mongoose.models.ConversationInsight ||
  mongoose.model<IConversationInsight>('ConversationInsight', ConversationInsightSchema);

export default ConversationInsight;
