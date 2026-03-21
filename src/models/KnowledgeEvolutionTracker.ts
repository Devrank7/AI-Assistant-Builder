import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ICrawlHistoryEntry {
  crawledAt: Date;
  contentHash: string;
  wordCount: number;
  status: 'success' | 'failed' | 'no_change';
  error?: string;
}

export interface IEvolutionChange {
  detectedAt: Date;
  type: 'added' | 'removed' | 'modified';
  summary: string;
  oldSnippet?: string;
  newSnippet?: string;
  applied: boolean;
  appliedAt?: Date;
}

export interface IKnowledgeEvolutionTracker extends Document {
  evolutionId: string;
  clientId: string;
  organizationId?: string;
  userId?: string;
  sourceUrl: string;
  crawlHistory: ICrawlHistoryEntry[];
  lastContent: string;
  lastContentHash: string;
  changes: IEvolutionChange[];
  schedule: {
    enabled: boolean;
    intervalDays: number;
    lastRun?: Date;
    nextRun?: Date;
  };
  stats: {
    totalCrawls: number;
    totalChanges: number;
    lastChangeAt?: Date;
    avgChangesPerCrawl: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CrawlHistorySchema = new Schema<ICrawlHistoryEntry>(
  {
    crawledAt: { type: Date, required: true, default: Date.now },
    contentHash: { type: String, required: true },
    wordCount: { type: Number, default: 0 },
    status: { type: String, enum: ['success', 'failed', 'no_change'], required: true },
    error: { type: String },
  },
  { _id: false }
);

const EvolutionChangeSchema = new Schema<IEvolutionChange>(
  {
    detectedAt: { type: Date, required: true, default: Date.now },
    type: { type: String, enum: ['added', 'removed', 'modified'], required: true },
    summary: { type: String, required: true },
    oldSnippet: { type: String },
    newSnippet: { type: String },
    applied: { type: Boolean, default: false },
    appliedAt: { type: Date },
  },
  { _id: true }
);

const KnowledgeEvolutionTrackerSchema = new Schema<IKnowledgeEvolutionTracker>(
  {
    evolutionId: { type: String, required: true, unique: true, index: true },
    clientId: { type: String, required: true, index: true },
    organizationId: { type: String, index: true },
    userId: { type: String, index: true },
    sourceUrl: { type: String, required: true },
    crawlHistory: { type: [CrawlHistorySchema], default: [] },
    lastContent: { type: String, default: '' },
    lastContentHash: { type: String, default: '' },
    changes: { type: [EvolutionChangeSchema], default: [] },
    schedule: {
      enabled: { type: Boolean, default: true },
      intervalDays: { type: Number, default: 7 },
      lastRun: { type: Date },
      nextRun: { type: Date },
    },
    stats: {
      totalCrawls: { type: Number, default: 0 },
      totalChanges: { type: Number, default: 0 },
      lastChangeAt: { type: Date },
      avgChangesPerCrawl: { type: Number, default: 0 },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

KnowledgeEvolutionTrackerSchema.index({ clientId: 1, isActive: 1 });
KnowledgeEvolutionTrackerSchema.index({ 'schedule.nextRun': 1, 'schedule.enabled': 1 });

const KnowledgeEvolutionTracker: Model<IKnowledgeEvolutionTracker> =
  mongoose.models.KnowledgeEvolutionTracker ||
  mongoose.model<IKnowledgeEvolutionTracker>('KnowledgeEvolutionTracker', KnowledgeEvolutionTrackerSchema);

export default KnowledgeEvolutionTracker;
