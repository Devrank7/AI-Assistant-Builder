import { pluginRegistry } from '@/lib/integrations/core/PluginRegistry';

// Built-in tools that are always auto-approved (read-only / low risk)
const ALWAYS_AUTO: Set<string> = new Set(['collect_lead', 'search_knowledge', 'send_notification']);

// Action ID prefixes that indicate read-only operations (auto-approve)
const READ_PREFIXES = ['get', 'list', 'search', 'check', 'fetch', 'find'];

/**
 * Determine whether a tool call should execute immediately or require visitor confirmation.
 *
 * Priority:
 * 1. Built-in tools → always auto
 * 2. Owner override (autoApproveActions) → auto
 * 3. Action ID name heuristic: get_/list_/search_ → auto, create_/cancel_/update_/delete_ → confirm
 * 4. Default → confirm (safe fallback)
 *
 * Note: ActionDefinition does not have a `method` field, so we use name-based heuristics.
 * Tool names follow the pattern: {slug}_{actionId} (e.g., google-calendar_createEvent).
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

  // If we found an actionId, check if it's a read-only pattern
  if (actionId) {
    const lowerAction = actionId.toLowerCase();
    if (READ_PREFIXES.some((prefix) => lowerAction.startsWith(prefix))) {
      return 'auto';
    }
  }

  // 4. Default: confirm (safe)
  return 'confirm';
}
