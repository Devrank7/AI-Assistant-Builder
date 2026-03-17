import mongoose from 'mongoose';

const widgetIntegrationSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    widgetId: { type: String, required: true, index: true },
    connectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Integration', required: true },
    integrationSlug: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    enabledActions: [{ type: String }],
    config: {
      fieldMapping: { type: mongoose.Schema.Types.Mixed, default: {} },
      aiInstruction: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

widgetIntegrationSchema.index({ widgetId: 1, integrationSlug: 1 }, { unique: true });
widgetIntegrationSchema.index({ userId: 1, widgetId: 1 });

export default mongoose.models.WidgetIntegration || mongoose.model('WidgetIntegration', widgetIntegrationSchema);
