import { randomBytes } from 'crypto';

/**
 * Generate a secure random token for client authentication
 * @returns A 32-character hexadecimal token
 */
export function generateClientToken(): string {
    return randomBytes(16).toString('hex');
}
