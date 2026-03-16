import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IBuilderMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export type BuilderStatus = 'chatting' | 'streaming' | 'building' | 'preview' | 'deployed';

export interface IBuilderSession extends Document {
  userId: string;
  messages: IBuilderMessage[];
  themeJson: Record<string, unknown> | null;
  clientId: string | null;
  status: BuilderStatus;
  widgetName: string | null;
  currentStage: 'input' | 'analysis' | 'design' | 'knowledge' | 'deploy' | 'integrations' | 'suggestions' | 'workspace';
  siteProfile: Record<string, unknown> | null;
  knowledgeUploaded: boolean;
  connectedIntegrations: {
    provider: string;
    status: 'pending' | 'connected' | 'failed';
  }[];
  abVariants: {
    label: string;
    themeJson: Record<string, unknown>;
  }[];
  selectedVariant: number | null;
  templateUsed: string | null;
  createdAt: Date;
  updatedAt: Date;
  // New optional fields (v2)
  integrations?: {
    provider: string;
    status: 'suggested' | 'configuring' | 'connected' | 'failed';
    handlerPath?: string;
  }[];
  opportunities?: {
    id: string;
    type: 'knowledge_gap' | 'integration' | 'design' | 'feature';
    description: string;
    status: 'pending' | 'accepted' | 'dismissed';
  }[];
  versions?: {
    number: number;
    description: string;
    timestamp: Date;
    scriptPath: string;
  }[];
}

const messageSchema = new Schema<IBuilderMessage>(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const builderSessionSchema = new Schema<IBuilderSession>(
  {
    userId: { type: String, required: true, index: true },
    messages: [messageSchema],
    themeJson: { type: Schema.Types.Mixed, default: null },
    clientId: { type: String, default: null },
    status: {
      type: String,
      enum: ['chatting', 'streaming', 'building', 'preview', 'deployed'],
      default: 'chatting',
    },
    widgetName: { type: String, default: null },
    currentStage: {
      type: String,
      enum: ['input', 'analysis', 'design', 'knowledge', 'deploy', 'integrations', 'suggestions', 'workspace'],
      default: 'input',
    },
    siteProfile: { type: Schema.Types.Mixed, default: null },
    knowledgeUploaded: { type: Boolean, default: false },
    connectedIntegrations: [
      {
        provider: String,
        status: { type: String, enum: ['pending', 'connected', 'failed'] },
      },
    ],
    abVariants: [{ label: String, themeJson: Schema.Types.Mixed }],
    selectedVariant: { type: Number, default: null },
    templateUsed: { type: String, default: null },
    integrations: [
      {
        provider: String,
        status: { type: String, enum: ['suggested', 'configuring', 'connected', 'failed'] },
        handlerPath: String,
      },
    ],
    opportunities: [
      {
        id: String,
        type: { type: String, enum: ['knowledge_gap', 'integration', 'design', 'feature'] },
        description: String,
        status: { type: String, enum: ['pending', 'accepted', 'dismissed'] },
      },
    ],
    versions: [
      {
        number: Number,
        description: String,
        timestamp: Date,
        scriptPath: String,
      },
    ],
  },
  { timestamps: true }
);

const BuilderSession: Model<IBuilderSession> =
  mongoose.models.BuilderSession || mongoose.model<IBuilderSession>('BuilderSession', builderSessionSchema);

export default BuilderSession;
