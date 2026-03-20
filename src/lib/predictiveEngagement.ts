import connectDB from './mongodb';
import EngagementPrediction, { type SignalType, type ISignal } from '@/models/EngagementPrediction';

const SIGNAL_WEIGHTS: Record<SignalType, number> = {
  scroll_depth: 0.2,
  time_on_page: 0.25,
  mouse_idle: 0.3,
  tab_switch: 0.15,
  rapid_scroll: 0.1,
};

export function calculateExitProbability(signals: Array<{ type: SignalType; value: number }>) {
  const weightedSignals: ISignal[] = signals.map((s) => ({
    type: s.type,
    value: s.value,
    weight: SIGNAL_WEIGHTS[s.type] || 0,
  }));

  // Calculate weighted exit probability (higher value = more likely to exit)
  let totalWeight = 0;
  let weightedSum = 0;

  for (const signal of weightedSignals) {
    // Normalize value to 0-1 range where 1 means likely to exit
    const normalizedValue = Math.min(Math.max(signal.value / 100, 0), 1);
    weightedSum += normalizedValue * signal.weight;
    totalWeight += signal.weight;
  }

  const exitProbability = totalWeight > 0 ? Math.min(weightedSum / totalWeight, 1) : 0;
  const engagementScore = Math.round((1 - exitProbability) * 100);

  let recommendedAction: 'nudge' | 'offer' | 'none' = 'none';
  if (exitProbability > 0.7) {
    recommendedAction = 'offer';
  } else if (exitProbability > 0.4) {
    recommendedAction = 'nudge';
  }

  return {
    exitProbability: Math.round(exitProbability * 1000) / 1000,
    engagementScore,
    recommendedAction,
    signals: weightedSignals,
  };
}

export function generateNudgeMessage(_clientId: string, engagementScore: number, pageContext?: string): string {
  if (engagementScore < 30) {
    return pageContext
      ? `Wait! Before you go — we have a special offer on ${pageContext}. Chat with us!`
      : 'Before you leave, would you like to chat with us? We can help!';
  }
  if (engagementScore < 60) {
    return pageContext
      ? `Need help with ${pageContext}? Our team is standing by!`
      : 'Looking for something specific? Let us help you find it.';
  }
  return 'Have a question? We are here to help!';
}

export async function recordPrediction(
  clientId: string,
  visitorId: string,
  sessionId: string,
  prediction: {
    exitProbability: number;
    engagementScore: number;
    recommendedAction: 'nudge' | 'offer' | 'none';
    signals: ISignal[];
    nudgeMessage?: string;
  }
) {
  await connectDB();
  return EngagementPrediction.create({
    clientId,
    visitorId,
    sessionId,
    ...prediction,
    predictedAt: new Date(),
  });
}

export async function getAccuracyStats(clientId: string) {
  await connectDB();
  const predictions = await EngagementPrediction.find({
    clientId,
    wasAccurate: { $ne: null },
  });

  const total = predictions.length;
  const accurate = predictions.filter((p) => p.wasAccurate === true).length;
  const inaccurate = total - accurate;

  return {
    total,
    accurate,
    inaccurate,
    accuracyRate: total > 0 ? Math.round((accurate / total) * 100) : 0,
  };
}

export async function listPredictions(clientId: string, limit = 50) {
  await connectDB();
  return EngagementPrediction.find({ clientId }).sort({ predictedAt: -1 }).limit(limit);
}

export { SIGNAL_WEIGHTS };
