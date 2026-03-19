/**
 * Inbox Manager
 *
 * Unified omnichannel inbox — manages conversation threads
 * from website, Telegram, WhatsApp, and Instagram.
 *
 * Features:
 * - Auto-create threads on first message
 * - Update thread on each new message
 * - AI-suggested replies
 * - Priority auto-assignment
 * - Thread resolution/snooze
 */

import connectDB from '@/lib/mongodb';
import InboxThread, { type InboxStatus, type InboxPriority } from '@/models/InboxMessage';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ── Thread Management ───────────────────────────────────────────────────────

/**
 * Create or update an inbox thread when a new message arrives.
 */
export async function upsertInboxThread(
  clientId: string,
  sessionId: string,
  channel: 'website' | 'telegram' | 'whatsapp' | 'instagram',
  message: string,
  role: 'user' | 'assistant' | 'agent',
  options?: {
    visitorId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  await connectDB();

  const update: Record<string, unknown> = {
    lastMessage: message.substring(0, 500),
    lastMessageAt: new Date(),
    lastMessageRole: role,
    $inc: { messageCount: 1 },
  };

  if (role === 'user') {
    (update as Record<string, unknown>)['$inc'] = { messageCount: 1, unreadCount: 1 };
  } else {
    (update as Record<string, unknown>)['$inc'] = { messageCount: 1 };
  }

  const setOnInsert: Record<string, unknown> = {
    clientId,
    sessionId,
    channel,
    status: 'open',
    priority: 'normal',
    tags: [],
  };

  if (options?.visitorId) setOnInsert.visitorId = options.visitorId;
  if (options?.customerName) update.customerName = options.customerName;
  if (options?.customerEmail) update.customerEmail = options.customerEmail;
  if (options?.customerPhone) update.customerPhone = options.customerPhone;

  await InboxThread.findOneAndUpdate(
    { clientId, sessionId },
    {
      $set: {
        lastMessage: message.substring(0, 500),
        lastMessageAt: new Date(),
        lastMessageRole: role,
        ...(options?.customerName ? { customerName: options.customerName } : {}),
        ...(options?.customerEmail ? { customerEmail: options.customerEmail } : {}),
        ...(options?.customerPhone ? { customerPhone: options.customerPhone } : {}),
      },
      $inc: role === 'user' ? { messageCount: 1, unreadCount: 1 } : { messageCount: 1 },
      $setOnInsert: setOnInsert,
    },
    { upsert: true }
  );
}

/**
 * Get inbox threads for a client with filtering.
 */
export async function getInboxThreads(
  clientId: string,
  options?: {
    status?: InboxStatus;
    channel?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }
): Promise<{ threads: InstanceType<typeof InboxThread>[]; total: number }> {
  await connectDB();

  const filter: Record<string, unknown> = { clientId };
  if (options?.status) filter.status = options.status;
  if (options?.channel) filter.channel = options.channel;
  if (options?.assignedTo) filter.assignedTo = options.assignedTo;

  const [threads, total] = await Promise.all([
    InboxThread.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .lean(),
    InboxThread.countDocuments(filter),
  ]);

  return { threads: threads as InstanceType<typeof InboxThread>[], total };
}

/**
 * Update thread status (resolve, snooze, assign).
 */
export async function updateThreadStatus(
  clientId: string,
  sessionId: string,
  updates: {
    status?: InboxStatus;
    priority?: InboxPriority;
    assignedTo?: string;
    snoozedUntil?: Date;
    tags?: string[];
  }
): Promise<void> {
  await connectDB();

  const set: Record<string, unknown> = {};
  if (updates.status) {
    set.status = updates.status;
    if (updates.status === 'resolved') set.resolvedAt = new Date();
  }
  if (updates.priority) set.priority = updates.priority;
  if (updates.assignedTo !== undefined) set.assignedTo = updates.assignedTo;
  if (updates.snoozedUntil) set.snoozedUntil = updates.snoozedUntil;
  if (updates.tags) set.tags = updates.tags;

  await InboxThread.findOneAndUpdate({ clientId, sessionId }, { $set: set });
}

/**
 * Mark thread as read.
 */
export async function markThreadRead(clientId: string, sessionId: string): Promise<void> {
  await connectDB();
  await InboxThread.findOneAndUpdate({ clientId, sessionId }, { $set: { unreadCount: 0 } });
}

/**
 * Generate AI-suggested reply for a thread.
 */
export async function generateSuggestedReply(
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string
): Promise<string | null> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

    const lastMessages = messages.slice(-6);
    const conversationText = lastMessages
      .map((m) => `${m.role === 'user' ? 'Customer' : 'Agent'}: ${m.content}`)
      .join('\n');

    const prompt = `You are a human customer support agent. Based on this conversation and the business context below, write a short, helpful reply to the customer.
Keep it concise (1-3 sentences). Be warm and professional.

Business context: ${systemPrompt.substring(0, 500)}

Conversation:
${conversationText}

Suggested reply:`;

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch {
    return null;
  }
}

/**
 * Get inbox stats for dashboard.
 */
export async function getInboxStats(clientId: string): Promise<{
  totalOpen: number;
  totalUnread: number;
  byChannel: Record<string, number>;
  byPriority: Record<string, number>;
  avgResponseTime?: number;
}> {
  await connectDB();

  const [open, unreadResult, channelAgg, priorityAgg] = await Promise.all([
    InboxThread.countDocuments({ clientId, status: { $in: ['open', 'assigned'] } }),
    InboxThread.aggregate([
      { $match: { clientId, status: { $in: ['open', 'assigned'] } } },
      { $group: { _id: null, total: { $sum: '$unreadCount' } } },
    ]),
    InboxThread.aggregate([
      { $match: { clientId, status: { $in: ['open', 'assigned'] } } },
      { $group: { _id: '$channel', count: { $sum: 1 } } },
    ]),
    InboxThread.aggregate([
      { $match: { clientId, status: { $in: ['open', 'assigned'] } } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]),
  ]);

  const byChannel: Record<string, number> = {};
  for (const c of channelAgg) byChannel[c._id] = c.count;

  const byPriority: Record<string, number> = {};
  for (const p of priorityAgg) byPriority[p._id] = p.count;

  return {
    totalOpen: open,
    totalUnread: unreadResult[0]?.total || 0,
    byChannel,
    byPriority,
  };
}
