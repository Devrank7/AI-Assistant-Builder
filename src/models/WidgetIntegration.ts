import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWidgetIntegration extends Document {
  userId: string;
  organizationId: string;
  widgetId: string;
  integrationSlug: string;
  enabledActions: string[];
  enabled: boolean;
  triggerEvents: string[];
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const WidgetIntegrationSchema = new Schema<IWidgetIntegration>(
  {
    userId: { type: String, required: true, index: true },
    organizationId: { type: String, required: true, index: true },
    widgetId: { type: String, required: true },
    integrationSlug: { type: String, required: true },
    enabledActions: { type: [String], default: [] },
    enabled: { type: Boolean, default: true },
    triggerEvents: { type: [String], default: [] },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

WidgetIntegrationSchema.index({ widgetId: 1, integrationSlug: 1 }, { unique: true });

const WidgetIntegration: Model<IWidgetIntegration> =
  mongoose.models.WidgetIntegration || mongoose.model<IWidgetIntegration>('WidgetIntegration', WidgetIntegrationSchema);

export default WidgetIntegration;
