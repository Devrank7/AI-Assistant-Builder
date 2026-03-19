/**
 * Conversation Insight Model
 *
 * Stores AI-analyzed insights from chat sessions:
 * - Intent classification
 * - Buying signals
 * - Competitor mentions
 * - Sentiment shifts
 * - Quality scores
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

export interface IConversationInsight extends Document {
  clientId: string;
  sessionId: string;
  visitorId?: string;
  type: InsightType;
  label: string; // e.g. "pricing_inquiry", "competitor:Intercom", "wants_booking"
  confidence: number; // 0-1
  details: string; // Human-readable description
  messageIndex?: number; // Which message triggered this insight
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const ConversationInsightSchema = new Schema<IConversationInsight>(
  {
    clientId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
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
      required: true,
    },
    label: { type: String, required: true },
    confidence: { type: Number, default: 0.8, min: 0, max: 1 },
    details: { type: String, default: '' },
    messageIndex: Number,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ConversationInsightSchema.index({ clientId: 1, type: 1, createdAt: -1 });
ConversationInsightSchema.index({ clientId: 1, createdAt: -1 });

const ConversationInsight: Model<IConversationInsight> =
  mongoose.models.ConversationInsight ||
  mongoose.model<IConversationInsight>('ConversationInsight', ConversationInsightSchema);

export default ConversationInsight;
