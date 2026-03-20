/**
 * Agent Routing Rule Model
 *
 * Defines conditions for automatically routing conversations
 * between AI agent personas. Supports intent, keyword, sentiment,
 * and handoff_request condition types.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export type ConditionType = 'intent' | 'keyword' | 'sentiment' | 'handoff_request';
export type ConditionOperator = 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals';
export type MatchMode = 'all' | 'any';

export interface IRoutingCondition {
  type: ConditionType;
  value: string;
  operator: ConditionOperator;
}

export interface IAgentRoutingRule extends Document {
  clientId: string;
  name: string;
  priority: number;
  fromPersonaId: string;
  toPersonaId: string;
  conditions: IRoutingCondition[];
  matchMode: MatchMode;
  isActive: boolean;
  handoffMessage: string;
  createdAt: Date;
  updatedAt: Date;
}

const RoutingConditionSchema = new Schema<IRoutingCondition>(
  {
    type: {
      type: String,
      enum: ['intent', 'keyword', 'sentiment', 'handoff_request'],
      required: true,
    },
    value: { type: String, required: true },
    operator: {
      type: String,
      enum: ['equals', 'contains', 'greater_than', 'less_than', 'not_equals'],
      default: 'contains',
    },
  },
  { _id: false }
);

const AgentRoutingRuleSchema = new Schema<IAgentRoutingRule>(
  {
    clientId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    priority: { type: Number, default: 0 },
    fromPersonaId: { type: String, default: '*' }, // '*' = any persona
    toPersonaId: { type: String, required: true },
    conditions: { type: [RoutingConditionSchema], default: [] },
    matchMode: { type: String, enum: ['all', 'any'], default: 'any' },
    isActive: { type: Boolean, default: true },
    handoffMessage: { type: String, default: '' },
  },
  { timestamps: true }
);

AgentRoutingRuleSchema.index({ clientId: 1, isActive: 1, priority: -1 });

const AgentRoutingRule: Model<IAgentRoutingRule> =
  mongoose.models.AgentRoutingRule || mongoose.model<IAgentRoutingRule>('AgentRoutingRule', AgentRoutingRuleSchema);

export default AgentRoutingRule;
