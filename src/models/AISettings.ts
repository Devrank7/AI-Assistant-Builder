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
  emotionAIEnabled: boolean; // Enable real-time sentiment analysis & tone adaptation
  personasEnabled: boolean; // Enable AI persona switching
  commerceEnabled: boolean; // Enable in-chat commerce (product catalog, cart, payments)
  customerMemoryEnabled: boolean; // Enable persistent customer memory (Mem0-like)
  autoLearningEnabled: boolean; // Enable auto-learning from negative feedback
  industryTemplate?: string; // Industry template slug (e.g. 'dental', 'beauty_salon')
  createdAt: Date;
  updatedAt: Date;
}

const defaultSystemPrompt = `You are a helpful AI assistant. Reply politely and to the point.
Always respond in the same language the user writes in.
Use the provided knowledge base to answer questions.
If you don't know the answer, say so honestly.`;

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
      default: 'Hi there! How can I help?',
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
    emotionAIEnabled: {
      type: Boolean,
      default: false,
    },
    personasEnabled: {
      type: Boolean,
      default: false,
    },
    commerceEnabled: {
      type: Boolean,
      default: false,
    },
    customerMemoryEnabled: {
      type: Boolean,
      default: false,
    },
    autoLearningEnabled: {
      type: Boolean,
      default: false,
    },
    industryTemplate: {
      type: String,
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
