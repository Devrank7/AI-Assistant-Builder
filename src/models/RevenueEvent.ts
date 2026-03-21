/**
 * Revenue Event Model
 *
 * Tracks the full attribution funnel:
 * visitor → chat → lead → booking/purchase → revenue
 *
 * Enables ROI tracking for each widget.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type RevenueFunnelStage = 'visit' | 'chat_started' | 'lead_captured' | 'booking_made' | 'payment_completed';

export interface IRevenueEvent extends Document {
  clientId: string;
  visitorId: string;
  sessionId: string;
  stage: RevenueFunnelStage;
  amount?: number; // Only for payment_completed
  currency: string;
  source: string; // 'widget', 'telegram', 'whatsapp', 'instagram', 'stripe', 'manual'
  integrationSlug?: string; // e.g. 'stripe', 'liqpay'
  externalId?: string; // Stripe payment ID, booking ID, etc.
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const RevenueEventSchema = new Schema<IRevenueEvent>(
  {
    clientId: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    stage: {
      type: String,
      enum: ['visit', 'chat_started', 'lead_captured', 'booking_made', 'payment_completed'],
      required: true,
    },
    amount: Number,
    currency: { type: String, default: 'USD' },
    source: { type: String, required: true, default: 'widget' },
    integrationSlug: String,
    externalId: String,
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

RevenueEventSchema.index({ clientId: 1, stage: 1, createdAt: -1 });
RevenueEventSchema.index({ clientId: 1, visitorId: 1, createdAt: -1 });
RevenueEventSchema.index({ clientId: 1, createdAt: -1 });

const RevenueEvent: Model<IRevenueEvent> =
  mongoose.models.RevenueEvent || mongoose.model<IRevenueEvent>('RevenueEvent', RevenueEventSchema);

export default RevenueEvent;
