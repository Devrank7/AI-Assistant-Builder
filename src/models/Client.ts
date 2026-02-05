import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IClient extends Document {
  clientId: string;
  username: string;
  email: string;
  website: string;
  phone?: string;
  addresses?: string[];
  instagram?: string;
  requests: number;
  tokens: number;
  startDate: Date;
  folderPath: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClientSchema = new Schema<IClient>(
  {
    clientId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    website: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: false,
    },
    addresses: {
      type: [String],
      required: false,
      default: [],
    },
    instagram: {
      type: String,
      required: false,
    },
    requests: {
      type: Number,
      required: true,
      default: 0,
    },
    tokens: {
      type: Number,
      required: true,
      default: 0,
    },
    startDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    folderPath: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Client: Model<IClient> =
  mongoose.models.Client || mongoose.model<IClient>('Client', ClientSchema);

export default Client;
