import mongoose, { Schema, Document, Model } from 'mongoose';

export type LeadTemperature = 'cold' | 'warm' | 'hot';

export interface IContact extends Document {
  contactId: string;
  clientId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  channel: string;
  channelIds: {
    telegram?: string;
    whatsapp?: string;
    instagram?: string;
    web?: string;
  };
  tags: string[];
  leadScore: number;
  leadTemp: LeadTemperature;
  scoreBreakdown: Array<{ reason: string; points: number }>;
  totalConversations: number;
  totalMessages: number;
  lastSeenAt: Date;
  firstSeenAt: Date;
  customFields: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const ContactSchema = new Schema<IContact>(
  {
    contactId: { type: String, required: true, unique: true },
    clientId: { type: String, required: true, index: true },
    name: { type: String, default: null },
    email: { type: String, default: null },
    phone: { type: String, default: null },
    channel: { type: String, required: true },
    channelIds: {
      telegram: { type: String },
      whatsapp: { type: String },
      instagram: { type: String },
      web: { type: String },
    },
    tags: { type: [String], default: [] },
    leadScore: { type: Number, default: 0 },
    leadTemp: { type: String, enum: ['cold', 'warm', 'hot'], default: 'cold' },
    scoreBreakdown: { type: [{ reason: String, points: Number }], default: [] },
    totalConversations: { type: Number, default: 1 },
    totalMessages: { type: Number, default: 0 },
    lastSeenAt: { type: Date, default: Date.now },
    firstSeenAt: { type: Date, default: Date.now },
    customFields: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

ContactSchema.index({ clientId: 1, leadScore: -1 });
ContactSchema.index({ clientId: 1, 'channelIds.telegram': 1 });
ContactSchema.index({ clientId: 1, 'channelIds.whatsapp': 1 });
ContactSchema.index({ clientId: 1, 'channelIds.instagram': 1 });
ContactSchema.index({ clientId: 1, 'channelIds.web': 1 });
ContactSchema.index({ clientId: 1, tags: 1 });

const Contact: Model<IContact> = mongoose.models.Contact || mongoose.model<IContact>('Contact', ContactSchema);
export default Contact;
