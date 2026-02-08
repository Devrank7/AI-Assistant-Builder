import mongoose, { Schema, Document, Model } from 'mongoose';

export type TriggerType = 'time_on_page' | 'scroll_depth' | 'exit_intent' | 'url_match' | 'inactivity';

export interface ITriggerConfig {
  delayMs?: number;
  scrollPercent?: number;
  urlPattern?: string;
  message: string;
}

export interface IProactiveTrigger extends Document {
  clientId: string;
  triggerType: TriggerType;
  config: ITriggerConfig;
  isActive: boolean;
  priority: number;
  maxShowsPerSession: number;
  cooldownMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProactiveTriggerSchema = new Schema<IProactiveTrigger>(
  {
    clientId: { type: String, required: true, index: true },
    triggerType: {
      type: String,
      enum: ['time_on_page', 'scroll_depth', 'exit_intent', 'url_match', 'inactivity'],
      required: true,
    },
    config: {
      delayMs: { type: Number },
      scrollPercent: { type: Number },
      urlPattern: { type: String },
      message: { type: String, required: true },
    },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    maxShowsPerSession: { type: Number, default: 1 },
    cooldownMinutes: { type: Number, default: 30 },
  },
  { timestamps: true }
);

ProactiveTriggerSchema.index({ clientId: 1, isActive: 1 });

const ProactiveTrigger: Model<IProactiveTrigger> =
  mongoose.models.ProactiveTrigger || mongoose.model<IProactiveTrigger>('ProactiveTrigger', ProactiveTriggerSchema);

export default ProactiveTrigger;
