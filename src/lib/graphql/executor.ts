/**
 * Minimal GraphQL-like executor
 * Parses simple queries/mutations and dispatches to resolvers.
 * Not full spec compliance — covers common query patterns.
 */

import { resolvers, ResolverContext } from './resolvers';

interface ParsedOperation {
  type: 'query' | 'mutation';
  fields: ParsedField[];
}

interface ParsedField {
  name: string;
  args: Record<string, unknown>;
  subFields: string[];
}

/**
 * Simple regex-based parser for GraphQL-like queries.
 * Supports: query { field(arg: "val") { subfield } }
 * Supports variables via $varName references.
 */
export function parseQuery(queryString: string): ParsedOperation {
  const cleaned = queryString.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

  let type: 'query' | 'mutation' = 'query';
  if (/^\s*mutation\b/i.test(cleaned)) {
    type = 'mutation';
  }

  // Remove outer query/mutation wrapper
  const bodyMatch = cleaned.match(/(?:query|mutation)\s*(?:\w+\s*)?(?:\([^)]*\)\s*)?\{([\s\S]*)\}$/);
  const body = bodyMatch ? bodyMatch[1].trim() : cleaned.replace(/^\{|\}$/g, '').trim();

  const fields = parseFields(body);
  return { type, fields };
}

function parseFields(body: string): ParsedField[] {
  const fields: ParsedField[] = [];
  let remaining = body.trim();

  while (remaining.length > 0) {
    // Match field name
    const fieldMatch = remaining.match(/^(\w+)\s*/);
    if (!fieldMatch) break;

    const name = fieldMatch[1];
    remaining = remaining.slice(fieldMatch[0].length);

    // Parse arguments if present
    let args: Record<string, unknown> = {};
    if (remaining.startsWith('(')) {
      const argsEnd = findClosing(remaining, '(', ')');
      const argsStr = remaining.slice(1, argsEnd);
      args = parseArgs(argsStr);
      remaining = remaining.slice(argsEnd + 1).trim();
    }

    // Parse sub-fields if present
    let subFields: string[] = [];
    if (remaining.startsWith('{')) {
      const blockEnd = findClosing(remaining, '{', '}');
      const subBody = remaining.slice(1, blockEnd).trim();
      subFields = subBody.split(/[\s,]+/).filter(Boolean);
      remaining = remaining.slice(blockEnd + 1).trim();
    }

    fields.push({ name, args, subFields });
  }

  return fields;
}

function findClosing(str: string, open: string, close: string): number {
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === open) depth++;
    if (str[i] === close) depth--;
    if (depth === 0) return i;
  }
  return str.length - 1;
}

function parseArgs(argsStr: string): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  // Match key: value pairs (supports strings, numbers, booleans, objects)
  const argRegex = /(\w+)\s*:\s*("(?:[^"\\]|\\.)*"|[\w.]+|\{[^}]*\})/g;
  let match;
  while ((match = argRegex.exec(argsStr)) !== null) {
    const key = match[1];
    let value: unknown = match[2];
    // Remove quotes from strings
    if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value === 'true') {
      value = true;
    } else if (value === 'false') {
      value = false;
    } else if (typeof value === 'string' && !isNaN(Number(value))) {
      value = Number(value);
    } else if (typeof value === 'string' && value.startsWith('{')) {
      try {
        value = JSON.parse(value);
      } catch {
        /* keep as string */
      }
    }
    args[key] = value;
  }
  return args;
}

function substituteVariables(
  args: Record<string, unknown>,
  variables: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === 'string' && value.startsWith('$')) {
      const varName = value.slice(1);
      result[key] = variables[varName] !== undefined ? variables[varName] : value;
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function executeQuery(
  query: string,
  variables: Record<string, unknown> = {},
  context: ResolverContext
): Promise<{ data: Record<string, unknown> | null; errors: Array<{ message: string }> }> {
  try {
    const parsed = parseQuery(query);
    const data: Record<string, unknown> = {};
    const errors: Array<{ message: string }> = [];

    const resolverMap = parsed.type === 'mutation' ? resolvers.Mutation : resolvers.Query;

    for (const field of parsed.fields) {
      const resolver = resolverMap[field.name as keyof typeof resolverMap];
      if (!resolver) {
        errors.push({ message: `Field "${field.name}" not found in ${parsed.type}` });
        continue;
      }

      try {
        const resolvedArgs = substituteVariables(field.args, variables);
        const result = await (resolver as Function)(resolvedArgs, context);

        // If sub-fields specified, filter the result
        if (field.subFields.length > 0 && result) {
          if (Array.isArray(result)) {
            data[field.name] = result.map((item: Record<string, unknown>) => pickFields(item, field.subFields));
          } else {
            data[field.name] = pickFields(result as Record<string, unknown>, field.subFields);
          }
        } else {
          data[field.name] = result;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Resolver error';
        errors.push({ message: `Error in ${field.name}: ${message}` });
      }
    }

    return { data, errors: errors.length > 0 ? errors : [] };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Parse error';
    return { data: null, errors: [{ message }] };
  }
}

function pickFields(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const f of fields) {
    if (f in obj) result[f] = obj[f];
    // Support _id as string
    if (f === '_id' && obj._id) result._id = String(obj._id);
  }
  return result;
}
