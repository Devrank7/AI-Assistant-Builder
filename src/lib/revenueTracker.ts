/**
 * Revenue Attribution Tracker
 *
 * Tracks the full funnel: visit → chat → lead → booking/purchase → revenue.
 * Each stage is recorded as a RevenueEvent.
 * Aggregates per-client and per-customer for dashboard reporting.
 */

import connectDB from '@/lib/mongodb';
import RevenueEvent, { type RevenueFunnelStage } from '@/models/RevenueEvent';
import CustomerProfile from '@/models/CustomerProfile';

// ── Event Recording ─────────────────────────────────────────────────────────

export async function trackFunnelEvent(
  clientId: string,
  visitorId: string,
  sessionId: string,
  stage: RevenueFunnelStage,
  options?: {
    amount?: number;
    currency?: string;
    source?: string;
    integrationSlug?: string;
    externalId?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await connectDB();

  await RevenueEvent.create({
    clientId,
    visitorId,
    sessionId,
    stage,
    amount: options?.amount,
    currency: options?.currency || 'USD',
    source: options?.source || 'widget',
    integrationSlug: options?.integrationSlug,
    externalId: options?.externalId,
    metadata: options?.metadata,
  });

  // If it's a payment, update customer profile revenue
  if (stage === 'payment_completed' && options?.amount) {
    await CustomerProfile.findOneAndUpdate(
      { clientId, visitorId },
      {
        $inc: { totalRevenue: options.amount },
        $push: {
          revenueEvents: {
            amount: options.amount,
            currency: options.currency || 'USD',
            type: 'purchase',
            source: options.source || 'widget',
            timestamp: new Date(),
          },
        },
      }
    );
  }
}

// ── Funnel Analytics ────────────────────────────────────────────────────────

export interface FunnelMetrics {
  visits: number;
  chatsStarted: number;
  leadsCaptures: number;
  bookingsMade: number;
  paymentsCompleted: number;
  totalRevenue: number;
  conversionRate: number; // visit → payment
  chatToLeadRate: number;
  leadToPaymentRate: number;
}

export async function getFunnelMetrics(clientId: string, days: number = 30): Promise<FunnelMetrics> {
  await connectDB();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await RevenueEvent.find({
    clientId,
    createdAt: { $gte: since },
  })
    .select('stage amount')
    .lean();

  const counts: Record<string, number> = {
    visit: 0,
    chat_started: 0,
    lead_captured: 0,
    booking_made: 0,
    payment_completed: 0,
  };
  let totalRevenue = 0;

  for (const e of events) {
    counts[e.stage] = (counts[e.stage] || 0) + 1;
    if (e.stage === 'payment_completed' && e.amount) {
      totalRevenue += e.amount;
    }
  }

  const visits = counts.visit || 1; // Avoid division by zero
  const chats = counts.chat_started;
  const leads = counts.lead_captured;
  const payments = counts.payment_completed;

  return {
    visits: counts.visit,
    chatsStarted: chats,
    leadsCaptures: leads,
    bookingsMade: counts.booking_made,
    paymentsCompleted: payments,
    totalRevenue,
    conversionRate: visits > 0 ? (payments / visits) * 100 : 0,
    chatToLeadRate: chats > 0 ? (leads / chats) * 100 : 0,
    leadToPaymentRate: leads > 0 ? (payments / leads) * 100 : 0,
  };
}

/**
 * Get revenue over time (for charts).
 */
export async function getRevenueTimeline(
  clientId: string,
  days: number = 30
): Promise<Array<{ date: string; revenue: number; events: number }>> {
  await connectDB();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const pipeline = [
    {
      $match: {
        clientId,
        stage: 'payment_completed',
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        revenue: { $sum: '$amount' },
        events: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 as const } },
  ];

  const results = await RevenueEvent.aggregate(pipeline);

  return results.map((r) => ({
    date: r._id,
    revenue: r.revenue || 0,
    events: r.events,
  }));
}

/**
 * Get top customers by revenue.
 */
export async function getTopCustomersByRevenue(
  clientId: string,
  limit: number = 10
): Promise<Array<{ visitorId: string; name?: string; email?: string; totalRevenue: number; visits: number }>> {
  await connectDB();

  const customers = await CustomerProfile.find({ clientId, totalRevenue: { $gt: 0 } })
    .sort({ totalRevenue: -1 })
    .limit(limit)
    .select('visitorId name email totalRevenue visitCount')
    .lean();

  return customers.map((c) => ({
    visitorId: c.visitorId,
    name: c.name,
    email: c.email,
    totalRevenue: c.totalRevenue,
    visits: c.visitCount,
  }));
}
