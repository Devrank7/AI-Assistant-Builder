import connectDB from './mongodb';
import EngagementPrediction, { type SignalType, type ISignal } from '@/models/EngagementPrediction';
import mongoose from 'mongoose';

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

  let totalWeight = 0;
  let weightedSum = 0;

  for (const signal of weightedSignals) {
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

  const byAction: Record<string, { total: number; correct: number; rate: number }> = {};
  for (const action of ['nudge', 'offer', 'none']) {
    const actionPreds = predictions.filter((p) => p.recommendedAction === action);
    const correctPreds = actionPreds.filter((p) => p.wasAccurate === true).length;
    byAction[action] = {
      total: actionPreds.length,
      correct: correctPreds,
      rate: actionPreds.length > 0 ? Math.round((correctPreds / actionPreds.length) * 100) : 0,
    };
  }

  return {
    total,
    accurate,
    inaccurate,
    accuracyRate: total > 0 ? Math.round((accurate / total) * 100) : 0,
    overall: total > 0 ? Math.round((accurate / total) * 100) : 0,
    totalPredictions: total,
    byAction,
  };
}

export async function listPredictions(clientId: string, limit = 50) {
  await connectDB();
  return EngagementPrediction.find({ clientId }).sort({ predictedAt: -1 }).limit(limit);
}

// ─── Buying signal keywords ───────────────────────────────────────────────────
const HOT_LEAD_KEYWORDS = [
  'price',
  'pricing',
  'cost',
  'how much',
  'purchase',
  'buy',
  'order',
  'payment',
  'subscribe',
  'subscription',
  'plan',
  'demo',
  'trial',
  'start',
  'sign up',
  'signup',
  'register',
  'interested',
  'ready',
  'asap',
  'urgent',
  'today',
  'now',
  'immediately',
  'credit card',
  'invoice',
  'discount',
  'promo',
  'coupon',
  'offer',
];

const CHURN_KEYWORDS = [
  'cancel',
  'cancellation',
  'refund',
  'unsubscribe',
  'quit',
  'leave',
  'stop',
  'disappointed',
  'unhappy',
  'frustrated',
  'terrible',
  'useless',
  'broken',
  'not working',
  "doesn't work",
  'bug',
  'issue',
  'problem',
  'error',
  'switch to',
  'alternative',
  'competitor',
];

function scoreMessageForBuying(text: string): number {
  const lower = text.toLowerCase();
  return HOT_LEAD_KEYWORDS.reduce((score, kw) => (lower.includes(kw) ? score + 10 : score), 0);
}

function scoreMessageForChurn(text: string): number {
  const lower = text.toLowerCase();
  return CHURN_KEYWORDS.reduce((score, kw) => (lower.includes(kw) ? score + 10 : score), 0);
}

// ─── Churn Risk ───────────────────────────────────────────────────────────────

export interface ChurnRiskContact {
  contactId: string;
  name: string | null;
  email: string | null;
  channel: string;
  riskScore: number; // 0-100
  daysSinceLastSeen: number;
  lastSeenAt: string;
  totalConversations: number;
  totalMessages: number;
  churnSignals: string[];
  recommendedAction: string;
}

