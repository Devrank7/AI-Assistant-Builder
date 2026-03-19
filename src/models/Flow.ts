import mongoose, { Schema, Document, Model } from 'mongoose';

export type FlowStatus = 'active' | 'paused' | 'draft';
export type ConditionOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
export type FlowActionType =
  | 'send_message'
  | 'send_notification'
  | 'add_tag'
  | 'remove_tag'
  | 'change_score'
  | 'assign_operator';

export interface IFlowCondition {
  field: string;
  operator: ConditionOperator;
  value: string | number;
}

export interface IFlowStep {
  type: 'action' | 'delay';
  action?: FlowActionType;
  config: Record<string, unknown>;
  delayMinutes?: number;
}

export interface IFlow extends Document {
  flowId: string;
  clientId: string;
  userId: string;
  name: string;
  status: FlowStatus;
  trigger: {
    type: string;
    conditions: IFlowCondition[];
  };
  steps: IFlowStep[];
  templateId: string | null;
  stats: {
    timesTriggered: number;
    lastTriggeredAt: Date | null;
  };
  createdAt: Date;
  updatedAt: Date;
}

const FlowSchema = new Schema<IFlow>(
  {
    flowId: { type: String, required: true, unique: true },
    clientId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, enum: ['active', 'paused', 'draft'], default: 'draft' },
    trigger: {
      type: { type: String, required: true },
      conditions: [
        {
          field: { type: String, required: true },
          operator: { type: String, enum: ['eq', 'neq', 'gt', 'lt', 'contains'], required: true },
          value: { type: Schema.Types.Mixed, required: true },
        },
      ],
    },
    steps: [
      {
        type: { type: String, enum: ['action', 'delay'], required: true },
        action: {
          type: String,
          enum: ['send_message', 'send_notification', 'add_tag', 'remove_tag', 'change_score', 'assign_operator'],
        },
        config: { type: Schema.Types.Mixed, default: {} },
        delayMinutes: { type: Number },
      },
    ],
    templateId: { type: String, default: null },
    stats: {
      timesTriggered: { type: Number, default: 0 },
      lastTriggeredAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

FlowSchema.index({ clientId: 1, status: 1 });
FlowSchema.index({ 'trigger.type': 1, status: 1 });

const Flow: Model<IFlow> = mongoose.models.Flow || mongoose.model<IFlow>('Flow', FlowSchema);
export default Flow;
