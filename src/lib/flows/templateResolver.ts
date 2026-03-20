// src/lib/flows/templateResolver.ts

export interface TemplateContext {
  contact: Record<string, unknown>;
  conversation: Record<string, unknown>;
  trigger: Record<string, unknown>;
  widget: Record<string, unknown>;
}

/**
 * Resolve {{double_brace}} variables in a template string.
 * Supports dotted paths like {{contact.name}}.
 */
export function resolveTemplate(template: string, ctx: TemplateContext): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_match, path: string) => {
    const parts = path.split('.');
    let value: unknown = ctx;
    for (const part of parts) {
      if (value && typeof value === 'object' && part in (value as Record<string, unknown>)) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return '';
      }
    }
    return String(value ?? '');
  });
}
