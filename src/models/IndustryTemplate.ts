/**
 * Industry Template Model
 *
 * Pre-built configurations for specific industries.
 * Includes: system prompt, greeting, quick replies, knowledge seeds, persona presets,
 * recommended integrations, and design suggestions.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IIndustryTemplate extends Document {
  slug: string; // "dental", "beauty_salon", "restaurant", "real_estate", "auto_service"
  name: string;
  nameRu: string;
  icon: string; // emoji
  description: string;
  descriptionRu: string;

  // AI Config presets
  systemPrompt: string;
  greeting: string;
  greetingRu: string;
  quickReplies: string[];
  quickRepliesRu: string[];
  temperature: number;

  // Knowledge seed topics
  knowledgeTopics: string[]; // What to ask client about: "services", "pricing", "hours", "team"

  // Persona presets
  personas: Array<{
    name: string;
    role: string;
    tone: string;
    systemPromptOverlay: string;
  }>;

  // Recommended integrations
  recommendedIntegrations: string[]; // ["google_calendar", "stripe", "whatsapp"]

  // Design hints
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };

  // Proactive triggers
  proactiveTriggers: Array<{
    trigger: string;
    message: string;
    delaySeconds: number;
  }>;

  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const IndustryTemplateSchema = new Schema<IIndustryTemplate>(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameRu: { type: String, required: true },
    icon: { type: String, default: '🏢' },
    description: { type: String, default: '' },
    descriptionRu: { type: String, default: '' },

    systemPrompt: { type: String, required: true },
    greeting: { type: String, required: true },
    greetingRu: { type: String, required: true },
    quickReplies: [String],
    quickRepliesRu: [String],
    temperature: { type: Number, default: 0.7 },

    knowledgeTopics: [String],

    personas: [
      {
        name: String,
        role: String,
        tone: String,
        systemPromptOverlay: String,
      },
    ],

    recommendedIntegrations: [String],

    colorScheme: {
      primary: { type: String, default: '#3B82F6' },
      secondary: { type: String, default: '#1E40AF' },
      accent: { type: String, default: '#60A5FA' },
    },

    proactiveTriggers: [
      {
        trigger: String,
        message: String,
        delaySeconds: { type: Number, default: 5 },
      },
    ],

    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const IndustryTemplate: Model<IIndustryTemplate> =
  mongoose.models.IndustryTemplate || mongoose.model<IIndustryTemplate>('IndustryTemplate', IndustryTemplateSchema);

export default IndustryTemplate;
