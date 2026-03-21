/**
 * Customer Memory System (Mem0-like)
 *
 * Extracts facts from conversations using Gemini,
 * stores them in CustomerProfile, and loads them into AI context.
 *
 * Flow:
 * 1. After each conversation, analyze messages for extractable facts
 * 2. Store facts in CustomerProfile (dedup by key)
 * 3. Before each AI call, load customer facts into system prompt
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import connectDB from '@/lib/mongodb';
import CustomerProfile, { type ICustomerFact } from '@/models/CustomerProfile';

// ── Fact Extraction ─────────────────────────────────────────────────────────

interface ExtractedFact {
  key: string;
  value: string;
  confidence: number;
}

/**
 * Extract facts from a conversation using Gemini.
 * Returns structured facts like: { key: "preferred_service", value: "teeth whitening", confidence: 0.9 }
 */
export async function extractFacts(messages: Array<{ role: string; content: string }>): Promise<ExtractedFact[]> {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });

    const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n');

    const prompt = `Analyze this conversation and extract customer facts. Return ONLY valid JSON array.

Each fact should have:
- key: short snake_case identifier (e.g., "name", "email", "phone", "preferred_service", "budget", "location", "company", "role", "preferred_time", "pain_point", "interest")
- value: the extracted value as a string
- confidence: 0-1 how confident you are

Only extract facts the customer explicitly stated or strongly implied. Do NOT guess.

Conversation:
${conversationText}

Return JSON array of facts (empty array if none found):`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const facts: ExtractedFact[] = JSON.parse(jsonMatch[0]);
    return facts.filter((f) => f.key && f.value && f.confidence >= 0.5);
  } catch (err) {
    console.error('[CustomerMemory] Fact extraction error:', err);
    return [];
  }
}

// ── Profile Management ──────────────────────────────────────────────────────

/**
 * Get or create a customer profile.
 */
export async function getOrCreateProfile(
  clientId: string,
  visitorId: string,
  channel: 'website' | 'telegram' | 'whatsapp' | 'instagram' = 'website'
): Promise<InstanceType<typeof CustomerProfile>> {
  await connectDB();

  let profile = await CustomerProfile.findOne({ clientId, visitorId });
  if (!profile) {
    profile = await CustomerProfile.create({
      clientId,
      visitorId,
      firstSeenAt: new Date(),
      lastActiveAt: new Date(),
    });
  }

  return profile;
}

/**
 * Update profile with new facts (dedup by key — newer facts win).
 */
export async function updateProfileFacts(
  clientId: string,
  visitorId: string,
  newFacts: ExtractedFact[]
): Promise<void> {
  if (newFacts.length === 0) return;
  await connectDB();

  const profile = await CustomerProfile.findOne({ clientId, visitorId });
  if (!profile) return;

  const factMap = new Map<string, ICustomerFact>();

  // Existing facts
  for (const f of profile.facts) {
    factMap.set(f.key, f);
  }

  // New facts override existing (if higher confidence)
  for (const f of newFacts) {
    const existing = factMap.get(f.key);
    if (!existing || f.confidence >= existing.confidence) {
      factMap.set(f.key, {
        key: f.key,
        value: f.value,
        source: 'conversation',
        confidence: f.confidence,
        extractedAt: new Date(),
      });
    }
  }

  // Update identity fields if found
  for (const f of newFacts) {
    if (f.key === 'name' && f.confidence >= 0.7) profile.name = f.value;
    if (f.key === 'email' && f.confidence >= 0.8) profile.email = f.value;
    if (f.key === 'phone' && f.confidence >= 0.8) profile.phone = f.value;
  }

  profile.facts = Array.from(factMap.values());
  profile.lastActiveAt = new Date();
  await profile.save();
}

/**
 * Record a visit/activity and increment counters.
 */
export async function recordActivity(
  clientId: string,
  visitorId: string,
  sessionId: string,
  messageCount: number = 0
): Promise<void> {
  await connectDB();

  await CustomerProfile.findOneAndUpdate(
    { clientId, visitorId },
    {
      $set: { lastActiveAt: new Date() },
      $inc: { visitCount: 1, messageCount },
      $addToSet: { sessionIds: sessionId },
    },
    { upsert: true }
  );
}

/**
 * Link identity (email/phone) to an existing visitor profile.
 * Also merges duplicate profiles if needed.
 */
export async function linkIdentity(
  clientId: string,
  visitorId: string,
  identity: { name?: string; email?: string; phone?: string; telegramChatId?: string; whatsappNumber?: string }
): Promise<void> {
  await connectDB();

  const update: Record<string, unknown> = { lastActiveAt: new Date() };
  if (identity.name) update.name = identity.name;
  if (identity.email) update.email = identity.email;
  if (identity.phone) update.phone = identity.phone;
  if (identity.telegramChatId) update.telegramChatId = identity.telegramChatId;
  if (identity.whatsappNumber) update.whatsappNumber = identity.whatsappNumber;

  await CustomerProfile.findOneAndUpdate({ clientId, visitorId }, { $set: update }, { upsert: true });
}

// ── Context Builder ─────────────────────────────────────────────────────────

/**
 * Build customer memory context for AI system prompt.
 * Returns a string to inject into the system prompt.
 */
export async function buildCustomerContext(clientId: string, visitorId: string): Promise<string> {
  await connectDB();

  const profile = await CustomerProfile.findOne({ clientId, visitorId }).lean();
  if (!profile) return '';

  const parts: string[] = [];

  // Identity
  const identityParts: string[] = [];
  if (profile.name) identityParts.push(`Name: ${profile.name}`);
  if (profile.email) identityParts.push(`Email: ${profile.email}`);
  if (profile.phone) identityParts.push(`Phone: ${profile.phone}`);
  if (identityParts.length > 0) parts.push(identityParts.join(', '));

  // Visit history
  parts.push(`Visits: ${profile.visitCount}, Messages: ${profile.messageCount}`);
  if (profile.totalRevenue > 0) parts.push(`Total spent: $${profile.totalRevenue.toFixed(2)}`);

  // Facts
  if (profile.facts && profile.facts.length > 0) {
    const factLines = profile.facts
      .filter((f: { confidence: number }) => f.confidence >= 0.6)
      .map((f: { key: string; value: string }) => `${f.key}: ${f.value}`)
      .join(', ');
    if (factLines) parts.push(`Known: ${factLines}`);
  }

  // Tags
  if (profile.tags && profile.tags.length > 0) {
    parts.push(`Tags: ${profile.tags.join(', ')}`);
  }

  // Sentiment
  if (profile.sentiment?.current && profile.sentiment.current !== 'unknown') {
    parts.push(`Sentiment: ${profile.sentiment.current} (${profile.sentiment.score.toFixed(1)})`);
  }

  // Buying signals
  if (profile.buyingSignals > 30) {
    parts.push(`Buying interest: ${profile.buyingSignals}%`);
  }

  if (parts.length === 0) return '';

  return `\n\nCUSTOMER PROFILE (returning visitor):\n${parts.join('\n')}`;
}

/**
 * Post-conversation processing: extract facts + update profile.
 * Call this after a chat session ends or periodically.
 */
export async function processConversation(
  clientId: string,
  visitorId: string,
  sessionId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    // Extract facts from conversation
    const facts = await extractFacts(messages);

    // Update profile
    await updateProfileFacts(clientId, visitorId, facts);
    await recordActivity(clientId, visitorId, sessionId, messages.filter((m) => m.role === 'user').length);
  } catch (err) {
    console.error('[CustomerMemory] processConversation error:', err);
  }
}
