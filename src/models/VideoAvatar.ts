import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IVideoAvatar extends Document {
  clientId: string;
  name: string;
  avatarUrl: string;
  voiceId: string;
  provider: 'heygen' | 'did' | 'custom';
  style: 'professional' | 'casual' | 'friendly';
  gender: 'male' | 'female' | 'neutral';
  language: string;
  isActive: boolean;
  status: 'active' | 'inactive' | 'processing';
  apiConfig: {
    apiKey?: string;
    avatarId?: string;
    voiceSettings?: Record<string, unknown>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const VideoAvatarSchema = new Schema(
  {
    clientId: { type: String, required: true },
    name: { type: String, required: true },
    avatarUrl: { type: String, default: '' },
    voiceId: { type: String, default: '' },
    provider: {
      type: String,
      enum: ['heygen', 'did', 'custom'],
      default: 'heygen',
    },
    style: {
      type: String,
      enum: ['professional', 'casual', 'friendly'],
      default: 'professional',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'neutral'],
      default: 'neutral',
    },
    language: { type: String, default: 'en' },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'processing'],
      default: 'active',
    },
    apiConfig: {
      apiKey: { type: String },
      avatarId: { type: String },
      voiceSettings: { type: Schema.Types.Mixed },
    },
  },
  { timestamps: true }
);

VideoAvatarSchema.index({ clientId: 1 });

const VideoAvatar: Model<IVideoAvatar> =
  mongoose.models.VideoAvatar || mongoose.model<IVideoAvatar>('VideoAvatar', VideoAvatarSchema);

export default VideoAvatar;
