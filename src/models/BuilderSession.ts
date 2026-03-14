import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBuilderMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type BuilderStatus = 'chatting' | 'building' | 'preview' | 'deployed';

export interface IBuilderSession extends Document {
  userId: string;
  messages: IBuilderMessage[];
  themeJson: Record<string, unknown> | null;
  clientId: string | null;
  status: BuilderStatus;
  widgetName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IBuilderMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const builderSessionSchema = new Schema<IBuilderSession>(
  {
    userId: { type: String, required: true, index: true },
    messages: [messageSchema],
    themeJson: { type: Schema.Types.Mixed, default: null },
    clientId: { type: String, default: null },
    status: {
      type: String,
      enum: ['chatting', 'building', 'preview', 'deployed'],
      default: 'chatting',
    },
    widgetName: { type: String, default: null },
  },
  { timestamps: true }
);

const BuilderSession: Model<IBuilderSession> =
  mongoose.models.BuilderSession || mongoose.model<IBuilderSession>('BuilderSession', builderSessionSchema);

export default BuilderSession;
