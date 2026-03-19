/**
 * Persona Router
 *
 * Selects the best AI persona for a given message/context.
 * Uses keyword matching + intent labels to switch personas dynamically.
 */

import connectDB from '@/lib/mongodb';
import AgentPersona, { type IAgentPersona } from '@/models/AgentPersona';

/**
 * Load active personas for a client.
 */
export async function loadPersonas(clientId: string): Promise<IAgentPersona[]> {
  await connectDB();
  return AgentPersona.find({ clientId, isActive: true }).lean();
}

/**
 * Select the best persona based on message content and detected intents.
 * Returns the persona's system prompt overlay, or null for default behavior.
 */
export async function selectPersona(
  clientId: string,
  message: string,
  intents: string[] = []
): Promise<{ persona: IAgentPersona | null; overlay: string }> {
  const personas = await loadPersonas(clientId);
  if (personas.length === 0) return { persona: null, overlay: '' };

  const lower = message.toLowerCase();
  let bestMatch: IAgentPersona | null = null;
  let bestScore = 0;

  for (const persona of personas) {
    let score = 0;

    // Check keyword triggers
    for (const kw of persona.triggerKeywords || []) {
      if (lower.includes(kw.toLowerCase())) score += 2;
    }

    // Check intent triggers
    for (const intent of persona.triggerIntents || []) {
      if (intents.includes(intent)) score += 3;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = persona;
    }
  }

  // If no match, use default persona
  if (!bestMatch) {
    bestMatch = personas.find((p) => p.isDefault) || null;
  }

  if (!bestMatch) return { persona: null, overlay: '' };

  let overlay = '';
  if (bestMatch.systemPromptOverlay) {
    overlay = `\n\nACTIVE PERSONA: ${bestMatch.name} (${bestMatch.role})`;
    overlay += `\nTone: ${bestMatch.tone}`;
    overlay += `\n${bestMatch.systemPromptOverlay}`;
  }

  return { persona: bestMatch, overlay };
}

/**
 * Build persona context for system prompt.
 */
export function buildPersonaContext(persona: IAgentPersona | null): string {
  if (!persona) return '';

  let context = `\n\nYou are "${persona.name}"`;
  if (persona.role !== 'general') context += `, a ${persona.role} specialist`;
  context += `. Tone: ${persona.tone}.`;
  if (persona.language) context += ` Respond in ${persona.language}.`;
  if (persona.systemPromptOverlay) context += `\n${persona.systemPromptOverlay}`;

  return context;
}
