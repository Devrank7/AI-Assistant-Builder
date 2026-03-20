import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBrand extends Document {
  organizationId: string;
  name: string;
  slug: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
  domain?: string;
  description: string;
  widgetIds: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BrandSchema = new Schema(
  {
    organizationId: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    logo: { type: String, default: '' },
    primaryColor: { type: String, default: '#3B82F6' },
    secondaryColor: { type: String, default: '#1E40AF' },
    domain: { type: String },
    description: { type: String, default: '' },
    widgetIds: { type: [String], default: [] },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

BrandSchema.index({ organizationId: 1 });

const Brand: Model<IBrand> = mongoose.models.Brand || mongoose.model<IBrand>('Brand', BrandSchema);

export default Brand;
