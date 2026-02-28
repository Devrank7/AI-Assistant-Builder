import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IShortLink extends Document {
  code: string;
  clientId: string;
  website: string;
  widgetType: 'quick' | 'full';
  createdAt: Date;
}

const ShortLinkSchema = new Schema<IShortLink>({
  code: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  clientId: {
    type: String,
    required: true,
    index: true,
  },
  website: {
    type: String,
    default: '',
  },
  widgetType: {
    type: String,
    enum: ['quick', 'full'],
    default: 'quick',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const ShortLink: Model<IShortLink> =
  mongoose.models.ShortLink || mongoose.model<IShortLink>('ShortLink', ShortLinkSchema);

export default ShortLink;
