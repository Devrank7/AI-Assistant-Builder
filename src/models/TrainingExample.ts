import mongoose, { Schema, Document, Model } from 'mongoose';

export type TrainingSource = 'manual' | 'correction' | 'feedback' | 'imported';
export type TrainingStatus = 'pending' | 'approved' | 'rejected' | 'applied';

export interface ITrainingExample extends Document {
  clientId: string;
  userId: string;
  source: TrainingSource;
  userMessage: string;
  idealResponse: string;
  actualResponse?: string;
  category?: string;
  tags: string[];
  qualityScore: number;
  status: TrainingStatus;
  appliedAt?: Date;
  reviewedBy?: string;
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TrainingExampleSchema = new Schema<ITrainingExample>(
  {
    clientId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    source: {
      type: String,
      enum: ['manual', 'correction', 'feedback', 'imported'],
      default: 'manual',
    },
    userMessage: { type: String, required: true },
    idealResponse: { type: String, required: true },
    actualResponse: { type: String },
    category: { type: String },
    tags: { type: [String], default: [] },
    qualityScore: { type: Number, default: 50, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'applied'],
      default: 'pending',
    },
    appliedAt: { type: Date },
    reviewedBy: { type: String },
    reviewNote: { type: String },
  },
  { timestamps: true }
);

TrainingExampleSchema.index({ clientId: 1, status: 1 });
TrainingExampleSchema.index({ clientId: 1, createdAt: -1 });

const TrainingExample: Model<ITrainingExample> =
  mongoose.models.TrainingExample || mongoose.model<ITrainingExample>('TrainingExample', TrainingExampleSchema);

export default TrainingExample;
