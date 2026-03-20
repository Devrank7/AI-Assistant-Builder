/**
 * Agent Store Service
 * Re-exports from agentStoreService for compatibility.
 * Also adds spec-required functions.
 */

export {
  listAgents as browseAgents,
  listAgents,
  submitAgent,
  getAgentById as getAgentDetail,
  installAgent,
  reviewAgent as rateAgent,
} from './agentStoreService';
