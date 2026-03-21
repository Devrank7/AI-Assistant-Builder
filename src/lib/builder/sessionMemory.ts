import connectDB from '@/lib/mongodb';
import BuilderSession from '@/models/BuilderSession';

/**
 * Load context from previous builder sessions for a user.
 * Returns a formatted summary string that can be appended to the system prompt.
 */
export async function loadSessionMemory(userId: string, currentSessionId?: string): Promise<string> {
  await connectDB();

  // Get last 5 sessions for this user, excluding current
  const query: Record<string, unknown> = { userId };
  if (currentSessionId) {
    query._id = { $ne: currentSessionId };
  }

  const sessions = await BuilderSession.find(query)
    .sort({ updatedAt: -1 })
    .limit(5)
    .select('widgetName clientId currentStage messages knowledgeUploaded connectedIntegrations updatedAt status')
    .lean();

  if (!sessions || sessions.length === 0) {
    return '';
  }

  // Build context summary
  const lines: string[] = ['## Previous Sessions Context'];

  for (const s of sessions) {
    const msgCount = s.messages?.length || 0;
    if (msgCount === 0) continue;

    const name = s.widgetName || s.clientId || 'Unnamed';
    const stage = s.currentStage || 'input';
    const status = s.status || 'unknown';
    const integrations = (s.connectedIntegrations || [])
      .filter((i: { status: string }) => i.status === 'connected')
      .map((i: { provider: string }) => i.provider);
    const lastDate = s.updatedAt ? new Date(s.updatedAt).toLocaleDateString() : 'unknown';

    lines.push(`- **${name}** (${stage}, ${status}) — ${msgCount} messages, last active ${lastDate}`);
    if (s.knowledgeUploaded) lines.push(`  - Knowledge base: uploaded`);
    if (integrations.length > 0) lines.push(`  - Integrations: ${integrations.join(', ')}`);
    if (s.clientId) lines.push(`  - Client ID: ${s.clientId}`);

    // Extract last assistant message as context hint (truncated)
    const lastAssistant = [...(s.messages || [])].reverse().find((m: { role: string }) => m.role === 'assistant');
    if (lastAssistant && lastAssistant.content) {
      const preview = lastAssistant.content.slice(0, 150).replace(/\n/g, ' ');
      lines.push(`  - Last context: "${preview}..."`);
    }
  }

  if (lines.length <= 1) return ''; // Only header, no actual sessions

  lines.push('');
  lines.push(
    'Use this context to provide continuity. If user references a previous widget or session, you know about it.'
  );

  return lines.join('\n');
}
