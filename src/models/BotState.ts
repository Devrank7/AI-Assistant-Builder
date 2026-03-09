import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBotState extends Document {
  orchestratorRunning: boolean;
  sessionId: string;
  activeStages: Record<string, number>;
  lastUpdate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BotStateSchema = new Schema<IBotState>(
  {
    orchestratorRunning: {
      type: Boolean,
      default: false,
    },
    sessionId: {
      type: String,
      default: '',
    },
    activeStages: {
      type: Schema.Types.Mixed,
      default: {},
    },
    lastUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const BotState: Model<IBotState> = mongoose.models.BotState || mongoose.model<IBotState>('BotState', BotStateSchema);

export default BotState;
