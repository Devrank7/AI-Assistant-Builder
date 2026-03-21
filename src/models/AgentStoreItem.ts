import mongoose, { Schema, Document, Model } from 'mongoose';

export type AgentCategory =
  | 'sales'
  | 'support'
  | 'booking'
  | 'ecommerce'
  | 'healthcare'
  | 'education'
  | 'legal'
  | 'real_estate'
  | 'restaurant'
  | 'general';

export interface IAgentReview {
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

export interface IAgentStoreItem extends Document {
  agentId: string;
  name: string;
  description: string;
  longDescription: string;
  category: AgentCategory;
  author: {
    userId: string;
    name: string;
    avatar: string;
  };
  version: string;
  tags: string[];
  config: {
    systemPrompt: string;
    greeting: string;
    quickReplies: string[];
    tone: string;
    model: string;
  };
  pricing: {
    type: 'free' | 'premium';
    price: number;
  };
  stats: {
    installs: number;
    rating: number;
    reviewCount: number;
    activeUsers: number;
  };
  reviews: IAgentReview[];
  screenshots: string[];
  isPublished: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgentReviewSchema = new Schema<IAgentReview>(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AgentStoreItemSchema = new Schema<IAgentStoreItem>(
  {
    agentId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: { type: String, default: '' },
    category: {
      type: String,
      enum: [
        'sales',
        'support',
        'booking',
        'ecommerce',
        'healthcare',
        'education',
        'legal',
        'real_estate',
        'restaurant',
        'general',
      ],
      default: 'general',
    },
    author: {
      userId: { type: String, default: 'winbix' },
      name: { type: String, default: 'WinBix' },
      avatar: { type: String, default: '' },
    },
    version: { type: String, default: '1.0.0' },
    tags: [{ type: String }],
    config: {
      systemPrompt: { type: String, default: '' },
      greeting: { type: String, default: '' },
      quickReplies: [{ type: String }],
      tone: { type: String, default: 'professional' },
      model: { type: String, default: 'gemini' },
    },
    pricing: {
      type: { type: String, enum: ['free', 'premium'], default: 'free' },
      price: { type: Number, default: 0 },
    },
    stats: {
      installs: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      activeUsers: { type: Number, default: 0 },
    },
    reviews: [AgentReviewSchema],
    screenshots: [{ type: String }],
    isPublished: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AgentStoreItemSchema.index({ 'pricing.type': 1, category: 1, isPublished: 1 });
AgentStoreItemSchema.index({ 'stats.rating': -1 });
AgentStoreItemSchema.index({ 'stats.installs': -1 });
AgentStoreItemSchema.index({ isFeatured: 1, isPublished: 1 });
AgentStoreItemSchema.index({ '$**': 'text' });

const AgentStoreItem: Model<IAgentStoreItem> =
  mongoose.models.AgentStoreItem || mongoose.model<IAgentStoreItem>('AgentStoreItem', AgentStoreItemSchema);

export default AgentStoreItem;
