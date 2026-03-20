import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAgentStoreItem extends Document {
  name: string;
  description: string;
  niche: string;
  category: 'sales' | 'support' | 'billing' | 'booking' | 'custom';
  authorId: string;
  authorName: string;
  systemPrompt: string;
  sampleResponses: string[];
  modelPreference?: string;
  rating: number;
  reviewCount: number;
  installs: number;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  tags: string[];
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AgentStoreItemSchema = new Schema<IAgentStoreItem>(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    niche: { type: String, required: true },
    category: {
      type: String,
      enum: ['sales', 'support', 'billing', 'booking', 'custom'],
      default: 'custom',
    },
    authorId: { type: String, required: true },
    authorName: { type: String, default: '' },
    systemPrompt: { type: String, required: true },
    sampleResponses: [{ type: String }],
    modelPreference: { type: String },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    installs: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected'],
      default: 'pending',
    },
    tags: [{ type: String }],
    icon: { type: String },
  },
  { timestamps: true }
);

AgentStoreItemSchema.index({ status: 1, category: 1 });
AgentStoreItemSchema.index({ niche: 1, rating: -1 });
AgentStoreItemSchema.index({ '$**': 'text' });

const AgentStoreItem: Model<IAgentStoreItem> =
  mongoose.models.AgentStoreItem || mongoose.model<IAgentStoreItem>('AgentStoreItem', AgentStoreItemSchema);

export default AgentStoreItem;
