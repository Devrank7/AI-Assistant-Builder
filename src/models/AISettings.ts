import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAISettings extends Document {
  clientId: string;
  aiModel: string; // Gemini model ID (e.g. 'gemini-3-flash')
  systemPrompt: string;
  greeting: string;
  temperature: number;
  maxTokens: number;
  topK: number; // Number of knowledge chunks to retrieve
  handoffEnabled: boolean; // Enable "Handoff to Human" feature
  actionsEnabled: boolean; // Enable AI actions (tool use) in widget chat
  actionsSystemPrompt: string; // Custom instructions for action behavior
  maxActionsPerSession: number; // Rate limit: max tool calls per chat session
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
      default: 'gemini-3-flash-preview',
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
      default: 8196,
    },
    topK: {
      type: Number,
      required: true,
      default: 3,
      min: 1,
      max: 10,
    },
    handoffEnabled: {
      type: Boolean,
      default: false,
    },
    actionsEnabled: {
      type: Boolean,
      default: false,
    },
    actionsSystemPrompt: {
      type: String,
      default: '',
    },
    maxActionsPerSession: {
      type: Number,
      default: 10,
      min: 1,
      max: 50,
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
