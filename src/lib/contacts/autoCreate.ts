// src/lib/contacts/autoCreate.ts
import { nanoid } from 'nanoid';
import connectDB from '@/lib/mongodb';
import Contact from '@/models/Contact';
import { calculateScore } from './scoring';
import { emitEvent } from '@/lib/events';

interface MessageContext {
  clientId: string;
  channel: 'web' | 'telegram' | 'whatsapp' | 'instagram';
  channelUserId: string; // telegram userId, whatsapp phone, web visitorId, etc.
  text: string;
  senderName?: string;
  metadata?: Record<string, string | undefined>;
}

/**
 * Called on every incoming message. Creates contact if new, updates if existing.
 * Returns contactId.
 */
export async function handleContactForMessage(ctx: MessageContext): Promise<string> {
  await connectDB();

  const channelField = `channelIds.${ctx.channel}` as const;
  let contact = await Contact.findOne({
    clientId: ctx.clientId,
    [channelField]: ctx.channelUserId,
  });

  const isNew = !contact;

  if (!contact) {
    contact = await Contact.create({
      contactId: nanoid(12),
      clientId: ctx.clientId,
      name: ctx.senderName || null,
      channel: ctx.channel,
      channelIds: { [ctx.channel]: ctx.channelUserId },
      lastSeenAt: new Date(),
      firstSeenAt: new Date(),
      totalConversations: 1,
      totalMessages: 1,
    });

    await emitEvent('contact:created', ctx.clientId, {
      contactId: contact.contactId,
      channel: ctx.channel,
      name: ctx.senderName || null,
    });
  } else {
    contact.totalMessages += 1;
    contact.lastSeenAt = new Date();
    if (ctx.senderName && !contact.name) {
      contact.name = ctx.senderName;
    }
    await contact.save();
  }

  // Recalculate score
  const allMessages = [ctx.text]; // Current message for keyword analysis
  const oldScore = contact.leadScore;
  const scoring = calculateScore({
    messages: allMessages,
    totalConversations: contact.totalConversations,
    totalMessages: contact.totalMessages,
    hasHandoff: false, // Will be set separately by handoff logic
    metadata: ctx.metadata || {},
  });

  // Merge new breakdown with existing (avoid duplicates by reason)
  const existingReasons = new Set(contact.scoreBreakdown.map((b) => b.reason));
  const newBreakdown = scoring.breakdown.filter((b) => !existingReasons.has(b.reason));
  if (newBreakdown.length > 0) {
    contact.scoreBreakdown.push(...newBreakdown);
    const totalScore = Math.min(
      contact.scoreBreakdown.reduce((s, b) => s + b.points, 0),
      100
    );
    contact.leadScore = totalScore;
    contact.leadTemp = totalScore >= 66 ? 'hot' : totalScore >= 31 ? 'warm' : 'cold';
    await contact.save();

    // Emit score change if threshold crossed
    const oldTemp = oldScore >= 66 ? 'hot' : oldScore >= 31 ? 'warm' : 'cold';
    if (contact.leadTemp !== oldTemp) {
      await emitEvent('contact:score_changed', ctx.clientId, {
        contactId: contact.contactId,
        oldScore,
        newScore: contact.leadScore,
        reason: newBreakdown.map((b) => b.reason).join(', '),
      });
    }
  }

  return contact.contactId;
}
