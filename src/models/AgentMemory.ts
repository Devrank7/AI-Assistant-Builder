/**
 * Agent Memory Model
 *
 * Stores per-visitor, per-persona memory for continuity across sessions.
 * Tracks extracted facts, conversation summaries, and interaction counts.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgentMemoryFact {
  key: string;
  value: string;
  confidence: number;
  extractedAt: Date;
}

export interface IAgentMemory extends Document {
  clientId: string;
  personaId: string;
  sessionId: string;
  visitorId: string;
  facts: IAgentMemoryFact[];
  conversationSummary: string;
  lastInteraction: Date;
  interactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const AgentMemoryFactSchema = new Schema<IAgentMemoryFact>(
  {
    key: { type: String, required: true },
    value: { type: String, required: true },
    confidence: { type: Number, default: 0.8, min: 0, max: 1 },
    extractedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AgentMemorySchema = new Schema<IAgentMemory>(
  {
    clientId: { type: String, required: true, index: true },
    personaId: { type: String, default: 'default', index: true },
    sessionId: { type: String, default: '' },
    visitorId: { type: String, required: true, index: true },
    facts: { type: [AgentMemoryFactSchema], default: [] },
    conversationSummary: { type: String, default: '' },
    lastInteraction: { type: Date, default: Date.now },
    interactionCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

AgentMemorySchema.index({ clientId: 1, visitorId: 1, personaId: 1 }, { unique: true });

const AgentMemory: Model<IAgentMemory> =
  mongoose.models.AgentMemory || mongoose.model<IAgentMemory>('AgentMemory', AgentMemorySchema);

export default AgentMemory;
