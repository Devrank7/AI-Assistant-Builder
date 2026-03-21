/**
 * Conversation Intelligence Service
 *
 * Analyzes conversations using keyword matching and heuristics (no external AI APIs).
 * Detects buying signals, churn risk, competitor mentions, complaints, feature requests,
 * positive feedback, escalation needs, and upsell opportunities.
 */

import connectDB from '@/lib/mongodb';
import ConversationInsight, { type SignalType, type ISignal } from '@/models/ConversationInsight';

// ─── Keyword Dictionaries ─────────────────────────────────────────────────────

const SIGNAL_KEYWORDS: Record<SignalType, string[]> = {
  buying_signal: [
    'pricing',
    'how much',
    'cost',
    'price',
    'can i try',
    'free trial',
    'demo',
    'interested in',
    'want to buy',
    'purchase',
    'subscription',
    'sign up',
    'get started',
    'upgrade',
    'plan',
    'package',
    'quote',
    'invoice',
    'how do i order',
    'can i get',
    'ready to',
    'when can i start',
  ],
  churn_risk: [
    'cancel',
    'cancellation',
    'unsubscribe',
    'not working',
    'too expensive',
    'switching to',
    'going to leave',
    'considering leaving',
    'disappointed',
    'refund',
    'money back',
    'waste of money',
    'not worth',
    'stop using',
    'downgrade',
    'close my account',
    'delete my account',
    'quit',
    'leaving',
    'better alternatives',
  ],
  competitor_mention: [
    'intercom',
    'zendesk',
    'freshdesk',
    'hubspot',
    'drift',
    'tidio',
    'crisp',
    'tawk',
    'livechat',
    'salesforce',
    'zoho',
    'pipedrive',
    'competitor',
    'alternative',
    'instead of',
    'other option',
    'similar tool',
    'compared to',
    'versus',
    ' vs ',
  ],
  complaint: [
    'frustrated',
    'annoyed',
    'broken',
    "doesn't work",
    'not working',
    'error',
    'bug',
    'issue',
    'problem',
    'terrible',
    'awful',
    'horrible',
    'worst',
    'useless',
    'waste',
    'disappointed',
    'bad experience',
    'unhappy',
    'not happy',
    'this is ridiculous',
    'unacceptable',
  ],
  feature_request: [
    'would be nice',
    'can you add',
    'i wish',
    'feature request',
    'please add',
    'would love',
    'it would help',
    'suggestion',
    'improvement',
    'could you implement',
    'when will you',
    'is there a way',
    'do you support',
    'will you support',
    'missing feature',
    'need the ability',
    'looking for a way',
  ],
  positive_feedback: [
    'great',
    'love it',
    'amazing',
    'thank you',
    'helpful',
    'excellent',
    'fantastic',
    'awesome',
    'perfect',
    'brilliant',
    'well done',
    'impressed',
    'outstanding',
    'wonderful',
    'superb',
    'very good',
    'works great',
    'exactly what',
    'exactly what i needed',
    'solved my problem',
    'highly recommend',
  ],
  escalation_needed: [
    'speak to manager',
    'talk to manager',
    'supervisor',
    'human agent',
    'real person',
    'live agent',
    'this is urgent',
    'legal action',
    'file a complaint',
    'bbb',
    'report you',
    'speak to someone',
    'escalate',
    'want to speak',
    'i demand',
    'call me now',
  ],
  upsell_opportunity: [
    'looking for more',
    'need more',
    'want more',
    'expand',
    'grow',
    'additional users',
    'more seats',
    'enterprise',
    'team plan',
    'business plan',
    'advanced features',
    'more integrations',
    'premium',
    'pro plan',
    'upgrade plan',
    'more capabilities',
  ],
};

const POSITIVE_WORDS = new Set([
  'good',
  'great',
  'excellent',
  'amazing',
  'love',
  'perfect',
  'helpful',
  'fantastic',
  'wonderful',
  'awesome',
  'brilliant',
  'superb',
  'happy',
  'pleased',
  'satisfied',
  'thank',
  'thanks',
  'appreciate',
  'best',
  'enjoy',
]);

