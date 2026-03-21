import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMarketplaceReview extends Document {
  templateId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

const MarketplaceReviewSchema = new Schema<IMarketplaceReview>(
  {
    templateId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: '' },
  },
  { timestamps: true }
);

MarketplaceReviewSchema.index({ templateId: 1, userId: 1 }, { unique: true });

const MarketplaceReview: Model<IMarketplaceReview> =
  mongoose.models.MarketplaceReview || mongoose.model<IMarketplaceReview>('MarketplaceReview', MarketplaceReviewSchema);

export default MarketplaceReview;
