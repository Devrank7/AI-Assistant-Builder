import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IInstagramConfig extends Document {
  systemPrompt: string;
  pageAccessToken: string;
  pageId: string;
  isActive: boolean;
  aiModel: string;
  temperature: number;
  maxTokens: number;
  processingMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

const InstagramConfigSchema = new Schema<IInstagramConfig>(
  {
    systemPrompt: {
      type: String,
      required: true,
      default:
        'You are a helpful AI assistant responding to Instagram direct messages. Be friendly, concise, and helpful.',
    },
    pageAccessToken: {
      type: String,
      default: '',
    },
    pageId: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    aiModel: {
      type: String,
      default: 'gemini-3-flash-preview',
    },
    temperature: {
      type: Number,
      default: 0.7,
      min: 0,
      max: 1,
    },
    maxTokens: {
      type: Number,
      default: 1024,
    },
    processingMessage: {
      type: String,
      default: 'Секунду, обрабатываю...',
    },
  },
  { timestamps: true }
);

const InstagramConfig: Model<IInstagramConfig> =
  mongoose.models.InstagramConfig || mongoose.model<IInstagramConfig>('InstagramConfig', InstagramConfigSchema);

export default InstagramConfig;
