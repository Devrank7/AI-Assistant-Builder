import mongoose, { Schema, Document, Model } from 'mongoose';

export type CorrectionStatus = 'pending' | 'applied' | 'rejected';

export type CorrectionSource = 'manual' | 'auto_learning';

export interface ICorrection extends Document {
  clientId: string;
  sessionId: string;
  messageIndex: number;
  userQuestion: string;
  originalAnswer: string;
  correctedAnswer: string;
  status: CorrectionStatus;
  source: CorrectionSource;
  appliedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CorrectionSchema = new Schema<ICorrection>(
  {
    clientId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    messageIndex: { type: Number, required: true },
    userQuestion: { type: String, required: true },
    originalAnswer: { type: String, required: true },
    correctedAnswer: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'applied', 'rejected'],
      default: 'pending',
    },
    source: {
      type: String,
      enum: ['manual', 'auto_learning'],
      default: 'manual',
    },
    appliedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

CorrectionSchema.index({ clientId: 1, status: 1 });

const Correction: Model<ICorrection> =
  mongoose.models.Correction || mongoose.model<ICorrection>('Correction', CorrectionSchema);

export default Correction;