const NEGATIVE_WORDS = new Set([
  'bad',
  'terrible',
  'awful',
  'hate',
  'horrible',
  'broken',
  'useless',
  'frustrated',
  'annoyed',
  'disappointed',
  'angry',
  'upset',
  'problem',
  'issue',
  'error',
  'fail',
  'failed',
  'wrong',
  'worse',
  'worst',
]);

// ─── Analysis Helpers ─────────────────────────────────────────────────────────

function detectSignals(messages: Array<{ role: string; content: string; timestamp?: Date }>): ISignal[] {
  const detected: ISignal[] = [];
  const userMessages = messages.filter((m) => m.role === 'user');

  for (const [signalType, keywords] of Object.entries(SIGNAL_KEYWORDS) as [SignalType, string[]][]) {
    for (const msg of userMessages) {
      const lower = msg.content.toLowerCase();
      const matchedKeywords = keywords.filter((kw) => lower.includes(kw));
      if (matchedKeywords.length === 0) continue;

      // Confidence scales with number of matched keywords
      const confidence = Math.min(0.95, 0.6 + matchedKeywords.length * 0.1);
      const snippet = msg.content.length > 120 ? msg.content.slice(0, 120) + '...' : msg.content;

      // Avoid duplicate signal types — keep highest confidence
      const existing = detected.find((d) => d.type === signalType);
      if (existing) {
        if (confidence > existing.confidence) {
          existing.confidence = confidence;
          existing.text = snippet;
        }
      } else {
        detected.push({
          type: signalType,
          confidence,
          text: snippet,
          timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
        });
      }
    }
  }

  return detected;
}

function calculateSentiment(messages: Array<{ role: string; content: string }>): {
  overall: number;
  trend: 'improving' | 'declining' | 'stable';
} {
  const scores: number[] = [];

  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    const words = msg.content.toLowerCase().split(/\W+/);
    let score = 0;
    let count = 0;
    for (const word of words) {
      if (POSITIVE_WORDS.has(word)) {
        score += 1;
        count++;
      }
      if (NEGATIVE_WORDS.has(word)) {
        score -= 1;
        count++;
      }
    }
    if (count > 0) scores.push(score / count);
  }

  if (scores.length === 0) return { overall: 0, trend: 'stable' };

  const overall = scores.reduce((a, b) => a + b, 0) / scores.length;
  const clamped = Math.max(-1, Math.min(1, overall));

  // Trend: compare first half vs second half
  let trend: 'improving' | 'declining' | 'stable' = 'stable';
  if (scores.length >= 4) {
    const mid = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const secondHalf = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
    const diff = secondHalf - firstHalf;
    if (diff > 0.15) trend = 'improving';
    else if (diff < -0.15) trend = 'declining';
  }

  return { overall: Math.round(clamped * 100) / 100, trend };
}

