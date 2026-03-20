import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITemplatePurchase extends Document {
  buyerId: string;
  templateId: string;
  authorId: string;
  price: number;
  authorEarnings: number;
  platformFee: number;
  stripePaymentId?: string;
  status: 'completed' | 'refunded';
  createdAt: Date;
}

const TemplatePurchaseSchema = new Schema<ITemplatePurchase>(
  {
    buyerId: { type: String, required: true, index: true },
    templateId: { type: String, required: true, index: true },
    authorId: { type: String, required: true, index: true },
    price: { type: Number, required: true },
    authorEarnings: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    stripePaymentId: { type: String },
    status: { type: String, required: true, enum: ['completed', 'refunded'], default: 'completed' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TemplatePurchaseSchema.index({ buyerId: 1, templateId: 1 });

const TemplatePurchase: Model<ITemplatePurchase> =
  mongoose.models.TemplatePurchase || mongoose.model<ITemplatePurchase>('TemplatePurchase', TemplatePurchaseSchema);

export default TemplatePurchase;
