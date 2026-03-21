import mongoose, { Schema, Document, Model } from 'mongoose';

export type TemplateCategory =
  | 'widget_theme'
  | 'flow_template'
  | 'knowledge_pack'
  | 'integration_bundle'
  | 'prompt_pack';

export type PricingType = 'free' | 'one_time' | 'subscription';

export interface IPremiumMarketplaceTemplate extends Document {
  templateId: string;
  name: string;
  description: string;
  longDescription: string;
  category: TemplateCategory;
  author: { userId: string; name: string; avatar?: string };
  version: string;
  pricing: { type: PricingType; price: number; currency: string };
  config: Record<string, unknown>;
  previewImages: string[];
  tags: string[];
  stats: {
    purchases: number;
    rating: number;
    reviewCount: number;
    activeInstalls: number;
  };
  reviews: Array<{
    userId: string;
    userName: string;
    rating: number;
    comment: string;
    createdAt: Date;
  }>;
  compatibility: { minPlan: string; platforms: string[] };
  isPublished: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema(
  {
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PremiumMarketplaceTemplateSchema = new Schema<IPremiumMarketplaceTemplate>(
  {
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: { type: String, default: '' },
    category: {
      type: String,
      required: true,
      enum: ['widget_theme', 'flow_template', 'knowledge_pack', 'integration_bundle', 'prompt_pack'],
    },
    author: {
      userId: { type: String, required: true },
      name: { type: String, required: true },
      avatar: { type: String },
    },
    version: { type: String, default: '1.0.0' },
    pricing: {
      type: { type: String, enum: ['free', 'one_time', 'subscription'], default: 'free' },
      price: { type: Number, default: 0, min: 0 },
      currency: { type: String, default: 'USD' },
    },
    config: { type: Schema.Types.Mixed, default: {} },
    previewImages: { type: [String], default: [] },
    tags: { type: [String], default: [] },
    stats: {
      purchases: { type: Number, default: 0 },
      rating: { type: Number, default: 0 },
      reviewCount: { type: Number, default: 0 },
      activeInstalls: { type: Number, default: 0 },
    },
    reviews: { type: [ReviewSchema], default: [] },
    compatibility: {
      minPlan: { type: String, default: 'free' },
      platforms: { type: [String], default: ['web'] },
    },
    isPublished: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

PremiumMarketplaceTemplateSchema.index({ category: 1, isPublished: 1 });
PremiumMarketplaceTemplateSchema.index({ 'stats.purchases': -1 });
PremiumMarketplaceTemplateSchema.index({ 'stats.rating': -1 });
PremiumMarketplaceTemplateSchema.index({ isFeatured: 1, isPublished: 1 });
PremiumMarketplaceTemplateSchema.index({ name: 'text', description: 'text', tags: 'text' });

const PremiumMarketplaceTemplate: Model<IPremiumMarketplaceTemplate> =
  mongoose.models.PremiumMarketplaceTemplate ||
  mongoose.model<IPremiumMarketplaceTemplate>('PremiumMarketplaceTemplate', PremiumMarketplaceTemplateSchema);

export default PremiumMarketplaceTemplate;