export async function getChurnRisk(clientId: string): Promise<ChurnRiskContact[]> {
  await connectDB();

  const Contact = mongoose.models.Contact || mongoose.model('Contact', new mongoose.Schema({}, { strict: false }));

  // Get all contacts for this client, sorted by lastSeenAt
  const contacts = await Contact.find({ clientId }).sort({ lastSeenAt: 1 }).limit(200).lean();

  const now = Date.now();
  const results: ChurnRiskContact[] = [];

  for (const c of contacts as Array<Record<string, unknown>>) {
    const lastSeen = c.lastSeenAt
      ? new Date(c.lastSeenAt as string).getTime()
      : c.createdAt
        ? new Date(c.createdAt as string).getTime()
        : now;
    const daysSince = Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24));

    // Skip truly new contacts (less than 1 day old)
    if (daysSince < 1) continue;

    let riskScore = 0;
    const signals: string[] = [];

    // Time-based risk
    if (daysSince >= 30) {
      riskScore += 40;
      signals.push(`Inactive for ${daysSince} days`);
    } else if (daysSince >= 14) {
      riskScore += 25;
      signals.push(`Inactive for ${daysSince} days`);
    } else if (daysSince >= 7) {
      riskScore += 15;
      signals.push(`Inactive for ${daysSince} days`);
    }

    // Low engagement
    const totalMessages = (c.totalMessages as number) ?? 0;
    const totalConversations = (c.totalConversations as number) ?? 1;
    const msgsPerConv = totalConversations > 0 ? totalMessages / totalConversations : 0;
    if (msgsPerConv < 2) {
      riskScore += 20;
      signals.push('Very low engagement per conversation');
    } else if (msgsPerConv < 4) {
      riskScore += 10;
      signals.push('Below-average engagement');
    }

    // Churn keywords in recent chat logs
    const ChatLog = mongoose.models.ChatLog || mongoose.model('ChatLog', new mongoose.Schema({}, { strict: false }));
    const recentLogs = await ChatLog.find({ clientId, sessionId: { $regex: c.contactId as string, $options: 'i' } })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    let churnKeywordScore = 0;
    for (const log of recentLogs as Array<Record<string, unknown>>) {
      const msgs = (log.messages as Array<{ role: string; content: string }>) ?? [];
      for (const msg of msgs) {
        if (msg.role === 'user') {
          churnKeywordScore += scoreMessageForChurn(msg.content);
        }
      }
    }

    if (churnKeywordScore >= 20) {
      riskScore += 30;
      signals.push('Expressed dissatisfaction or cancellation intent');
    } else if (churnKeywordScore >= 10) {
      riskScore += 15;
      signals.push('Showed frustration signals');
    }

    riskScore = Math.min(riskScore, 100);

    // Only include contacts with meaningful risk
    if (riskScore < 20) continue;

    let recommendedAction = 'Monitor';
    if (riskScore >= 70) recommendedAction = 'Send urgent re-engagement offer';
    else if (riskScore >= 50) recommendedAction = 'Send personalized follow-up';
    else if (riskScore >= 30) recommendedAction = 'Schedule check-in message';

    results.push({
      contactId: c.contactId as string,
      name: (c.name as string | null) ?? null,
      email: (c.email as string | null) ?? null,
      channel: (c.channel as string) ?? 'web',
      riskScore,
      daysSinceLastSeen: daysSince,
      lastSeenAt: (c.lastSeenAt as string) ?? (c.createdAt as string),
      totalConversations: totalConversations,
      totalMessages: totalMessages,
      churnSignals: signals,
      recommendedAction,
    });
  }

  // Sort by risk score descending
  return results.sort((a, b) => b.riskScore - a.riskScore).slice(0, 50);
}

// ─── Hot Leads ────────────────────────────────────────────────────────────────

export interface HotLead {
  contactId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  channel: string;
  conversionProbability: number; // 0-100
  leadScore: number;
  leadTemp: string;
  buyingSignals: string[];
  lastSeenAt: string;
  totalConversations: number;
  totalMessages: number;
  recommendedAction: string;
}

