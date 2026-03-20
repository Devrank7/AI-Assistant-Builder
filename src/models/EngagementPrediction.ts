import mongoose, { Schema, Document, Model } from 'mongoose';

export type SignalType = 'scroll_depth' | 'time_on_page' | 'mouse_idle' | 'tab_switch' | 'rapid_scroll';

export interface ISignal {
  type: SignalType;
  value: number;
  weight: number;
}

export interface IEngagementPrediction extends Document {
  clientId: string;
  visitorId: string;
  sessionId: string;
  exitProbability: number;
  engagementScore: number;
  signals: ISignal[];
  recommendedAction: 'nudge' | 'offer' | 'none';
  nudgeMessage?: string;
  predictedAt: Date;
  wasAccurate?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SignalSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['scroll_depth', 'time_on_page', 'mouse_idle', 'tab_switch', 'rapid_scroll'],
      required: true,
    },
    value: { type: Number, required: true },
    weight: { type: Number, required: true },
  },
  { _id: false }
);

const EngagementPredictionSchema = new Schema(
  {
    clientId: { type: String, required: true },
    visitorId: { type: String, required: true },
    sessionId: { type: String, required: true },
    exitProbability: { type: Number, required: true, min: 0, max: 1 },
    engagementScore: { type: Number, required: true, min: 0, max: 100 },
    signals: { type: [SignalSchema], default: [] },
    recommendedAction: {
      type: String,
      enum: ['nudge', 'offer', 'none'],
      default: 'none',
    },
    nudgeMessage: { type: String },
    predictedAt: { type: Date, default: Date.now },
    wasAccurate: { type: Boolean },
  },
  { timestamps: true }
);

EngagementPredictionSchema.index({ clientId: 1, visitorId: 1 });

const EngagementPrediction: Model<IEngagementPrediction> =
  mongoose.models.EngagementPrediction ||
  mongoose.model<IEngagementPrediction>('EngagementPrediction', EngagementPredictionSchema);

export default EngagementPrediction;
