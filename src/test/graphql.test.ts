import { describe, it, expect } from 'vitest';
import { parseQuery } from '@/lib/graphql/executor';
import { getSchemaFields } from '@/lib/graphql/schema';

describe('graphql', () => {
  it('parseQuery parses a simple query with fields', () => {
    const parsed = parseQuery(`query { widgets { _id name status } }`);
    expect(parsed.type).toBe('query');
    expect(parsed.fields).toHaveLength(1);
    expect(parsed.fields[0].name).toBe('widgets');
    expect(parsed.fields[0].subFields).toContain('_id');
    expect(parsed.fields[0].subFields).toContain('name');
  });

  it('parseQuery parses a mutation with arguments', () => {
    const parsed = parseQuery(
      `mutation { createContact(input: {clientId: "abc", name: "John", email: "j@e.com"}) { _id name } }`
    );
    expect(parsed.type).toBe('mutation');
    expect(parsed.fields[0].name).toBe('createContact');
    expect(parsed.fields[0].args).toHaveProperty('input');
  });

  it('getSchemaFields returns all defined fields', () => {
    const fields = getSchemaFields();
    expect(fields.length).toBeGreaterThan(0);
    const queryNames = fields.filter((f) => f.type === 'Query').map((f) => f.name);
    expect(queryNames).toContain('widgets');
    expect(queryNames).toContain('chatLogs');
    expect(queryNames).toContain('analytics');
  });
});
