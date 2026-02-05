import mongoose, { Schema, Document } from 'mongoose';

export interface IChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export interface IChatLog extends Document {
    clientId: string;
    sessionId: string;
    messages: IChatMessage[];
    metadata: {
        userAgent?: string;
        ip?: string;
        page?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const ChatMessageSchema = new Schema({
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const ChatLogSchema = new Schema({
    clientId: { type: String, required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    messages: [ChatMessageSchema],
    metadata: {
        userAgent: String,
        ip: String,
        page: String,
    },
}, { timestamps: true });

// Compound index for efficient queries
ChatLogSchema.index({ clientId: 1, createdAt: -1 });

export default mongoose.models.ChatLog || mongoose.model<IChatLog>('ChatLog', ChatLogSchema);
