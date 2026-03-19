// src/lib/builder/codegenPrompt.ts

import { GEMINI_WIDGET_GUIDE } from './geminiWidgetGuide';

export const CODEGEN_SYSTEM_PROMPT = `You are a Preact widget code generator for WinBix AI.

${GEMINI_WIDGET_GUIDE}

## Output Rules

1. Keep all shared hook IMPORTS (import lines) even if a feature is removed — unused imports are harmless and prevent build errors
2. NEVER break the existing chat message flow (useChat integration)
3. NEVER use inline styles for layout — use Tailwind classes
4. NEVER import external libraries not already in the bundle
5. Export component as default function
6. When the user asks to REMOVE a feature (button, section, element), you MUST actually remove the JSX/rendering code for it. Keep the hook import but remove the UI rendering.
7. Use aw-* Tailwind classes for ALL colors — NEVER hardcode hex values
8. Keep the widget performant — no heavy computations in render
9. NEVER modify or add files in hooks/ directory
10. Components receive { ctx } as their only prop — destructure what you need from ctx

CRITICAL: Apply the INSTRUCTION faithfully. If the instruction says to remove something, remove it from the rendered output. If it says to add something, add it. Do not ignore or partially apply instructions.

OUTPUT: Return ONLY the complete modified file content. No explanations, no markdown fences, no comments about changes.`;

export function buildCodegenUserPrompt(params: {
  currentCode: string;
  instruction: string;
  themeJson?: string;
  widgetConfig?: string;
}): string {
  let prompt = `CURRENT FILE:\n\`\`\`jsx\n${params.currentCode}\n\`\`\`\n\n`;
  prompt += `INSTRUCTION: ${params.instruction}\n\n`;

  if (params.themeJson) {
    prompt += `THEME (colors/fonts reference):\n\`\`\`json\n${params.themeJson}\n\`\`\`\n\n`;
  }
  if (params.widgetConfig) {
    prompt += `WIDGET CONFIG:\n\`\`\`json\n${params.widgetConfig}\n\`\`\`\n\n`;
  }

  prompt += `Return the COMPLETE modified file. Include ALL parts of the file (imports, hooks, JSX) — but if the instruction asks to remove a UI element, actually remove that element's JSX code.`;
  return prompt;
}
