// src/lib/builder/__tests__/security.test.ts
import { describe, it, expect } from 'vitest';
import { validateGeneratedCode, encryptApiKey, decryptApiKey, isPrivateIP } from '../security';

describe('validateGeneratedCode', () => {
  it('allows safe code', () => {
    const code = `import { NextRequest } from 'next/server';
export async function POST(req: NextRequest) {
  const data = await req.json();
  const res = await fetch('https://api.calendly.com/events', {
    headers: { Authorization: 'Bearer ' + apiKey },
  });
  return Response.json(await res.json());
}`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(true);
  });

  it('blocks child_process import', () => {
    const code = `import { exec } from 'child_process'; exec('rm -rf /');`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('child_process');
  });

  it('blocks eval', () => {
    const code = `eval(userInput);`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
  });

  it('blocks fs module', () => {
    const code = `import fs from 'fs'; fs.readFileSync('/etc/passwd');`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
  });

  it('blocks process.env direct access', () => {
    const code = `const key = process.env.SECRET;`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
  });

  it('blocks new Function()', () => {
    const code = `const fn = new Function('return 1');`;
    const result = validateGeneratedCode(code);
    expect(result.valid).toBe(false);
  });
});

describe('encryptApiKey / decryptApiKey', () => {
  it('round-trips encryption', () => {
    const encryptionKey = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 64 hex = 32 bytes
    const apiKey = 'sk-test-12345-abcdef';
    const encrypted = encryptApiKey(apiKey, encryptionKey);
    expect(encrypted.encryptedKey).toBeTruthy();
    expect(encrypted.iv).toBeTruthy();
    expect(encrypted.authTag).toBeTruthy();
    const decrypted = decryptApiKey(encrypted.encryptedKey, encrypted.iv, encrypted.authTag, encryptionKey);
    expect(decrypted).toBe(apiKey);
  });
});

describe('isPrivateIP', () => {
  it('blocks localhost', () => {
    expect(isPrivateIP('127.0.0.1')).toBe(true);
  });
  it('blocks 10.x', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true);
  });
  it('blocks 192.168.x', () => {
    expect(isPrivateIP('192.168.1.1')).toBe(true);
  });
  it('blocks 172.16-31.x', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('172.31.255.255')).toBe(true);
  });
  it('blocks metadata IP', () => {
    expect(isPrivateIP('169.254.169.254')).toBe(true);
  });
  it('allows public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('104.16.0.1')).toBe(false);
  });
});
