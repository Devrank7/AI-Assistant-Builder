import mongoose, { Schema, Document, Model } from 'mongoose';

export type NotificationType =
  | 'new_client'
  | 'payment_success'
  | 'payment_failed'
  | 'cost_warning'
  | 'cost_blocked'
  | 'trial_ending'
  | 'trial_expired'
  | 'widget_error'
  | 'system_alert'
  | 'ab_test_result'
  | 'knowledge_gap'
  | 'team_invite'
  | 'widget_deployed';

export interface INotification extends Document {
  type: NotificationType;
  userId?: string | null;
  title: string;
  message: string;
  isRead: boolean;
  targetId?: string; // clientId if relevant
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    targetId: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// TTL index: auto-delete after 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
NotificationSchema.index({ isRead: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
