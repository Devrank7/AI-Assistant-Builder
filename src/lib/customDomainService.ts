import { randomBytes } from 'crypto';
import dns from 'dns/promises';
import connectDB from './mongodb';
import CustomDomain, { type ICustomDomain } from '@/models/CustomDomain';

const DOMAIN_REGEX = /^(?!:\/\/)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
const CNAME_TARGET = 'proxy.winbixai.com';

export function validateDomainFormat(domain: string): boolean {
  if (!domain || domain.length > 253) return false;
  return DOMAIN_REGEX.test(domain);
}

function generateVerificationToken(): string {
  return `winbix-verify-${randomBytes(16).toString('hex')}`;
}

export async function createDomain(organizationId: string, clientId: string, domain: string): Promise<ICustomDomain> {
  const normalizedDomain = domain.toLowerCase().trim();

  if (!validateDomainFormat(normalizedDomain)) {
    throw new Error('Invalid domain format');
  }

  await connectDB();

  const existing = await CustomDomain.findOne({ domain: normalizedDomain });
  if (existing) {
    throw new Error('Domain already registered');
  }

  const verificationToken = generateVerificationToken();

  const customDomain = await CustomDomain.create({
    organizationId,
    clientId,
    domain: normalizedDomain,
    verificationToken,
    cnameTarget: CNAME_TARGET,
    status: 'pending_verification',
  });

  return customDomain;
}

export async function verifyDomain(domainId: string): Promise<ICustomDomain> {
  await connectDB();

  const domain = await CustomDomain.findById(domainId);
  if (!domain) throw new Error('Domain not found');

  domain.lastCheckedAt = new Date();

  try {
    // Check CNAME record
    let cnameValid = false;
    try {
      const cnameRecords = await dns.resolveCname(domain.domain);
      cnameValid = cnameRecords.some((record) => record.toLowerCase() === CNAME_TARGET.toLowerCase());
    } catch {
      // CNAME not found
    }

    // Check TXT record for verification token
    let txtValid = false;
    try {
      const txtRecords = await dns.resolveTxt(domain.domain);
      const flatRecords = txtRecords.map((r) => r.join(''));
      txtValid = flatRecords.some((record) => record === domain.verificationToken);
    } catch {
      // TXT not found
    }

    if (cnameValid && txtValid) {
      domain.status = 'verified';
      domain.verifiedAt = new Date();
      domain.error = undefined;
    } else {
      const missing: string[] = [];
      if (!cnameValid) missing.push('CNAME record');
      if (!txtValid) missing.push('TXT verification record');
      domain.status = 'pending_verification';
      domain.error = `Missing: ${missing.join(', ')}`;
    }
  } catch (err) {
    domain.status = 'failed';
    domain.error = err instanceof Error ? err.message : 'DNS verification failed';
  }

  await domain.save();
  return domain;
}

export async function provisionSSL(domainId: string): Promise<ICustomDomain> {
  await connectDB();

  const domain = await CustomDomain.findById(domainId);
  if (!domain) throw new Error('Domain not found');
  if (domain.status !== 'verified') throw new Error('Domain must be verified before SSL provisioning');

  // In production, SSL is handled by reverse proxy (e.g., Caddy, nginx with certbot)
  // Here we mark the domain as active
  domain.status = 'active';
  domain.sslExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days
  await domain.save();

  return domain;
}

export async function getDomains(organizationId: string, clientId?: string): Promise<ICustomDomain[]> {
  await connectDB();

  const query: Record<string, string> = { organizationId };
  if (clientId) query.clientId = clientId;

  return CustomDomain.find(query).sort({ createdAt: -1 });
}

export async function deleteDomain(domainId: string, organizationId: string): Promise<void> {
  await connectDB();

  const domain = await CustomDomain.findOneAndDelete({
    _id: domainId,
    organizationId,
  });

  if (!domain) throw new Error('Domain not found');
}
