import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '@/lib/encryption';
import { randomBytes } from 'crypto';

beforeAll(() => {
  // Set a test encryption key (32 bytes = 64 hex chars)
  process.env.ENCRYPTION_KEY = randomBytes(32).toString('hex');
});

describe('encryption', () => {
  it('should encrypt and decrypt a string correctly', () => {
    const original = 'my-secret-api-token-12345';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should produce different ciphertexts for same input (random IV)', () => {
    const original = 'same-input';
    const encrypted1 = encrypt(original);
    const encrypted2 = encrypt(original);
    expect(encrypted1).not.toBe(encrypted2);
    // But both decrypt to the same value
    expect(decrypt(encrypted1)).toBe(original);
    expect(decrypt(encrypted2)).toBe(original);
  });

  it('should handle empty strings', () => {
    const original = '';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should handle unicode strings', () => {
    const original = 'token-with-unicode-\u00e9\u00e0\u00fc-\u{1F600}';
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(original);
  });

  it('should fail to decrypt tampered data', () => {
    const encrypted = encrypt('secret');
    const parts = encrypted.split(':');
    // Tamper with the encrypted data
    parts[2] = 'ff' + parts[2].slice(2);
    const tampered = parts.join(':');
    expect(() => decrypt(tampered)).toThrow();
  });

  it('should fail to decrypt with wrong format', () => {
    expect(() => decrypt('not-valid-encrypted-data')).toThrow();
  });
});
