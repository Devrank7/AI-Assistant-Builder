import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMarketplacePurchase extends Document {
  buyerId: string;
  templateId: string;
  authorId: string;
  price: number;
  currency: string;
  authorEarnings: number;
  platformFee: number;
  status: 'completed' | 'refunded' | 'pending';
  isInstalled: boolean;
  installedClientId?: string;
  installedAt?: Date;
  createdAt: Date;
}

const MarketplacePurchaseSchema = new Schema<IMarketplacePurchase>(
  {
    buyerId: { type: String, required: true, index: true },
    templateId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    price: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'USD' },
    authorEarnings: { type: Number, required: true, default: 0 },
    platformFee: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['completed', 'refunded', 'pending'], default: 'completed' },
    isInstalled: { type: Boolean, default: false },
    installedClientId: { type: String },
    installedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

MarketplacePurchaseSchema.index({ buyerId: 1, templateId: 1 }, { unique: true });

const MarketplacePurchase: Model<IMarketplacePurchase> =
  mongoose.models.MarketplacePurchase ||
  mongoose.model<IMarketplacePurchase>('MarketplacePurchase', MarketplacePurchaseSchema);

export default MarketplacePurchase;
