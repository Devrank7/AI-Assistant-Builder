import mongoose, { Schema, Document, Model } from 'mongoose';

export const MARKETPLACE_NICHES = [
  'dental',
  'beauty',
  'restaurant',
  'real_estate',
  'ecommerce',
  'saas',
  'hotel',
  'fitness',
  'legal',
  'auto',
] as const;

export type MarketplaceNiche = (typeof MARKETPLACE_NICHES)[number];

export const NICHE_LABELS: Record<MarketplaceNiche, string> = {
  dental: 'Dental',
  beauty: 'Beauty & Spa',
  restaurant: 'Restaurant',
  real_estate: 'Real Estate',
  ecommerce: 'E-Commerce',
  saas: 'SaaS & Tech',
  hotel: 'Hotel & Travel',
  fitness: 'Fitness',
  legal: 'Legal',
  auto: 'Automotive',
};

export const NICHE_ICONS: Record<MarketplaceNiche, string> = {
  dental: '🦷',
  beauty: '💅',
  restaurant: '🍕',
  real_estate: '🏠',
  ecommerce: '🛒',
  saas: '💻',
  hotel: '🏨',
  fitness: '💪',
  legal: '⚖️',
  auto: '🚗',
};

export interface IMarketplaceTemplate extends Document {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  niche: MarketplaceNiche;
  widgetType: 'ai_chat' | 'smart_faq' | 'lead_form';
  tags: string[];
  themeJson: Record<string, unknown>;
  configJson: Record<string, unknown>;
  knowledgeSample: string;
  authorId: string;
  authorName: string;
  tier: 'official' | 'community';
  rating: number;
  reviewCount: number;
  installCount: number;
  status: 'draft' | 'review' | 'published' | 'rejected';
  screenshots: string[];
  previewConfig: { primaryColor: string; isDark: boolean };
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

const MarketplaceTemplateSchema = new Schema<IMarketplaceTemplate>(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true, maxlength: 120 },
    niche: { type: String, required: true, enum: MARKETPLACE_NICHES },
    widgetType: { type: String, required: true, enum: ['ai_chat', 'smart_faq', 'lead_form'], default: 'ai_chat' },
    tags: { type: [String], default: [] },
    themeJson: { type: Schema.Types.Mixed, required: true },
    configJson: { type: Schema.Types.Mixed, required: true },
    knowledgeSample: { type: String, default: '' },
    authorId: { type: String, required: true, index: true },
    authorName: { type: String, required: true },
    tier: { type: String, required: true, enum: ['official', 'community'] },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    installCount: { type: Number, default: 0 },
    status: { type: String, required: true, enum: ['draft', 'review', 'published', 'rejected'], default: 'draft' },
    screenshots: { type: [String], default: [] },
    previewConfig: {
      primaryColor: { type: String, default: '#5bbad5' },
      isDark: { type: Boolean, default: true },
    },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

MarketplaceTemplateSchema.index({ status: 1, niche: 1 });
MarketplaceTemplateSchema.index({ status: 1, installCount: -1 });
MarketplaceTemplateSchema.index({ name: 'text', description: 'text', tags: 'text' });

const MarketplaceTemplate: Model<IMarketplaceTemplate> =
  mongoose.models.MarketplaceTemplate ||
  mongoose.model<IMarketplaceTemplate>('MarketplaceTemplate', MarketplaceTemplateSchema);

export default MarketplaceTemplate;
