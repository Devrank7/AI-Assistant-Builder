// src/lib/builder/tools/index.ts
import { ToolRegistry } from '../toolRegistry';
import { coreTools } from './coreTools';
import { integrationTools } from './integrationTools';
import { proactiveTools } from './proactiveTools';

export function createToolRegistry(): ToolRegistry {
  const registry = new ToolRegistry();

  for (const tool of coreTools) registry.register(tool);
  for (const tool of integrationTools) registry.register(tool);
  for (const tool of proactiveTools) registry.register(tool);

  return registry;
}
