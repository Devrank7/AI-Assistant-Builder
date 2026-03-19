/**
 * Product Model
 *
 * In-chat commerce: product catalog per client.
 * Products can be browsed, added to cart, and purchased via Stripe payment links.
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  clientId: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl?: string;
  category?: string;
  sku?: string;
  inStock: boolean;
  stripeProductId?: string;
  stripePriceId?: string;
  metadata?: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    clientId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    imageUrl: String,
    category: String,
    sku: String,
    inStock: { type: Boolean, default: true },
    stripeProductId: String,
    stripePriceId: String,
    metadata: { type: Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ProductSchema.index({ clientId: 1, isActive: 1 });
ProductSchema.index({ clientId: 1, category: 1 });

const Product: Model<IProduct> = mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;