function extractTopics(messages: Array<{ role: string; content: string }>): string[] {
  // Common stop words to filter out
  const stopWords = new Set([
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'up',
    'about',
    'into',
    'through',
    'during',
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'being',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'could',
    'should',
    'may',
    'might',
    'i',
    'you',
    'we',
    'they',
    'it',
    'my',
    'your',
    'our',
    'their',
    'this',
    'that',
    'these',
    'those',
    'can',
    'not',
    'just',
    'also',
    'when',
    'how',
    'what',
    'which',
    'who',
    'more',
    'some',
    'any',
    'all',
    'there',
    'here',
    'want',
    'need',
    'like',
    'get',
    'use',
    'help',
    'please',
    'thank',
    'thanks',
    'hi',
    'hello',
    'yes',
    'no',
    'ok',
    'okay',
    'sure',
    'know',
    'think',
  ]);

  const wordFreq = new Map<string, number>();
  const allText = messages
    .map((m) => m.content)
    .join(' ')
    .toLowerCase();
  const words = allText.split(/\W+/).filter((w) => w.length >= 4 && !stopWords.has(w));

  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  return Array.from(wordFreq.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
}

function generateSummary(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
  if (userMessages.length === 0) return '';

  // Take the first meaningful user messages as key points
  const points = userMessages
    .filter((m) => m.length > 20)
    .slice(0, 3)
    .map((m) => (m.length > 100 ? m.slice(0, 100) + '...' : m));

  return points.join(' ');
}

function generateActionItems(signals: ISignal[]): string[] {
  const items: string[] = [];
  const signalTypes = new Set(signals.map((s) => s.type));

  if (signalTypes.has('buying_signal')) {
    items.push('Follow up with a personalized pricing proposal');
  }
  if (signalTypes.has('churn_risk')) {
    items.push('Contact at-risk customer immediately with retention offer');
  }
  if (signalTypes.has('escalation_needed')) {
    items.push('Assign to senior support agent or manager');
  }
  if (signalTypes.has('complaint')) {
    items.push('Review complaint and send apology with resolution plan');
  }
  if (signalTypes.has('competitor_mention')) {
    items.push('Send competitive comparison document highlighting advantages');
  }
  if (signalTypes.has('feature_request')) {
    items.push('Log feature request and notify product team');
  }
  if (signalTypes.has('upsell_opportunity')) {
    items.push('Schedule upgrade call to present premium plan benefits');
  }
  if (signalTypes.has('positive_feedback')) {
    items.push('Request testimonial or review from satisfied customer');
  }

  return items;
}

// ─── Core Analysis Function ───────────────────────────────────────────────────

/**
 * Analyze a single conversation by clientId + conversationId (sessionId).
 * Fetches messages from ChatLog, runs heuristic analysis, stores/updates insight.
 */
export async function analyzeConversation(clientId: string, conversationId: string): Promise<void> {
  await connectDB();

  const ChatLog = (await import('@/models/ChatLog')).default;
  const chatLog = await ChatLog.findOne({ clientId, sessionId: conversationId }).lean();
  if (!chatLog || !chatLog.messages || chatLog.messages.length < 2) return;

  const messages = chatLog.messages as Array<{ role: string; content: string; timestamp?: Date }>;

  const signals = detectSignals(messages);
  const sentiment = calculateSentiment(messages);
  const topics = extractTopics(messages);
  const summary = generateSummary(messages);
  const actionItems = generateActionItems(signals);

  await ConversationInsight.findOneAndUpdate(
    { clientId, conversationId },
    {
      $set: {
        clientId,
        conversationId,
        sessionId: conversationId, // legacy compat
        signals,
        sentiment,
        topics,
        summary,
        actionItems,
        analyzedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );
}

// ─── Batch Analysis ───────────────────────────────────────────────────────────

/**
 * Analyze all conversations for a client that have not been analyzed yet
 * (or re-analyze all if force=true).
 */
export async function batchAnalyze(
  clientId: string,
  force = false
): Promise<{ analyzed: number; skipped: number; errors: number }> {
  await connectDB();

  const ChatLog = (await import('@/models/ChatLog')).default;

  // Get all conversation sessionIds for this client
  const chatLogs = await ChatLog.find({ clientId }).select('sessionId').lean();

  if (chatLogs.length === 0) return { analyzed: 0, skipped: 0, errors: 0 };

  // If not forcing, find which ones already have insights
  let toAnalyze = chatLogs.map((c) => c.sessionId as string);

  if (!force) {
    const existing = await ConversationInsight.find({ clientId }).select('conversationId').lean();
    const analyzed = new Set(existing.map((e) => e.conversationId));
    toAnalyze = toAnalyze.filter((id) => !analyzed.has(id));
  }

  let analyzed = 0;
  let skipped = 0;
  let errors = 0;

  // Process in batches of 20
  const BATCH_SIZE = 20;
  for (let i = 0; i < toAnalyze.length; i += BATCH_SIZE) {
    const batch = toAnalyze.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      batch.map(async (conversationId) => {
        try {
          await analyzeConversation(clientId, conversationId);
          analyzed++;
        } catch {
          errors++;
        }
      })
    );
  }

  skipped = chatLogs.length - toAnalyze.length;
  return { analyzed, skipped, errors };
}

// ─── Dashboard Data ───────────────────────────────────────────────────────────

export interface DashboardData {
  overview: {
    totalConversations: number;
    analyzedConversations: number;
    buyingSignals: number;
    buyingSignalsTrend: number; // % change vs previous period
    churnRisks: number;
    churnRisksTrend: number;
    avgSentiment: number; // -1 to 1
    avgSentimentFormatted: string; // "72%" style
  };
  signalsByType: Record<string, number>;
  sentimentTrend: Array<{ date: string; sentiment: number; count: number }>;
  topTopics: Array<{ topic: string; count: number }>;
  actionItems: Array<{
    type: string;
    text: string;
    priority: 'high' | 'medium' | 'low';
    conversationId: string;
    createdAt: string;
  }>;
  recentSignals: Array<{
    type: SignalType;
    confidence: number;
    text: string;
    conversationId: string;
    sentiment: number;
    createdAt: string;
  }>;
}

export async function getDashboardData(clientId: string, days: number = 30): Promise<DashboardData> {
  await connectDB();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const prevSince = new Date();
  prevSince.setDate(prevSince.getDate() - days * 2);

  const [currentInsights, prevInsights] = await Promise.all([
    ConversationInsight.find({ clientId, analyzedAt: { $gte: since } }).lean(),
    ConversationInsight.find({
      clientId,
      analyzedAt: { $gte: prevSince, $lt: since },
    }).lean(),
  ]);

  // Count signals
  let buyingSignals = 0;
  let churnRisks = 0;
  let prevBuyingSignals = 0;
  let prevChurnRisks = 0;
  const signalsByType: Record<string, number> = {};
  const topicFreq = new Map<string, number>();
  let totalSentiment = 0;
  let sentimentCount = 0;

  // Daily sentiment grouping
  const dailySentiment = new Map<string, { sum: number; count: number }>();

  for (const insight of currentInsights) {
    for (const signal of insight.signals || []) {
      signalsByType[signal.type] = (signalsByType[signal.type] || 0) + 1;
      if (signal.type === 'buying_signal') buyingSignals++;
      if (signal.type === 'churn_risk') churnRisks++;
    }

    if (insight.sentiment?.overall !== undefined) {
      totalSentiment += insight.sentiment.overall;
      sentimentCount++;
    }

    for (const topic of insight.topics || []) {
      topicFreq.set(topic, (topicFreq.get(topic) || 0) + 1);
    }

    // Group by date for trend chart
    const dateKey = new Date(insight.analyzedAt).toISOString().slice(0, 10);
    const dayEntry = dailySentiment.get(dateKey) || { sum: 0, count: 0 };
    if (insight.sentiment?.overall !== undefined) {
      dayEntry.sum += insight.sentiment.overall;
      dayEntry.count++;
    }
    dailySentiment.set(dateKey, dayEntry);
  }

  for (const insight of prevInsights) {
    for (const signal of insight.signals || []) {
      if (signal.type === 'buying_signal') prevBuyingSignals++;
      if (signal.type === 'churn_risk') prevChurnRisks++;
    }
  }

  // Trend calculations (% change)
  const buyingTrend =
    prevBuyingSignals > 0
      ? Math.round(((buyingSignals - prevBuyingSignals) / prevBuyingSignals) * 100)
      : buyingSignals > 0
        ? 100
        : 0;
  const churnTrend =
    prevChurnRisks > 0 ? Math.round(((churnRisks - prevChurnRisks) / prevChurnRisks) * 100) : churnRisks > 0 ? 100 : 0;

  const avgSentiment = sentimentCount > 0 ? totalSentiment / sentimentCount : 0;

  // Build sentiment trend — fill missing days with 0
  const sentimentTrend: Array<{ date: string; sentiment: number; count: number }> = [];
  for (let d = 0; d < days; d++) {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - d));
    const key = date.toISOString().slice(0, 10);
    const entry = dailySentiment.get(key);
    sentimentTrend.push({
      date: key,
      sentiment: entry && entry.count > 0 ? Math.round((entry.sum / entry.count) * 100) / 100 : 0,
      count: entry?.count || 0,
    });
  }

  // Top topics
  const topTopics = Array.from(topicFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([topic, count]) => ({ topic, count }));

  // Action items from recent high-priority signals
  const actionItems: DashboardData['actionItems'] = [];
  for (const insight of currentInsights.slice(-20)) {
    for (const signal of insight.signals || []) {
      if (signal.confidence < 0.65) continue;
      const priority: 'high' | 'medium' | 'low' =
        signal.type === 'churn_risk' || signal.type === 'escalation_needed'
          ? 'high'
          : signal.type === 'buying_signal' || signal.type === 'complaint'
            ? 'medium'
            : 'low';

      const actionMap: Record<string, string> = {
        buying_signal: 'Follow up with personalized pricing proposal',
        churn_risk: 'Contact at-risk customer with retention offer',
        escalation_needed: 'Assign to senior agent or manager',
        complaint: 'Review complaint and send resolution plan',
        competitor_mention: 'Send competitive comparison document',
        feature_request: 'Log feature request for product team',
        upsell_opportunity: 'Schedule upgrade call for premium plan',
        positive_feedback: 'Request testimonial or review',
      };

      if (actionMap[signal.type]) {
        actionItems.push({
          type: signal.type,
          text: actionMap[signal.type],
          priority,
          conversationId: insight.conversationId,
          createdAt: new Date(insight.analyzedAt).toISOString(),
        });
      }
    }
  }

  // Recent signals feed
  const recentSignals: DashboardData['recentSignals'] = [];
  for (const insight of currentInsights
    .sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime())
    .slice(0, 30)) {
    for (const signal of insight.signals || []) {
      recentSignals.push({
        type: signal.type,
        confidence: signal.confidence,
        text: signal.text,
        conversationId: insight.conversationId,
        sentiment: insight.sentiment?.overall || 0,
        createdAt: new Date(insight.analyzedAt).toISOString(),
      });
    }
  }

  // Count total conversations from ChatLog
  const ChatLog = (await import('@/models/ChatLog')).default;
  const totalConversations = await ChatLog.countDocuments({ clientId, createdAt: { $gte: since } });

  return {
    overview: {
      totalConversations,
      analyzedConversations: currentInsights.length,
      buyingSignals,
      buyingSignalsTrend: buyingTrend,
      churnRisks,
      churnRisksTrend: churnTrend,
      avgSentiment: Math.round(avgSentiment * 100) / 100,
      avgSentimentFormatted: `${Math.round((avgSentiment + 1) * 50)}%`,
    },
    signalsByType,
    sentimentTrend,
    topTopics,
    actionItems: actionItems
      .sort((a, b) => {
        const prio = { high: 0, medium: 1, low: 2 };
        return prio[a.priority] - prio[b.priority];
      })
      .slice(0, 15),
    recentSignals: recentSignals.slice(0, 50),
  };
}