export async function getHotLeads(clientId: string): Promise<HotLead[]> {
  await connectDB();

  const Contact = mongoose.models.Contact || mongoose.model('Contact', new mongoose.Schema({}, { strict: false }));

  // Get contacts sorted by lead score descending
  const contacts = await Contact.find({ clientId }).sort({ leadScore: -1 }).limit(100).lean();

  const now = Date.now();
  const results: HotLead[] = [];

  for (const c of contacts as Array<Record<string, unknown>>) {
    const leadScore = (c.leadScore as number) ?? 0;
    const leadTemp = (c.leadTemp as string) ?? 'cold';

    // Scan recent chat logs for buying signals — filter by this contact's sessions
    const ChatLog = mongoose.models.ChatLog || mongoose.model('ChatLog', new mongoose.Schema({}, { strict: false }));
    const contactId = c.contactId as string;
    const recentLogs = await ChatLog.find({
      clientId,
      $or: [
        { contactId },
        { sessionId: contactId },
        { visitorId: contactId },
        { sessionId: { $regex: contactId, $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    let buyingKeywordScore = 0;
    const buyingSignalsFound: string[] = [];

    for (const log of recentLogs as Array<Record<string, unknown>>) {
      const msgs = (log.messages as Array<{ role: string; content: string }>) ?? [];
      for (const msg of msgs) {
        if (msg.role === 'user') {
          const score = scoreMessageForBuying(msg.content);
          buyingKeywordScore += score;
          if (score > 0) {
            // Extract the matching keyword
            const lower = msg.content.toLowerCase();
            for (const kw of HOT_LEAD_KEYWORDS) {
              if (lower.includes(kw) && !buyingSignalsFound.includes(kw)) {
                buyingSignalsFound.push(kw);
              }
            }
          }
        }
      }
    }

    // Calculate conversion probability
    let prob = 0;
    if (leadTemp === 'hot') prob += 50;
    else if (leadTemp === 'warm') prob += 25;
    prob += Math.min(leadScore / 2, 30);
    prob += Math.min(buyingKeywordScore, 20);

    const lastSeen = c.lastSeenAt ? new Date(c.lastSeenAt as string).getTime() : now;
    const daysSince = Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24));
    // Recency bonus
    if (daysSince <= 1) prob += 10;
    else if (daysSince <= 3) prob += 5;
    else if (daysSince > 14) prob -= 10;

    prob = Math.min(Math.max(Math.round(prob), 0), 100);

    // Only include contacts with reasonable conversion probability
    if (prob < 25 && leadTemp === 'cold') continue;

    const scoreBreakdown = (c.scoreBreakdown as Array<{ reason: string; points: number }>) ?? [];
    const signals = [
      ...buyingSignalsFound.slice(0, 3).map((kw) => `Mentioned "${kw}"`),
      ...scoreBreakdown.slice(0, 2).map((b) => b.reason),
    ].filter(Boolean);

    if (signals.length === 0 && leadTemp !== 'cold') {
      signals.push(`Lead temperature: ${leadTemp}`);
    }

    let recommendedAction = 'Monitor';
    if (prob >= 70) recommendedAction = 'Reach out now — high conversion probability';
    else if (prob >= 50) recommendedAction = 'Send a personalized demo offer';
    else if (prob >= 30) recommendedAction = 'Nurture with relevant content';

    results.push({
      contactId: c.contactId as string,
      name: (c.name as string | null) ?? null,
      email: (c.email as string | null) ?? null,
      phone: (c.phone as string | null) ?? null,
      channel: (c.channel as string) ?? 'web',
      conversionProbability: prob,
      leadScore,
      leadTemp,
      buyingSignals: signals.slice(0, 4),
      lastSeenAt: (c.lastSeenAt as string) ?? (c.createdAt as string),
      totalConversations: (c.totalConversations as number) ?? 0,
      totalMessages: (c.totalMessages as number) ?? 0,
      recommendedAction,
    });
  }

  return results.sort((a, b) => b.conversionProbability - a.conversionProbability).slice(0, 30);
}

// ─── Peak Hours Forecast ──────────────────────────────────────────────────────

export interface PeakHoursForecast {
  hourlyDistribution: Array<{ hour: number; label: string; count: number; predicted: number }>;
  peakHour: number;
  peakDay: string;
  weekdayDistribution: Array<{ day: string; count: number }>;
}

export async function getPeakHoursForecast(clientId: string): Promise<PeakHoursForecast> {
  await connectDB();
  const ChatLog = mongoose.models.ChatLog || mongoose.model('ChatLog', new mongoose.Schema({}, { strict: false }));

  // Fetch last 90 days of chat logs
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const logs = await ChatLog.find({ clientId, createdAt: { $gte: since } })
    .select('createdAt')
    .lean();

  const hourCounts = new Array(24).fill(0);
  const dayCounts = new Array(7).fill(0);

  for (const log of logs as Array<{ createdAt: Date }>) {
    const d = new Date(log.createdAt);
    hourCounts[d.getHours()]++;
    dayCounts[d.getDay()]++;
  }

  const maxHourCount = Math.max(...hourCounts, 1);
  const hourlyDistribution = hourCounts.map((count, hour) => ({
    hour,
    label: `${hour.toString().padStart(2, '0')}:00`,
    count,
    predicted: Math.round((count / maxHourCount) * 100),
  }));

  const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayDistribution = dayCounts.map((count, i) => ({ day: dayNames[i], count }));
  const peakDayIndex = dayCounts.indexOf(Math.max(...dayCounts));

  return {
    hourlyDistribution,
    peakHour,
    peakDay: dayNames[peakDayIndex],
    weekdayDistribution,
  };
}

// ─── Weekly Forecast ──────────────────────────────────────────────────────────

export interface WeeklyForecast {
  days: Array<{
    date: string;
    label: string;
    predicted: number;
    historical: number;
  }>;
  totalPredicted: number;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
}

export async function getWeeklyForecast(clientId: string): Promise<WeeklyForecast> {
  await connectDB();
  const ChatLog = mongoose.models.ChatLog || mongoose.model('ChatLog', new mongoose.Schema({}, { strict: false }));

  // Get last 8 weeks of daily counts to build forecast
  const since = new Date(Date.now() - 56 * 24 * 60 * 60 * 1000);
  const logs = await ChatLog.find({ clientId, createdAt: { $gte: since } })
    .select('createdAt')
    .lean();

  // Bucket by day
  const dailyCounts: Record<string, number> = {};
  for (const log of logs as Array<{ createdAt: Date }>) {
    const key = new Date(log.createdAt).toISOString().slice(0, 10);
    dailyCounts[key] = (dailyCounts[key] ?? 0) + 1;
  }

  // Build last 4 weeks historical
  const weeklyTotals: number[] = [];
  for (let w = 3; w >= 0; w--) {
    let weekTotal = 0;
    for (let d = 0; d < 7; d++) {
      const date = new Date(Date.now() - (w * 7 + d) * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      weekTotal += dailyCounts[key] ?? 0;
    }
    weeklyTotals.push(weekTotal);
  }

  // Simple trend: compare last week to avg of prior 3 weeks
  const lastWeek = weeklyTotals[3];
  const priorAvg = (weeklyTotals[0] + weeklyTotals[1] + weeklyTotals[2]) / 3;
  const trendPercent = priorAvg > 0 ? Math.round(((lastWeek - priorAvg) / priorAvg) * 100) : 0;
  const trend: 'up' | 'down' | 'stable' = trendPercent > 5 ? 'up' : trendPercent < -5 ? 'down' : 'stable';

  // Predict next 7 days using day-of-week averages from historical data
  const dayOfWeekAvg = new Array(7).fill(0);
  const dayOfWeekCount = new Array(7).fill(0);
  for (const [key, count] of Object.entries(dailyCounts)) {
    const dow = new Date(key).getDay();
    dayOfWeekAvg[dow] += count;
    dayOfWeekCount[dow]++;
  }
  for (let i = 0; i < 7; i++) {
    dayOfWeekAvg[i] = dayOfWeekCount[i] > 0 ? dayOfWeekAvg[i] / dayOfWeekCount[i] : 0;
  }

  const trendMultiplier = 1 + trendPercent / 200; // gentle trend application
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const forecastDays = [];

  for (let d = 1; d <= 7; d++) {
    const futureDate = new Date(Date.now() + d * 24 * 60 * 60 * 1000);
    const dow = futureDate.getDay();
    const historical = Math.round(dayOfWeekAvg[dow]);
    const predicted = Math.max(0, Math.round(historical * trendMultiplier));
    forecastDays.push({
      date: futureDate.toISOString().slice(0, 10),
      label: dayLabels[dow],
      predicted,
      historical,
    });
  }

  const totalPredicted = forecastDays.reduce((s, d) => s + d.predicted, 0);

  return { days: forecastDays, totalPredicted, trend, trendPercent: Math.abs(trendPercent) };
}

export { SIGNAL_WEIGHTS };
