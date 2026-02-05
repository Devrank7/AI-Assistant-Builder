import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IKnowledgeChunk extends Document {
    clientId: string;
    text: string;
    embedding: number[];
    source: string;
    createdAt: Date;
    updatedAt: Date;
}

const KnowledgeChunkSchema = new Schema<IKnowledgeChunk>(
    {
        clientId: {
            type: String,
            required: true,
            index: true,
        },
        text: {
            type: String,
            required: true,
        },
        embedding: {
            type: [Number],
            required: true,
        },
        source: {
            type: String,
            required: true,
            default: 'manual',
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient client queries
KnowledgeChunkSchema.index({ clientId: 1, createdAt: -1 });

const KnowledgeChunk: Model<IKnowledgeChunk> =
    mongoose.models.KnowledgeChunk || mongoose.model<IKnowledgeChunk>('KnowledgeChunk', KnowledgeChunkSchema);

export default KnowledgeChunk;
