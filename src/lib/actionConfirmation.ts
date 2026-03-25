import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

// Built-in tools that are always auto-approved (read-only / low risk)
const ALWAYS_AUTO: Set<string> = new Set(['collect_lead', 'search_knowledge', 'send_notification']);

// Action ID prefixes that are auto-approved.
// The AI agent already confirms with the user conversationally before calling
// write tools, so system-level confirmation is redundant and breaks the flow
// (Gemini receives "awaiting_confirmation" but generates "done!" text).
const AUTO_PREFIXES = ['get', 'list', 'search', 'check', 'fetch', 'find', 'send', 'create', 'book', 'update', 'notify'];

// Only truly destructive operations require system-level confirmation
const CONFIRM_PREFIXES = ['delete', 'cancel', 'remove', 'revoke'];

/**
 * Determine whether a tool call should execute immediately or require visitor confirmation.
 *
 * Priority:
 * 1. Built-in tools → always auto
 * 2. Owner override (autoApproveActions) → auto
 * 3. Destructive action heuristic: delete_/cancel_/remove_ → confirm
 * 4. Default → auto (the AI already confirms conversationally with the user)
 */
export function getConfirmationLevel(toolName: string, autoApproveActions: string[] = []): 'auto' | 'confirm' {
  // 1. Built-in always auto
  if (ALWAYS_AUTO.has(toolName)) return 'auto';

  // 2. Owner override
  if (autoApproveActions.includes(toolName)) return 'auto';

  // 3. Name-based heuristic — find the actionId by matching slug against registry
  const parts = toolName.split('_');
  let actionId = '';

  for (let i = 1; i < parts.length; i++) {
    const candidateSlug = parts.slice(0, i).join('_');
    // Also try hyphenated slug (registry uses hyphens, tool names use underscores)
    const hyphenSlug = candidateSlug.replace(/_/g, '-');
    if (pluginRegistry.get(candidateSlug) || pluginRegistry.get(hyphenSlug)) {
      actionId = parts.slice(i).join('_');
      break;
    }
  }

  // If we found an actionId, check destructive patterns first
  if (actionId) {
    const lowerAction = actionId.toLowerCase();
    if (CONFIRM_PREFIXES.some((prefix) => lowerAction.startsWith(prefix))) {
      return 'confirm';
    }
  }

  // 4. Default: auto — AI already confirms conversationally with the user
  return 'auto';
}