// ─── Signals Feed ─────────────────────────────────────────────────────────────

export interface SignalFeedItem {
  _id: string;
  conversationId: string;
  type: SignalType;
  confidence: number;
  text: string;
  sentiment: number;
  topics: string[];
  summary: string;
  analyzedAt: string;
}

export async function getSignals(
  clientId: string,
  days: number = 30,
  type?: string,
  page: number = 1,
  limit: number = 20
): Promise<{ signals: SignalFeedItem[]; total: number; totalPages: number }> {
  await connectDB();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const filter: Record<string, unknown> = {
    clientId,
    analyzedAt: { $gte: since },
    'signals.0': { $exists: true }, // has at least one signal
  };

  if (type) {
    filter['signals.type'] = type;
  }

  const [insights, total] = await Promise.all([
    ConversationInsight.find(filter)
      .sort({ analyzedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    ConversationInsight.countDocuments(filter),
  ]);

  const signals: SignalFeedItem[] = [];

  for (const insight of insights) {
    for (const signal of insight.signals || []) {
      if (type && signal.type !== type) continue;
      signals.push({
        _id: String(insight._id),
        conversationId: insight.conversationId,
        type: signal.type,
        confidence: signal.confidence,
        text: signal.text,
        sentiment: insight.sentiment?.overall || 0,
        topics: insight.topics || [],
        summary: insight.summary || '',
        analyzedAt: new Date(insight.analyzedAt).toISOString(),
      });
    }
  }

  return {
    signals: signals.slice(0, limit),
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ─── Legacy exports (backwards compatibility) ─────────────────────────────────

export { getDashboardData as getInsightsSummary };

/**
 * Legacy wrapper used by agenticRouter and channelRouter.
 * Delegates to analyzeConversation which fetches messages from ChatLog.
 */
export async function processConversationIntelligence(
  clientId: string,
  sessionId: string,
  _visitorId: string,
  _messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    await analyzeConversation(clientId, sessionId);
  } catch {
    // Non-critical — don't break chat flow
  }
}
