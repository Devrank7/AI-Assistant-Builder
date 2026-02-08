/**
 * Handoff to Human Service
 *
 * Manages the transfer of conversations from AI to human operators.
 *
 * Flow:
 * 1. Customer sends a message with a handoff keyword ("оператор", "человек", etc.)
 * 2. AI detects it and creates a Handoff record with status "pending"
 * 3. Admin/operator gets notified (Telegram notification)
 * 4. Operator takes the handoff → status "active" → bot stops responding
 * 5. Operator resolves → status "resolved" → bot resumes
 *
 * While handoff is pending/active, channelRouter returns a human-is-coming message
 * instead of generating an AI response.
 */

import connectDB from '@/lib/mongodb';
import Handoff, { type HandoffChannel } from '@/models/Handoff';
import Client from '@/models/Client';
import { sendTelegram } from '@/lib/notifications';

// Keywords that trigger handoff (Russian + English)
const HANDOFF_KEYWORDS = [
  'оператор',
  'человек',
  'менеджер',
  'живой человек',
  'поговорить с человеком',
  'соединить с оператором',
  'позвать менеджера',
  'нужен человек',
  'human',
  'operator',
  'agent',
  'talk to human',
  'real person',
  'support agent',
  'live agent',
];

// Messages sent to the customer at different stages
const MESSAGES = {
  handoffCreated: 'Понял! Передаю вашу беседу оператору. Пожалуйста, подождите — с вами скоро свяжется специалист.',
  handoffAlreadyActive: 'Ваш запрос уже передан оператору. Пожалуйста, ожидайте — специалист скоро ответит.',
};

/**
 * Check if a message contains a handoff keyword
 */
export function detectHandoffRequest(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return HANDOFF_KEYWORDS.some((keyword) => lower.includes(keyword));
}

/**
 * Check if there's an active handoff for this session.
 * Returns the handoff record if found, null otherwise.
 */
export async function getActiveHandoff(
  clientId: string,
  sessionId: string
): Promise<{ status: 'pending' | 'active'; message: string } | null> {
  await connectDB();

  const handoff = await Handoff.findOne({
    clientId,
    sessionId,
    status: { $in: ['pending', 'active'] },
  }).lean();

  if (!handoff) return null;

  return {
    status: handoff.status as 'pending' | 'active',
    message: MESSAGES.handoffAlreadyActive,
  };
}

/**
 * Create a new handoff request.
 * Called when customer triggers handoff via keyword.
 */
export async function createHandoff(params: {
  clientId: string;
  sessionId: string;
  channel: HandoffChannel;
  customerName?: string;
  customerContact?: string;
  lastCustomerMessage: string;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  await connectDB();

  // Check if there's already an active handoff for this session
  const existing = await Handoff.findOne({
    clientId: params.clientId,
    sessionId: params.sessionId,
    status: { $in: ['pending', 'active'] },
  });

  if (existing) {
    return MESSAGES.handoffAlreadyActive;
  }

  // Create new handoff
  const handoff = await Handoff.create({
    clientId: params.clientId,
    sessionId: params.sessionId,
    channel: params.channel,
    status: 'pending',
    customerName: params.customerName,
    customerContact: params.customerContact,
    lastCustomerMessage: params.lastCustomerMessage,
    reason: 'Customer requested human operator',
    metadata: params.metadata,
    requestedAt: new Date(),
  });

  // Notify owner via Telegram
  notifyHandoff(
    params.clientId,
    handoff._id.toString(),
    params.channel,
    params.customerName,
    params.lastCustomerMessage
  ).catch((err) => console.error('[Handoff] Notification error:', err));

  return MESSAGES.handoffCreated;
}

/**
 * Send Telegram notification about a new handoff
 */
async function notifyHandoff(
  clientId: string,
  handoffId: string,
  channel: HandoffChannel,
  customerName?: string,
  lastMessage?: string
): Promise<void> {
  const client = await Client.findOne({ clientId }).select('telegram').lean();
  if (!client?.telegram) return;

  const channelLabel: Record<string, string> = {
    website: 'Виджет',
    telegram: 'Telegram',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
  };

  const msg =
    `🔔 <b>Запрос на оператора</b>\n\n` +
    `Канал: ${channelLabel[channel] || channel}\n` +
    (customerName ? `Клиент: ${customerName}\n` : '') +
    (lastMessage ? `Сообщение: «${lastMessage.slice(0, 200)}»\n` : '') +
    `\nID: <code>${handoffId}</code>\n` +
    `Перейдите в админ-панель для обработки.`;

  await sendTelegram(client.telegram, msg);
}

/**
 * Resolve a handoff — bot resumes responding.
 */
export async function resolveHandoff(handoffId: string): Promise<boolean> {
  await connectDB();

  const handoff = await Handoff.findByIdAndUpdate(
    handoffId,
    { status: 'resolved', resolvedAt: new Date() },
    { new: true }
  );

  return !!handoff;
}

/**
 * Assign a handoff to an operator.
 */
export async function assignHandoff(handoffId: string, assignedTo: string): Promise<boolean> {
  await connectDB();

  const handoff = await Handoff.findByIdAndUpdate(
    handoffId,
    { status: 'active', assignedTo, assignedAt: new Date() },
    { new: true }
  );

  return !!handoff;
}

export { MESSAGES as HANDOFF_MESSAGES };
