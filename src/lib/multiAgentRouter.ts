/**
 * Multi-Agent Router
 *
 * Evaluates routing rules to determine if a conversation should be
 * handed off from one AI persona to another.
 *
 * Uses fast keyword-based intent detection (no AI call) for quick analysis,
 * then evaluates configured routing conditions.
 */

import connectDB from '@/lib/mongodb';
import AgentRoutingRule from '@/models/AgentRoutingRule';
import type { IAgentRoutingRule, IRoutingCondition } from '@/models/AgentRoutingRule';

export interface RoutingContext {
  clientId: string;
  currentPersonaId: string;
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export interface RoutingDecision {
  shouldRoute: boolean;
  targetPersonaId: string | null;
  ruleName: string | null;
  handoffMessage: string;
  confidence: number;
}

interface QuickAnalysis {
  intents: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  isHandoffRequest: boolean;
  keywords: string[];
}

// Intent keyword mappings for fast detection
const INTENT_KEYWORDS: Record<string, string[]> = {
  pricing_inquiry: ['price', 'cost', 'how much', 'pricing', 'fee', 'rate', 'budget', 'expensive', 'cheap', 'afford'],
  booking_request: ['book', 'schedule', 'appointment', 'reserve', 'available', 'when can', 'slot', 'calendar'],
  complaint: ['unhappy', 'terrible', 'worst', 'awful', 'disappointed', 'frustrated', 'angry', 'unacceptable', 'broken'],
  support_request: ['help', 'issue', 'problem', 'not working', 'error', 'bug', 'fix', 'broken', 'stuck'],
  cancellation: ['cancel', 'unsubscribe', 'stop', 'end', 'terminate', 'refund', 'close account'],
  product_interest: ['interested', 'tell me more', 'features', 'what does', 'how does', 'demo', 'trial'],
  feature_request: ['wish', 'would be nice', 'can you add', 'feature', 'suggestion', 'improve'],
  billing: ['invoice', 'payment', 'charge', 'bill', 'receipt', 'subscription', 'plan'],
  general_question: ['what is', 'how do', 'where', 'when', 'why', 'explain'],
};

// Sentiment keywords
const NEGATIVE_KEYWORDS = [
  'angry',
  'frustrated',
  'terrible',
  'horrible',
  'worst',
  'hate',
  'awful',
  'disappointed',
  'unacceptable',
  'ridiculous',
  'upset',
  'furious',
];
const POSITIVE_KEYWORDS = [
  'great',
  'wonderful',
  'excellent',
  'amazing',
  'love',
  'fantastic',
  'awesome',
  'perfect',
  'thank',
  'appreciate',
  'happy',
  'satisfied',
];

// Handoff request patterns
const HANDOFF_PATTERNS = [
  'speak to a human',
  'talk to a person',
  'real person',
  'human agent',
  'transfer me',
  'speak to someone',
  'agent please',
  'operator',
  'talk to manager',
  'human please',
  'real agent',
  'live agent',
];

/**
 * Quick keyword-based analysis — no AI call, fast.
 */
export function quickAnalyze(message: string): QuickAnalysis {
  const lower = message.toLowerCase();

  // Detect intents
  const intents: string[] = [];
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        if (!intents.includes(intent)) intents.push(intent);
        break;
      }
    }
  }

  // Detect sentiment
  let sentimentScore = 0;
  for (const kw of NEGATIVE_KEYWORDS) {
    if (lower.includes(kw)) sentimentScore -= 1;
  }
  for (const kw of POSITIVE_KEYWORDS) {
    if (lower.includes(kw)) sentimentScore += 1;
  }
  const sentiment: 'positive' | 'negative' | 'neutral' =
    sentimentScore > 0 ? 'positive' : sentimentScore < 0 ? 'negative' : 'neutral';

  // Detect handoff request
  const isHandoffRequest = HANDOFF_PATTERNS.some((p) => lower.includes(p));

  // Extract matching keywords
  const keywords: string[] = [];
  const words = lower.split(/\s+/);
  for (const word of words) {
    if (word.length > 3) keywords.push(word);
  }

  return { intents, sentiment, isHandoffRequest, keywords };
}

/**
 * Evaluate a single condition against the analysis.
 */
export function matchCondition(condition: IRoutingCondition, analysis: QuickAnalysis, message: string): boolean {
  const lower = message.toLowerCase();
  const value = condition.value.toLowerCase();

  switch (condition.type) {
    case 'intent':
      switch (condition.operator) {
        case 'equals':
          return analysis.intents.includes(value);
        case 'contains':
          return analysis.intents.some((i) => i.includes(value));
        case 'not_equals':
          return !analysis.intents.includes(value);
        default:
          return analysis.intents.includes(value);
      }

    case 'keyword':
      switch (condition.operator) {
        case 'equals':
          return lower.split(/\s+/).includes(value);
        case 'contains':
          return lower.includes(value);
        case 'not_equals':
          return !lower.includes(value);
        default:
          return lower.includes(value);
      }

    case 'sentiment':
      switch (condition.operator) {
        case 'equals':
          return analysis.sentiment === value;
        case 'not_equals':
          return analysis.sentiment !== value;
        default:
          return analysis.sentiment === value;
      }

    case 'handoff_request':
      return analysis.isHandoffRequest;

    default:
      return false;
  }
}

/**
 * Evaluate all routing rules for a given context.
 * Returns a routing decision.
 */
export async function evaluateRouting(context: RoutingContext): Promise<RoutingDecision> {
  const noRoute: RoutingDecision = {
    shouldRoute: false,
    targetPersonaId: null,
    ruleName: null,
    handoffMessage: '',
    confidence: 0,
  };

  await connectDB();

  // Load active rules for this client, sorted by priority descending
  const rules: IAgentRoutingRule[] = await AgentRoutingRule.find({
    clientId: context.clientId,
    isActive: true,
  })
    .sort({ priority: -1 })
    .lean();

  if (rules.length === 0) return noRoute;

  // Quick analysis of the message
  const analysis = quickAnalyze(context.message);

  // Evaluate each rule
  for (const rule of rules) {
    // Check fromPersonaId filter
    if (rule.fromPersonaId !== '*' && rule.fromPersonaId !== context.currentPersonaId) {
      continue;
    }

    // Skip if routing to same persona
    if (rule.toPersonaId === context.currentPersonaId) {
      continue;
    }

    // No conditions = always match
    if (rule.conditions.length === 0) {
      return {
        shouldRoute: true,
        targetPersonaId: rule.toPersonaId,
        ruleName: rule.name,
        handoffMessage: rule.handoffMessage,
        confidence: 0.5,
      };
    }

    // Evaluate conditions based on matchMode
    const results = rule.conditions.map((cond) => matchCondition(cond, analysis, context.message));

    const matched = rule.matchMode === 'all' ? results.every(Boolean) : results.some(Boolean);

    if (matched) {
      const matchedCount = results.filter(Boolean).length;
      const confidence = matchedCount / rule.conditions.length;

      return {
        shouldRoute: true,
        targetPersonaId: rule.toPersonaId,
        ruleName: rule.name,
        handoffMessage: rule.handoffMessage,
        confidence,
      };
    }
  }

  return noRoute;
}
