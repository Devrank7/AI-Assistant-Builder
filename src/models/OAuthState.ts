// src/models/OAuthState.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IOAuthState extends Document {
  state: string;
  configId: string;
  sessionId: string;
  userId: string;
  codeVerifier: string;
  createdAt: Date;
  expiresAt: Date;
}

const OAuthStateSchema = new Schema<IOAuthState>({
  state: { type: String, required: true, unique: true },
  configId: { type: String, required: true },
  sessionId: { type: String, required: true },
  userId: { type: String, required: true },
  codeVerifier: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: true },
});

// TTL index — MongoDB auto-deletes documents when expiresAt passes
OAuthStateSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.OAuthState || mongoose.model<IOAuthState>('OAuthState', OAuthStateSchema);
