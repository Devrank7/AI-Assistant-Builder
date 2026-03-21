import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IOnboardingProgress extends Document {
  userId: string;
  organizationId?: string;
  currentStep: number;
  completedSteps: string[];
  skippedSteps: string[];
  businessInfo: {
    companyName: string;
    industry: string;
    website: string;
    teamSize: string;
    useCase: string;
  };
  preferences: {
    language: string;
    timezone: string;
    notifications: boolean;
  };
  firstWidgetId?: string;
  completedAt?: Date;
  isCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OnboardingProgressSchema = new Schema<IOnboardingProgress>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    organizationId: { type: String, default: null, index: true },
    currentStep: { type: Number, default: 0 },
    completedSteps: { type: [String], default: [] },
    skippedSteps: { type: [String], default: [] },
    businessInfo: {
      companyName: { type: String, default: '' },
      industry: { type: String, default: '' },
      website: { type: String, default: '' },
      teamSize: { type: String, default: '' },
      useCase: { type: String, default: '' },
    },
    preferences: {
      language: { type: String, default: 'en' },
      timezone: { type: String, default: 'UTC' },
      notifications: { type: Boolean, default: true },
    },
    firstWidgetId: { type: String, default: null },
    completedAt: { type: Date, default: null },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const OnboardingProgress: Model<IOnboardingProgress> =
  mongoose.models.OnboardingProgress ||
  mongoose.model<IOnboardingProgress>('OnboardingProgress', OnboardingProgressSchema);

export default OnboardingProgress;
