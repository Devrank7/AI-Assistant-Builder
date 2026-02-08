import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IFeedback extends Document {
  clientId: string;
  sessionId: string;
  messageIndex: number;
  rating: 'up' | 'down';
  comment?: string;
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    clientId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true },
    messageIndex: { type: Number, required: true },
    rating: { type: String, enum: ['up', 'down'], required: true },
    comment: { type: String },
  },
  { timestamps: true }
);

FeedbackSchema.index({ clientId: 1, createdAt: -1 });
FeedbackSchema.index({ clientId: 1, sessionId: 1, messageIndex: 1 }, { unique: true });

const Feedback: Model<IFeedback> = mongoose.models.Feedback || mongoose.model<IFeedback>('Feedback', FeedbackSchema);

export default Feedback;
