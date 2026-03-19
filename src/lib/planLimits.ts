import type { Plan } from '@/models/User';

/** Numeric limits per plan. -1 means unlimited. */
export const PLAN_LIMITS: Record<Plan, { widgets: number; messagesPerMonth: number }> = {
  none: { widgets: 0, messagesPerMonth: 0 },
  free: { widgets: 1, messagesPerMonth: 100 },
  basic: { widgets: 1, messagesPerMonth: 1000 },
  starter: { widgets: 3, messagesPerMonth: 1000 },
  pro: { widgets: -1, messagesPerMonth: -1 },
  enterprise: { widgets: -1, messagesPerMonth: -1 },
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
