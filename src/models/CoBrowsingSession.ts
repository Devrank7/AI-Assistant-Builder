import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHighlight {
  selector: string;
  label: string;
  color: string;
  timestamp: Date;
}

export interface ICoBrowsingSession extends Document {
  sessionId: string;
  clientId: string;
  visitorId: string;
  agentUserId: string;
  status: 'waiting' | 'active' | 'ended';
  pageUrl: string;
  pageTitle: string;
  highlights: IHighlight[];
  scrollPosition: { x: number; y: number };
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const HighlightSchema = new Schema(
  {
    selector: { type: String, required: true },
    label: { type: String, default: '' },
    color: { type: String, default: '#FFEB3B' },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CoBrowsingSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    clientId: { type: String, required: true },
    visitorId: { type: String, required: true },
    agentUserId: { type: String, required: true },
    status: {
      type: String,
      enum: ['waiting', 'active', 'ended'],
      default: 'waiting',
    },
    pageUrl: { type: String, default: '' },
    pageTitle: { type: String, default: '' },
    highlights: { type: [HighlightSchema], default: [] },
    scrollPosition: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
  },
  { timestamps: true }
);

CoBrowsingSessionSchema.index({ clientId: 1, status: 1 });

const CoBrowsingSession: Model<ICoBrowsingSession> =
  mongoose.models.CoBrowsingSession || mongoose.model<ICoBrowsingSession>('CoBrowsingSession', CoBrowsingSessionSchema);

export default CoBrowsingSession;
