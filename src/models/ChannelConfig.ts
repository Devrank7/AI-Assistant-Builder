import mongoose, { Schema, Document, Model } from 'mongoose';

export type ChannelType = 'telegram' | 'whatsapp' | 'instagram';
export type ChannelProvider = 'meta' | 'whapi' | 'manychat';

export interface IChannelConfig extends Document {
  clientId: string;
  channel: ChannelType;
  provider?: ChannelProvider;
  isActive: boolean;
  config: {
    token?: string;
    apiKey?: string;
    phoneNumber?: string;
    phoneNumberId?: string;
    webhookSecret?: string;
    igUserId?: string;
    pageId?: string;
    // Whapi-specific
    whapiToken?: string;
    whapiChannelId?: string;
    // Human takeover: bot pauses when human replies manually
    humanTakeover?: boolean;
    humanTimeoutMinutes?: number;
    // Freeform secrets for channel scripts (API keys, tokens for integrations)
    secrets?: Map<string, string>;
    // Whether the channel script.js should be executed
    scriptEnabled?: boolean;
  };
  connectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChannelConfigSchema = new Schema<IChannelConfig>(
  {
    clientId: { type: String, required: true, index: true },
    channel: {
      type: String,
      enum: ['telegram', 'whatsapp', 'instagram'],
      required: true,
    },
    provider: {
      type: String,
      enum: ['meta', 'whapi', 'manychat'],
      default: 'meta',
    },
    isActive: { type: Boolean, default: true },
    config: {
      token: String,
      apiKey: String,
      phoneNumber: String,
      phoneNumberId: String,
      webhookSecret: String,
      igUserId: String,
      pageId: String,
      whapiToken: String,
      whapiChannelId: String,
      humanTakeover: { type: Boolean, default: true },
      humanTimeoutMinutes: { type: Number, default: 30 },
      secrets: { type: Map, of: String, default: new Map() },
      scriptEnabled: { type: Boolean, default: true },
    },
    connectedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

ChannelConfigSchema.index({ clientId: 1, channel: 1 }, { unique: true });

const ChannelConfig: Model<IChannelConfig> =
  mongoose.models.ChannelConfig || mongoose.model<IChannelConfig>('ChannelConfig', ChannelConfigSchema);

export default ChannelConfig;
