import type { Plan } from '@/models/User';

/** Numeric limits per plan. -1 means unlimited. */
export const PLAN_LIMITS: Record<Plan, { widgets: number; messagesPerMonth: number; abTests: number }> = {
  none: { widgets: 0, messagesPerMonth: 0, abTests: 0 },
  free: { widgets: 1, messagesPerMonth: 100, abTests: 0 },
  basic: { widgets: 1, messagesPerMonth: 1000, abTests: 0 },
  starter: { widgets: 3, messagesPerMonth: 1_000, abTests: 0 },
  pro: { widgets: -1, messagesPerMonth: -1, abTests: 2 },
  enterprise: { widgets: -1, messagesPerMonth: -1, abTests: -1 },
};

// ── Feature gating ──────────────────────────────────────────────────────────

export type PlanFeature =
  | 'custom_branding'
  | 'crm_integrations'
  | 'crm_hubspot_sheets'
  | 'customer_memory'
  | 'emotion_ai'
  | 'ai_personas'
  | 'multi_model'
  | 'conversation_intelligence'
  | 'auto_learning'
  | 'ab_testing'
  | 'api_access'
  | 'industry_templates'
  | 'channel_telegram'
  | 'channel_whatsapp'
  | 'channel_instagram'
  | 'enterprise_sso'
  | 'multi_agent'
  | 'voice_ai'
  | 'training_studio'
  | 'auto_evolving_knowledge'
  | 'white_label'
  | 'custom_domain'
  | 'omnichannel_inbox';

/** Minimum plan required for each feature */
const FEATURE_MIN_PLAN: Record<PlanFeature, Plan> = {
  custom_branding: 'starter',
  crm_hubspot_sheets: 'starter',
  customer_memory: 'starter',
  emotion_ai: 'starter',
  channel_telegram: 'starter',
  crm_integrations: 'pro',
  ai_personas: 'pro',
  multi_model: 'pro',
  conversation_intelligence: 'pro',
  auto_learning: 'pro',
  ab_testing: 'pro',
  api_access: 'pro',
  industry_templates: 'pro',
  channel_whatsapp: 'pro',
  channel_instagram: 'pro',
  enterprise_sso: 'enterprise',
  multi_agent: 'enterprise',
  voice_ai: 'enterprise',
  training_studio: 'enterprise',
  auto_evolving_knowledge: 'enterprise',
  white_label: 'enterprise',
  custom_domain: 'enterprise',
  omnichannel_inbox: 'enterprise',
};

/** Plan hierarchy for comparison (higher = more access) */
const PLAN_TIER: Record<Plan, number> = {
  none: 0,
  free: 1,
  basic: 2,
  starter: 3,
  pro: 4,
  enterprise: 5,
};

/**
 * Check if a user's plan has access to a specific feature.
 * Returns { allowed, requiredPlan } for use in API route guards.
 */
export function checkPlanFeature(plan: Plan, feature: PlanFeature): { allowed: boolean; requiredPlan: Plan } {
  const requiredPlan = FEATURE_MIN_PLAN[feature];
  const userTier = PLAN_TIER[plan] ?? 0;
  const requiredTier = PLAN_TIER[requiredPlan] ?? 0;
  return { allowed: userTier >= requiredTier, requiredPlan };
}

/** Friendly plan names for error messages */
const PLAN_NAMES: Record<Plan, string> = {
  none: 'None',
  free: 'Free',
  basic: 'Basic',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
};

/**
 * Guard helper: returns an error message string if feature is not allowed, or null if allowed.
 */
export function requirePlanFeature(plan: Plan, feature: PlanFeature, featureLabel?: string): string | null {
  const { allowed, requiredPlan } = checkPlanFeature(plan, feature);
  if (allowed) return null;
  const label = featureLabel || feature.replace(/_/g, ' ');
  return `${label} requires a ${PLAN_NAMES[requiredPlan]} plan or higher. Please upgrade to access this feature.`;
}

/** Which CRM providers each plan can access */
export const PLAN_CRM_PROVIDERS: Record<Plan, string[] | 'all'> = {
  none: [],
  free: [],
  basic: [],
  starter: ['hubspot', 'google_sheets'],
  pro: 'all',
  enterprise: 'all',
};

/** Which channels each plan can access */
export const PLAN_CHANNELS: Record<Plan, string[]> = {
  none: [],
  free: ['web'],
  basic: ['web'],
  starter: ['web', 'telegram'],
  pro: ['web', 'telegram', 'whatsapp', 'instagram'],
  enterprise: ['web', 'telegram', 'whatsapp', 'instagram'],
};

/**
 * Get the first day of the current billing month (UTC).
 */
export function getCurrentMonthStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Check if a user has exceeded their monthly message limit.
 * Returns { allowed: false, limit, used } if exceeded.
 */
export async function checkMessageLimit(
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; limit: number; used: number }> {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.none;

  // Unlimited plans
  if (limits.messagesPerMonth === -1) {
    return { allowed: true, limit: -1, used: 0 };
  }

  // No plan
  if (limits.messagesPerMonth === 0) {
    return { allowed: false, limit: 0, used: 0 };
  }

  // Count messages this month across all user's clients
  const { default: ChatLog } = await import('@/models/ChatLog');
  const { default: Client } = await import('@/models/Client');

  const monthStart = getCurrentMonthStart();

  // Get all clientIds owned by this user
  const clients = await Client.find({ userId }, { clientId: 1 }).lean();
  const clientIds = clients.map((c) => (c as { clientId: string }).clientId);

  if (clientIds.length === 0) {
    return { allowed: true, limit: limits.messagesPerMonth, used: 0 };
  }

  // Count user messages (role: 'user') this billing month
  const used = await ChatLog.countDocuments({
    clientId: { $in: clientIds },
    'messages.role': 'user',
    createdAt: { $gte: monthStart },
  });

  return {
    allowed: used < limits.messagesPerMonth,
    limit: limits.messagesPerMonth,
    used,
  };
}

/**
 * Check if a user can create more widgets.
 */
export async function checkWidgetLimit(
  userId: string,
  plan: Plan
): Promise<{ allowed: boolean; limit: number; used: number }> {
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.none;

  if (limits.widgets === -1) {
    return { allowed: true, limit: -1, used: 0 };
  }

  const { default: Client } = await import('@/models/Client');
  const used = await Client.countDocuments({ userId });

  return {
    allowed: used < limits.widgets,
    limit: limits.widgets,
    used,
  };
}
