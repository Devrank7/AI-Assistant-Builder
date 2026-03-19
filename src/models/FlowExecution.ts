import mongoose, { Schema, Document, Model } from 'mongoose';
import type { IFlowStep } from './Flow';

export type ExecutionStatus = 'pending' | 'completed' | 'failed' | 'skipped';

export interface IFlowExecution extends Document {
  executionId: string;
  flowId: string;
  contactId: string;
  conversationId: string | null;
  trigger: { type: string; data: Record<string, unknown> };
  stepsExecuted: Array<{
    stepIndex: number;
    status: 'completed' | 'failed' | 'skipped';
    result?: string;
    timestamp: Date;
  }>;
  status: ExecutionStatus;
  scheduledAt: Date | null;
  remainingSteps: IFlowStep[];
  createdAt: Date;
}

const FlowExecutionSchema = new Schema<IFlowExecution>(
  {
    executionId: { type: String, required: true, unique: true },
    flowId: { type: String, required: true, index: true },
    contactId: { type: String, required: true },
    conversationId: { type: String, default: null },
    trigger: {
      type: { type: String, required: true },
      data: { type: Schema.Types.Mixed, default: {} },
    },
    stepsExecuted: [
      {
        stepIndex: { type: Number, required: true },
        status: { type: String, enum: ['completed', 'failed', 'skipped'], required: true },
        result: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    status: { type: String, enum: ['pending', 'completed', 'failed', 'skipped'], default: 'pending' },
    scheduledAt: { type: Date, default: null },
    remainingSteps: [
      {
        type: { type: String, enum: ['action', 'delay'], required: true },
        action: String,
        config: { type: Schema.Types.Mixed, default: {} },
        delayMinutes: Number,
      },
    ],
  },
  { timestamps: true }
);

FlowExecutionSchema.index({ flowId: 1, createdAt: -1 });
FlowExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // TTL 30 days
FlowExecutionSchema.index({ status: 1, scheduledAt: 1 }); // For cron scheduler

const FlowExecution: Model<IFlowExecution> =
  mongoose.models.FlowExecution || mongoose.model<IFlowExecution>('FlowExecution', FlowExecutionSchema);
export default FlowExecution;
