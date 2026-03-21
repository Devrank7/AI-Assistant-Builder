import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrand extends Document {
  brandId: string;
  organizationId: string;
  userId: string;
  name: string;
  logo: string; // URL or base64
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  domain: string;
  tagline: string;
  description: string;
  socialLinks: { platform: string; url: string }[];
  widgetIds: string[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SocialLinkSchema = new Schema(
  {
    platform: { type: String, required: true },
    url: { type: String, required: true },
  },
  { _id: false }
);

const BrandSchema = new Schema<IBrand>(
  {
    brandId: { type: String, required: true, unique: true },
    organizationId: { type: String, required: true },
    userId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    logo: { type: String, default: '' },
    primaryColor: { type: String, default: '#3B82F6' },
    secondaryColor: { type: String, default: '#8B5CF6' },
    accentColor: { type: String, default: '#06B6D4' },
    fontFamily: { type: String, default: 'Inter' },
    domain: { type: String, default: '' },
    tagline: { type: String, default: '' },
    description: { type: String, default: '' },
    socialLinks: { type: [SocialLinkSchema], default: [] },
    widgetIds: { type: [String], default: [] },
    isDefault: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

BrandSchema.index({ organizationId: 1 });
BrandSchema.index({ userId: 1 });
BrandSchema.index({ isDefault: 1 });

const Brand: Model<IBrand> = mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);

export default Brand;
