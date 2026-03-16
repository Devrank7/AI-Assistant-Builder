// src/lib/builder/security.ts
import crypto from 'crypto';

// --- Code validation for agent-generated integration handlers ---

const BLOCKED_IMPORTS = ['child_process', 'fs', 'net', 'dgram', 'cluster', 'worker_threads', 'vm', 'tls', 'dns'];

const BLOCKED_PATTERNS = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bvm\s*\.\s*runIn/,
  /\bprocess\s*\.\s*exit/,
  /\bprocess\s*\.\s*kill/,
  /\bprocess\s*\.\s*env\b/,
  /\bglobal\s*\./,
  /\bglobalThis\s*\.\s*\w+\s*=/,
];

export function validateGeneratedCode(code: string): { valid: boolean; reason?: string } {
  // Check blocked imports
  for (const mod of BLOCKED_IMPORTS) {
    const importRegex = new RegExp(`(?:import|require)\\s*(?:\\(\\s*['"]|.*from\\s*['"])${mod}`, 'g');
    if (importRegex.test(code)) {
      return { valid: false, reason: `Blocked import: ${mod}` };
    }
  }

  // Check blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(code)) {
      return { valid: false, reason: `Blocked pattern: ${pattern.source}` };
    }
  }

  return { valid: true };
}

// --- AES-256-GCM encryption for user API keys ---

export function encryptApiKey(
  apiKey: string,
  encryptionKeyHex: string
): { encryptedKey: string; iv: string; authTag: string } {
  const key = Buffer.from(encryptionKeyHex, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return {
    encryptedKey: encrypted,
    iv: iv.toString('hex'),
    authTag,
  };
}

export function decryptApiKey(
  encryptedKey: string,
  ivHex: string,
  authTagHex: string,
  encryptionKeyHex: string
): string {
  const key = Buffer.from(encryptionKeyHex, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  let decrypted = decipher.update(encryptedKey, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// --- SSRF prevention ---

export function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p))) return true; // invalid = block

  // Localhost
  if (parts[0] === 127) return true;
  // 10.0.0.0/8
  if (parts[0] === 10) return true;
  // 172.16.0.0/12
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  // 192.168.0.0/16
  if (parts[0] === 192 && parts[1] === 168) return true;
  // Link-local 169.254.0.0/16 (includes metadata 169.254.169.254)
  if (parts[0] === 169 && parts[1] === 254) return true;
  // 0.0.0.0
  if (parts.every((p) => p === 0)) return true;

  return false;
}
