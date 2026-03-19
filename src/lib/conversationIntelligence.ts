/**
 * Conversation Intelligence
 *
 * Analyzes conversations for:
 * - Intent classification
 * - Buying signals detection
 * - Churn indicators
 * - Competitor mentions
 * - Upsell opportunities
 *
 * Uses lightweight Gemini calls for analysis.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import ConversationInsight, { type InsightType } from '@/models/ConversationInsight';
import CustomerProfile from '@/models/CustomerProfile';

interface AnalysisResult {
  intents: Array<{ label: string; confidence: number }>;
  buyingSignalScore: number; // 0-100
  churnRiskScore: number; // 0-100
  insights: Array<{
    type: InsightType;
    label: string;
    confidence: number;
    details: string;
  }>;
  suggestedTags: string[];
}

/**
 * Analyze a conversation for business intelligence.
 */
export async function analyzeConversation(messages: Array<{ role: string; content: string }>): Promise<AnalysisResult> {
  const defaultResult: AnalysisResult = {
    intents: [],
    buyingSignalScore: 0,
    churnRiskScore: 0,
    insights: [],
    suggestedTags: [],
  };

  if (messages.length < 2) return defaultResult;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

    const conversationText = messages
      .slice(-10)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const prompt = `Analyze this customer-business conversation. Return ONLY valid JSON.

{
  "intents": [{"label": "string", "confidence": 0.0-1.0}],
  "buyingSignalScore": 0-100,
  "churnRiskScore": 0-100,
  "insights": [{"type": "string", "label": "string", "confidence": 0.0-1.0, "details": "string"}],
  "suggestedTags": ["string"]
}

Intent labels: pricing_inquiry, booking_request, complaint, general_question, product_interest, support_request, cancellation, feature_request, comparison_shopping
Insight types: intent, buying_signal, churn_indicator, competitor_mention, complaint, feature_request, positive_feedback, escalation_needed, upsell_opportunity

Buying signals: asking about pricing, availability, booking process, "how do I buy", mentioning deadlines
Churn indicators: frustration, repeated complaints, mentioning alternatives, "cancel", "not working"

Conversation:
${conversationText}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return defaultResult;

    const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;
    return {
      intents: parsed.intents || [],
      buyingSignalScore: Math.min(100, Math.max(0, parsed.buyingSignalScore || 0)),
      churnRiskScore: Math.min(100, Math.max(0, parsed.churnRiskScore || 0)),
      insights: parsed.insights || [],
      suggestedTags: parsed.suggestedTags || [],
    };
  } catch (err) {
    console.error('[ConversationIntelligence] Analysis error:', err);
    return defaultResult;
  }
}

/**
 * Store analysis results in DB.
 */
export async function storeInsights(
  clientId: string,
  sessionId: string,
  visitorId: string | undefined,
  analysis: AnalysisResult
): Promise<void> {
  await connectDB();

  // Store individual insights
  const docs = analysis.insights
    .filter((i) => i.confidence >= 0.6)
    .map((i) => ({
      clientId,
      sessionId,
      visitorId,
      type: i.type,
      label: i.label,
      confidence: i.confidence,
      details: i.details,
    }));

  if (docs.length > 0) {
    await ConversationInsight.insertMany(docs);
  }

  // Update customer profile scores
  if (visitorId) {
    const update: Record<string, unknown> = {};
    if (analysis.buyingSignalScore > 0) update.buyingSignals = analysis.buyingSignalScore;
    if (analysis.churnRiskScore > 0) update.churnRisk = analysis.churnRiskScore;
    if (analysis.intents.length > 0) {
      update.topIntents = analysis.intents.slice(0, 5).map((i) => i.label);
    }

    const tagUpdate: Record<string, unknown> = {};
    if (analysis.suggestedTags.length > 0) {
      tagUpdate.$addToSet = { tags: { $each: analysis.suggestedTags } };
    }

    await CustomerProfile.findOneAndUpdate({ clientId, visitorId }, { $set: update, ...tagUpdate });
  }
}

/**
 * Get aggregated insights for a client (dashboard view).
 */
export async function getInsightsSummary(
  clientId: string,
  days: number = 30
): Promise<{
  topIntents: Array<{ label: string; count: number }>;
  avgBuyingSignal: number;
  avgChurnRisk: number;
  insightsByType: Record<string, number>;
  competitorMentions: Array<{ label: string; count: number }>;
  recentEscalations: number;
}> {
  await connectDB();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const insights = await ConversationInsight.find({
    clientId,
    createdAt: { $gte: since },
  }).lean();

  // Aggregate intents
  const intentCounts = new Map<string, number>();
  const typeCounts: Record<string, number> = {};
  const competitorCounts = new Map<string, number>();
  let escalations = 0;

  for (const i of insights) {
    // Type counts
    typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;

    if (i.type === 'intent') {
      intentCounts.set(i.label, (intentCounts.get(i.label) || 0) + 1);
    }
    if (i.type === 'competitor_mention') {
      competitorCounts.set(i.label, (competitorCounts.get(i.label) || 0) + 1);
    }
    if (i.type === 'escalation_needed') escalations++;
  }

  // Get avg scores from profiles
  const profileAgg = await CustomerProfile.aggregate([
    { $match: { clientId, lastActiveAt: { $gte: since } } },
    {
      $group: {
        _id: null,
        avgBuying: { $avg: '$buyingSignals' },
        avgChurn: { $avg: '$churnRisk' },
      },
    },
  ]);

  return {
    topIntents: Array.from(intentCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    avgBuyingSignal: profileAgg[0]?.avgBuying || 0,
    avgChurnRisk: profileAgg[0]?.avgChurn || 0,
    insightsByType: typeCounts,
    competitorMentions: Array.from(competitorCounts.entries())
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count),
    recentEscalations: escalations,
  };
}

/**
 * Full post-conversation analysis pipeline.
 * Call after conversation ends.
 */
export async function processConversationIntelligence(
  clientId: string,
  sessionId: string,
  visitorId: string | undefined,
  messages: Array<{ role: string; content: string }>
): Promise<AnalysisResult> {
  const analysis = await analyzeConversation(messages);
  await storeInsights(clientId, sessionId, visitorId, analysis);
  return analysis;
}
