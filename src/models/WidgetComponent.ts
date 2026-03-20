import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IWidgetComponent extends Document {
  clientId: string;
  widgetId: string;
  type: 'header' | 'chat_area' | 'input' | 'quick_replies' | 'powered_by' | 'custom';
  name: string;
  order: number;
  props: Record<string, unknown>;
  cssVariables: Record<string, string>;
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WidgetComponentSchema = new Schema<IWidgetComponent>(
  {
    clientId: { type: String, required: true, index: true },
    widgetId: { type: String, required: true, index: true },
    type: {
      type: String,
      required: true,
      enum: ['header', 'chat_area', 'input', 'quick_replies', 'powered_by', 'custom'],
    },
    name: { type: String, required: true },
    order: { type: Number, required: true, default: 0 },
    props: { type: Schema.Types.Mixed, default: {} },
    cssVariables: { type: Schema.Types.Mixed, default: {} },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

WidgetComponentSchema.index({ widgetId: 1, order: 1 });

const WidgetComponent: Model<IWidgetComponent> =
  mongoose.models.WidgetComponent || mongoose.model<IWidgetComponent>('WidgetComponent', WidgetComponentSchema);

export default WidgetComponent;
