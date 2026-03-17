import mongoose from 'mongoose';

const integrationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    provider: {
      type: String,
      required: true,
      enum: [
        'hubspot',
        'salesforce',
        'pipedrive',
        'zoho',
        'freshsales',
        'bitrix24',
        'monday',
        'google_calendar',
        'calendly',
        'stripe',
        'telegram',
        'whatsapp',
        'email_smtp',
        'google_sheets',
      ],
    },
    accessToken: { type: String }, // encrypted
    refreshToken: { type: String }, // encrypted
    tokenExpiry: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed }, // provider-specific data (instance URL, etc.)
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['connected', 'error', 'disconnected'],
      default: 'connected',
    },
    lastHealthCheck: { type: Date },
    lastError: { type: String, default: null },
    aiDiagnostic: { type: String, default: null },
  },
  { timestamps: true }
);

integrationSchema.index({ userId: 1, provider: 1 }, { unique: true });

export default mongoose.models.Integration || mongoose.model('Integration', integrationSchema);
