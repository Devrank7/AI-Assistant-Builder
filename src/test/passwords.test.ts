import { describe, it, expect } from 'vitest';

describe('Password utilities', () => {
  it('should hash and verify a password', async () => {
    const { hashPassword, comparePassword } = await import('@/lib/passwords');
    const hash = await hashPassword('MySecret123!');
    expect(hash).not.toBe('MySecret123!');
    expect(hash.startsWith('$2a$') || hash.startsWith('$2b$')).toBe(true);
    expect(await comparePassword('MySecret123!', hash)).toBe(true);
    expect(await comparePassword('WrongPassword', hash)).toBe(false);
  });

  it('should validate password strength', async () => {
    const { validatePassword } = await import('@/lib/passwords');
    expect(validatePassword('short')).not.toBeNull();
    expect(validatePassword('abcdefghij')).not.toBeNull();
    expect(validatePassword('Abcdefgh1!')).toBeNull();
  });
});
