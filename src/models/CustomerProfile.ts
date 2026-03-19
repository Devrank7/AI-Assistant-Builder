/**
 * Customer Profile Model
 *
 * Persistent identity for website visitors across sessions.
 * Links anonymous visitorId (cookie) with real identity (email, phone, name).
 * Stores extracted facts, sentiment, tags, and engagement metrics.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICustomerFact {
  key: string; // e.g. "preferred_service", "budget", "location"
  value: string;
  source: 'conversation' | 'form' | 'manual' | 'integration';
  confidence: number; // 0-1
  extractedAt: Date;
}

export interface ICustomerEvent {
  type: 'page_view' | 'chat_start' | 'lead_submitted' | 'purchase' | 'booking' | 'handoff' | 'feedback';
  data?: Record<string, unknown>;
  channel: 'website' | 'telegram' | 'whatsapp' | 'instagram';
  timestamp: Date;
}

export interface ICustomerProfile extends Document {
  clientId: string; // Which widget/business this customer belongs to
  visitorId: string; // Cookie-based anonymous ID
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;

  // Identity linking
  telegramChatId?: string;
  whatsappNumber?: string;
  instagramUserId?: string;

  // AI-extracted facts (Mem0-like)
  facts: ICustomerFact[];

  // Tags (manual or auto-assigned)
  tags: string[];

  // Sentiment tracking
  sentiment: {
    current: 'positive' | 'neutral' | 'negative' | 'unknown';
    score: number; // -1 to 1
    history: Array<{ score: number; timestamp: Date }>;
  };

  // Engagement metrics
  visitCount: number;
  messageCount: number;
  lastActiveAt: Date;
  firstSeenAt: Date;
  sessionsIds: string[];

  // Revenue attribution
  totalRevenue: number; // USD
  lifetimeValue: number; // Predicted LTV
  revenueEvents: Array<{
    amount: number;
    currency: string;
    type: 'purchase' | 'booking' | 'subscription';
    source: string;
    timestamp: Date;
  }>;

  // Conversation intelligence
  buyingSignals: number; // 0-100 score
  churnRisk: number; // 0-100 score
  topIntents: string[];

  // Persona assignment
  assignedPersona?: string;

  createdAt: Date;
  updatedAt: Date;
}

const CustomerFactSchema = new Schema(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
    source: { type: String, enum: ['conversation', 'form', 'manual', 'integration'], default: 'conversation' },
    confidence: { type: Number, default: 0.8, min: 0, max: 1 },
    extractedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CustomerEventSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['page_view', 'chat_start', 'lead_submitted', 'purchase', 'booking', 'handoff', 'feedback'],
      required: true,
    },
    data: { type: Schema.Types.Mixed },
    channel: { type: String, enum: ['website', 'telegram', 'whatsapp', 'instagram'], default: 'website' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CustomerProfileSchema = new Schema<ICustomerProfile>(
  {
    clientId: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    name: String,
    email: { type: String, index: true, sparse: true },
    phone: { type: String, index: true, sparse: true },
    avatar: String,

    telegramChatId: { type: String, sparse: true },
    whatsappNumber: { type: String, sparse: true },
    instagramUserId: { type: String, sparse: true },

    facts: [CustomerFactSchema],
    tags: [{ type: String }],

    sentiment: {
      current: { type: String, enum: ['positive', 'neutral', 'negative', 'unknown'], default: 'unknown' },
      score: { type: Number, default: 0, min: -1, max: 1 },
      history: [{ score: Number, timestamp: { type: Date, default: Date.now } }],
    },

    visitCount: { type: Number, default: 1 },
    messageCount: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
    firstSeenAt: { type: Date, default: Date.now },
    sessionsIds: [String],

    totalRevenue: { type: Number, default: 0 },
    lifetimeValue: { type: Number, default: 0 },
    revenueEvents: [
      {
        amount: { type: Number, required: true },
        currency: { type: String, default: 'USD' },
        type: { type: String, enum: ['purchase', 'booking', 'subscription'] },
        source: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],

    buyingSignals: { type: Number, default: 0, min: 0, max: 100 },
    churnRisk: { type: Number, default: 0, min: 0, max: 100 },
    topIntents: [String],

    assignedPersona: String,
  },
  { timestamps: true }
);

// Compound indexes
CustomerProfileSchema.index({ clientId: 1, visitorId: 1 }, { unique: true });
CustomerProfileSchema.index({ clientId: 1, email: 1 }, { sparse: true });
CustomerProfileSchema.index({ clientId: 1, lastActiveAt: -1 });
CustomerProfileSchema.index({ clientId: 1, buyingSignals: -1 });
CustomerProfileSchema.index({ clientId: 1, totalRevenue: -1 });

const CustomerProfile: Model<ICustomerProfile> =
  mongoose.models.CustomerProfile || mongoose.model<ICustomerProfile>('CustomerProfile', CustomerProfileSchema);

export default CustomerProfile;
