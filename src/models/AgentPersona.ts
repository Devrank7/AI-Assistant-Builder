/**
 * Agent Persona Model
 *
 * Multiple AI personalities per widget.
 * Each persona has its own name, avatar, tone, expertise, and system prompt overlay.
 * Can be auto-switched by context (e.g., sales persona for pricing questions,
 * support persona for complaints).
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgentPersona extends Document {
  clientId: string;
  name: string; // e.g. "Sales Alex", "Support Maria"
  avatar?: string;
  role: string; // "sales" | "support" | "onboarding" | "billing" | "general"
  tone: string; // "friendly" | "professional" | "casual" | "formal"
  language?: string; // Override language for this persona
  systemPromptOverlay: string; // Appended to base system prompt
  triggerKeywords: string[]; // Keywords that activate this persona
  triggerIntents: string[]; // Intent labels that activate this persona
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgentPersonaSchema = new Schema<IAgentPersona>(
  {
    clientId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    avatar: String,
    role: { type: String, default: 'general' },
    tone: { type: String, default: 'friendly' },
    language: String,
    systemPromptOverlay: { type: String, default: '' },
    triggerKeywords: [String],
    triggerIntents: [String],
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

AgentPersonaSchema.index({ clientId: 1, isActive: 1 });

const AgentPersona: Model<IAgentPersona> =
  mongoose.models.AgentPersona || mongoose.model<IAgentPersona>('AgentPersona', AgentPersonaSchema);

export default AgentPersona;
