import mongoose, { Schema, Document, Model } from 'mongoose';

export type WebhookEvent =
  | 'new_chat'
  | 'new_lead'
  | 'widget_error'
  | 'cost_threshold'
  | 'payment_success'
  | 'payment_failed'
  | 'lead_captured'
  | 'chat_started'
  | 'handoff_requested'
  | 'knowledge_gap_detected'
  | 'widget_feedback'
  | 'appointment_booked';

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  'new_chat',
  'new_lead',
  'widget_error',
  'cost_threshold',
  'payment_success',
  'payment_failed',
  'lead_captured',
  'chat_started',
  'handoff_requested',
  'knowledge_gap_detected',
  'widget_feedback',
  'appointment_booked',
];

export interface IWebhook extends Document {
  clientId: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  isActive: boolean;
  lastTriggered: Date | null;
  failureCount: number;
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
  organizationId?: string;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    clientId: {
      type: String,
      required: true,
      index: true,
    },
    url: {
      type: String,
      required: true,
    },
    events: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length > 0,
        message: 'At least one event is required',
      },
    },
    secret: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    userId: { type: String, index: true },
    organizationId: { type: String, index: true },
  },
  {
    timestamps: true,
  }
);

WebhookSchema.index({ clientId: 1, isActive: 1 });

const Webhook: Model<IWebhook> = mongoose.models.Webhook || mongoose.model<IWebhook>('Webhook', WebhookSchema);

export default Webhook;
