import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IPremiumTemplate extends Document {
  authorId: string;
  authorName: string;
  title: string;
  description: string;
  longDescription: string;
  niche: string;
  tags: string[];
  price: number; // in cents, 0 = free
  currency: 'usd';
  themeConfig: Record<string, unknown>;
  previewImages: string[];
  demoUrl?: string;
  downloads: number;
  rating: number;
  reviewCount: number;
  revenue: number; // total earned in cents
  status: 'draft' | 'pending_review' | 'approved' | 'rejected';
  revenueShare: number; // default 0.7 = 70% to author
  createdAt: Date;
  updatedAt: Date;
}

const PremiumTemplateSchema = new Schema<IPremiumTemplate>(
  {
    authorId: { type: String, required: true, index: true },
    authorName: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    longDescription: { type: String, default: '' },
    niche: { type: String, required: true },
    tags: { type: [String], default: [] },
    price: { type: Number, required: true, default: 0, min: 0 },
    currency: { type: String, default: 'usd', enum: ['usd'] },
    themeConfig: { type: Schema.Types.Mixed, required: true },
    previewImages: { type: [String], default: [] },
    demoUrl: { type: String },
    downloads: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    status: {
      type: String,
      required: true,
      enum: ['draft', 'pending_review', 'approved', 'rejected'],
      default: 'draft',
    },
    revenueShare: { type: Number, default: 0.7, min: 0, max: 1 },
  },
  { timestamps: true }
);

PremiumTemplateSchema.index({ status: 1, niche: 1 });
PremiumTemplateSchema.index({ status: 1, downloads: -1 });
PremiumTemplateSchema.index({ title: 'text', description: 'text', tags: 'text' });

const PremiumTemplate: Model<IPremiumTemplate> =
  mongoose.models.PremiumTemplate || mongoose.model<IPremiumTemplate>('PremiumTemplate', PremiumTemplateSchema);

export default PremiumTemplate;
