// src/lib/__tests__/exportCsv.test.ts
import { generateCsv } from '../exportCsv';

describe('generateCsv', () => {
  it('generates CSV string from data', () => {
    const data = [
      { name: 'Alice', email: 'alice@test.com' },
      { name: 'Bob', email: 'bob@test.com' },
    ];
    const csv = generateCsv(data, ['name', 'email']);
    expect(csv).toBe('name,email\nAlice,alice@test.com\nBob,bob@test.com');
  });

  it('escapes commas in values', () => {
    const data = [{ name: 'Doe, John', email: 'john@test.com' }];
    const csv = generateCsv(data, ['name', 'email']);
    expect(csv).toBe('name,email\n"Doe, John",john@test.com');
  });

  it('escapes quotes in values', () => {
    const data = [{ name: 'O"Brien', email: 'ob@test.com' }];
    const csv = generateCsv(data, ['name', 'email']);
    expect(csv).toBe('name,email\n"O""Brien",ob@test.com');
  });
});
