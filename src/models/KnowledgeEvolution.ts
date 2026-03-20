import mongoose, { Schema, Document, Model } from 'mongoose';

export type EvolutionStatus = 'pending' | 'crawling' | 'diffing' | 'applying' | 'completed' | 'failed';

export interface KnowledgeDiff {
  type: 'added' | 'removed' | 'modified';
  chunkTitle: string;
  oldContent?: string;
  newContent?: string;
  similarity?: number;
}

export interface IKnowledgeEvolution extends Document {
  clientId: string;
  crawlUrl: string;
  status: EvolutionStatus;
  pagesScanned: number;
  diffs: KnowledgeDiff[];
  addedChunks: number;
  removedChunks: number;
  modifiedChunks: number;
  autoApplied: boolean;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeDiffSchema = new Schema<KnowledgeDiff>(
  {
    type: { type: String, enum: ['added', 'removed', 'modified'], required: true },
    chunkTitle: { type: String, required: true },
    oldContent: { type: String, default: undefined },
    newContent: { type: String, default: undefined },
    similarity: { type: Number, default: undefined },
  },
  { _id: false }
);

const KnowledgeEvolutionSchema = new Schema<IKnowledgeEvolution>(
  {
    clientId: { type: String, required: true, index: true },
    crawlUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'crawling', 'diffing', 'applying', 'completed', 'failed'],
      default: 'pending',
    },
    pagesScanned: { type: Number, default: 0 },
    diffs: { type: [KnowledgeDiffSchema], default: [] },
    addedChunks: { type: Number, default: 0 },
    removedChunks: { type: Number, default: 0 },
    modifiedChunks: { type: Number, default: 0 },
    autoApplied: { type: Boolean, default: false },
    error: { type: String, default: null },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

KnowledgeEvolutionSchema.index({ clientId: 1, createdAt: -1 });

const KnowledgeEvolution: Model<IKnowledgeEvolution> =
  mongoose.models.KnowledgeEvolution ||
  mongoose.model<IKnowledgeEvolution>('KnowledgeEvolution', KnowledgeEvolutionSchema);

export default KnowledgeEvolution;
