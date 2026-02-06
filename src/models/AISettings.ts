import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAISettings extends Document {
  clientId: string;
  aiModel: string; // Gemini model ID (e.g. 'gemini-3-flash')
  systemPrompt: string;
  greeting: string;
  temperature: number;
  maxTokens: number;
  topK: number; // Number of knowledge chunks to retrieve
  createdAt: Date;
  updatedAt: Date;
}

const defaultSystemPrompt = `Ты полезный AI-ассистент. Отвечай вежливо и по существу.
Используй предоставленную информацию из базы знаний для ответов.
Если не знаешь ответа, честно скажи об этом.`;

const AISettingsSchema = new Schema<IAISettings>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    aiModel: {
      type: String,
      required: true,
      default: 'gemini-3-flash',
    },
    systemPrompt: {
      type: String,
      required: true,
      default: defaultSystemPrompt,
    },
    greeting: {
      type: String,
      required: true,
      default: 'Привет! Чем могу помочь?',
    },
    temperature: {
      type: Number,
      required: true,
      default: 0.7,
      min: 0,
      max: 1,
    },
    maxTokens: {
      type: Number,
      required: true,
      default: 1024,
    },
    topK: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
      max: 10,
    },
  },
  {
    timestamps: true,
  }
);

const AISettings: Model<IAISettings> =
  mongoose.models.AISettings || mongoose.model<IAISettings>('AISettings', AISettingsSchema);

export default AISettings;
export { defaultSystemPrompt };
