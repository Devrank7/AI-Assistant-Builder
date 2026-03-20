/**
 * Agent Memory System
 *
 * Provides long-term memory for AI agent personas.
 * Loads past conversation context and extracts facts from new conversations.
 */

import connectDB from '@/lib/mongodb';
import AgentMemory from '@/models/AgentMemory';
import type { IAgentMemoryFact } from '@/models/AgentMemory';

/**
 * Load agent memory for a visitor-persona pair.
 * Returns a context string that can be injected into the system prompt.
 */
export async function loadAgentMemory(
  clientId: string,
  visitorId: string,
  personaId: string = 'default'
): Promise<string> {
  await connectDB();

  const memory = await AgentMemory.findOne({ clientId, visitorId, personaId }).lean();
  if (!memory) return '';

  const parts: string[] = [];

  // Add facts
  if (memory.facts && memory.facts.length > 0) {
    const factLines = memory.facts
      .filter((f: IAgentMemoryFact) => f.confidence >= 0.6)
      .map((f: IAgentMemoryFact) => `- ${f.key}: ${f.value}`)
      .join('\n');

    if (factLines) {
      parts.push(`\n\nKNOWN FACTS ABOUT THIS VISITOR:\n${factLines}`);
    }
  }

  // Add conversation summary
  if (memory.conversationSummary) {
    parts.push(`\nPREVIOUS CONVERSATION SUMMARY:\n${memory.conversationSummary}`);
  }

  // Add interaction count
  if (memory.interactionCount > 1) {
    parts.push(`\nThis is interaction #${memory.interactionCount} with this visitor.`);
  }

  return parts.join('\n');
}

/**
 * Extract facts from messages using simple heuristic patterns.
 * Falls back from AI extraction to rule-based extraction for reliability.
 */
function extractFactsFromMessages(messages: Array<{ role: string; content: string }>): IAgentMemoryFact[] {
  const facts: IAgentMemoryFact[] = [];
  const now = new Date();

  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    const text = msg.content;

    // Name detection
    const nameMatch = text.match(/(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
    if (nameMatch) {
      facts.push({ key: 'name', value: nameMatch[1].trim(), confidence: 0.9, extractedAt: now });
    }

    // Email detection
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      facts.push({ key: 'email', value: emailMatch[0], confidence: 0.95, extractedAt: now });
    }

    // Phone detection
    const phoneMatch = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) {
      facts.push({ key: 'phone', value: phoneMatch[0], confidence: 0.9, extractedAt: now });
    }

    // Location detection
    const locationMatch = text.match(/(?:i(?:'m| am) (?:from|in|located in|based in))\s+(.+?)(?:\.|$)/i);
    if (locationMatch) {
      facts.push({ key: 'location', value: locationMatch[1].trim(), confidence: 0.8, extractedAt: now });
    }

    // Budget detection
    const budgetMatch = text.match(/(?:budget|can spend|willing to pay|around)\s*\$?\s*([\d,]+(?:\.\d{2})?)/i);
    if (budgetMatch) {
      facts.push({ key: 'budget', value: `$${budgetMatch[1]}`, confidence: 0.8, extractedAt: now });
    }

    // Company detection
    const companyMatch = text.match(/(?:work(?:ing)? (?:at|for)|company is|from)\s+([A-Z][\w\s&]+?)(?:\.|,|$)/i);
    if (companyMatch) {
      facts.push({ key: 'company', value: companyMatch[1].trim(), confidence: 0.75, extractedAt: now });
    }
  }

  // Deduplicate by key, keeping highest confidence
  const deduped = new Map<string, IAgentMemoryFact>();
  for (const fact of facts) {
    const existing = deduped.get(fact.key);
    if (!existing || fact.confidence > existing.confidence) {
      deduped.set(fact.key, fact);
    }
  }

  return Array.from(deduped.values());
}

/**
 * Generate a brief conversation summary from messages.
 */
function summarizeConversation(messages: Array<{ role: string; content: string }>): string {
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content);
  if (userMessages.length === 0) return '';

  // Take last 3 user messages for summary
  const recent = userMessages.slice(-3);
  const topics = recent.map((m) => m.substring(0, 100)).join('; ');

  return `Visitor discussed: ${topics}`;
}

/**
 * Save agent memory after a conversation.
 * Extracts facts from messages and updates the memory record.
 */
export async function saveAgentMemory(
  clientId: string,
  visitorId: string,
  personaId: string = 'default',
  sessionId: string,
  messages: Array<{ role: string; content: string }>,
  maxFacts: number = 20
): Promise<void> {
  await connectDB();

  const newFacts = extractFactsFromMessages(messages);
  const summary = summarizeConversation(messages);

  const existing = await AgentMemory.findOne({ clientId, visitorId, personaId });

  if (existing) {
    // Merge new facts with existing, keeping highest confidence per key
    const factMap = new Map<string, IAgentMemoryFact>();
    for (const f of existing.facts) {
      factMap.set(f.key, f);
    }
    for (const f of newFacts) {
      const ex = factMap.get(f.key);
      if (!ex || f.confidence > ex.confidence) {
        factMap.set(f.key, f);
      }
    }

    // Limit to maxFacts, sorted by confidence desc
    const mergedFacts = Array.from(factMap.values())
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxFacts);

    existing.facts = mergedFacts;
    existing.sessionId = sessionId;
    existing.conversationSummary = summary || existing.conversationSummary;
    existing.lastInteraction = new Date();
    existing.interactionCount += 1;
    await existing.save();
  } else {
    await AgentMemory.create({
      clientId,
      visitorId,
      personaId,
      sessionId,
      facts: newFacts.slice(0, maxFacts),
      conversationSummary: summary,
      lastInteraction: new Date(),
      interactionCount: 1,
    });
  }
}
