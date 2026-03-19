/**
 * Outbound Campaign Model
 *
 * Proactive outbound: trigger-based messages, cart abandonment, re-engagement.
 * Campaigns can be one-time or recurring, targeting specific customer segments.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type CampaignTrigger =
  | 'cart_abandoned'
  | 'inactive_days'
  | 'page_visit'
  | 'lead_no_response'
  | 'post_purchase'
  | 'manual'
  | 'schedule';

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed';

export interface IOutboundCampaign extends Document {
  clientId: string;
  name: string;
  trigger: CampaignTrigger;
  triggerConfig: {
    inactiveDays?: number;
    pageUrl?: string;
    scheduleAt?: Date;
    delayMinutes?: number;
  };
  channel: 'website' | 'telegram' | 'whatsapp' | 'email' | 'all';
  messageTemplate: string;
  targetTags?: string[]; // Only send to customers with these tags
  excludeTags?: string[]; // Don't send to customers with these tags
  status: CampaignStatus;
  sentCount: number;
  openedCount: number;
  repliedCount: number;
  convertedCount: number;
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OutboundCampaignSchema = new Schema<IOutboundCampaign>(
  {
    clientId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    trigger: {
      type: String,
      enum: [
        'cart_abandoned',
        'inactive_days',
        'page_visit',
        'lead_no_response',
        'post_purchase',
        'manual',
        'schedule',
      ],
      required: true,
    },
    triggerConfig: {
      inactiveDays: Number,
      pageUrl: String,
      scheduleAt: Date,
      delayMinutes: Number,
    },
    channel: {
      type: String,
      enum: ['website', 'telegram', 'whatsapp', 'email', 'all'],
      default: 'website',
    },
    messageTemplate: { type: String, required: true },
    targetTags: [String],
    excludeTags: [String],
    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'completed'],
      default: 'draft',
    },
    sentCount: { type: Number, default: 0 },
    openedCount: { type: Number, default: 0 },
    repliedCount: { type: Number, default: 0 },
    convertedCount: { type: Number, default: 0 },
    lastSentAt: Date,
  },
  { timestamps: true }
);

OutboundCampaignSchema.index({ clientId: 1, status: 1 });

const OutboundCampaign: Model<IOutboundCampaign> =
  mongoose.models.OutboundCampaign || mongoose.model<IOutboundCampaign>('OutboundCampaign', OutboundCampaignSchema);

export default OutboundCampaign;
