import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IEvent extends Document {
  eventType: string;
  clientId: string;
  payload: Record<string, unknown>;
  createdAt: Date;
}

const EventSchema = new Schema<IEvent>(
  {
    eventType: { type: String, required: true, index: true },
    clientId: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

EventSchema.index({ clientId: 1, eventType: 1, createdAt: -1 });
EventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 }); // TTL 7 days

const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>('Event', EventSchema);
export default Event;
