import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ default: vi.fn().mockResolvedValue(undefined) }));

const mockFindOne = vi.fn();
const mockCreate = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock('@/models/ComplianceConfig', () => ({
  default: {
    findOne: (...args: unknown[]) => mockFindOne(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    findOneAndUpdate: (...args: unknown[]) => mockFindOneAndUpdate(...args),
  },
}));

import { getComplianceConfig, generateSOC2AuditReport, checkComplianceStatus } from '@/lib/complianceService';

describe('complianceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('getComplianceConfig creates default config if none exists', async () => {
    const defaultConfig = {
      organizationId: 'org1',
      hipaaMode: false,
      soc2AuditEnabled: false,
      gdprDpaGenerated: false,
      dataResidency: 'auto',
      retentionDays: 365,
      piiFields: ['email', 'phone', 'name', 'address'],
    };
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue(defaultConfig);

    const result = await getComplianceConfig('org1');
    expect(mockCreate).toHaveBeenCalledWith({ organizationId: 'org1' });
    expect(result.retentionDays).toBe(365);
    expect(result.dataResidency).toBe('auto');
  });

  it('generateSOC2AuditReport returns structured report', async () => {
    const config = {
      hipaaMode: true,
      soc2AuditEnabled: true,
      retentionDays: 365,
      dataResidency: 'eu',
      piiFields: ['email', 'phone'],
    };
    mockFindOne.mockResolvedValue(config);
    mockFindOneAndUpdate.mockResolvedValue(config);

    const result = await generateSOC2AuditReport('org1');
    expect(result.report).toBeDefined();
    expect(result.report.reportType).toBe('SOC2 Type II');
    expect(result.report.controls.encryption.status).toBe('compliant');
    expect(result.report.controls.dataRetention.retentionDays).toBe(365);
  });

  it('checkComplianceStatus returns action items for incomplete config', async () => {
    const config = {
      organizationId: 'org1',
      hipaaMode: false,
      soc2AuditEnabled: false,
      gdprDpaGenerated: false,
      dataResidency: 'auto',
      retentionDays: 365,
      piiFields: [],
    };
    mockFindOne.mockResolvedValue(config);

    const result = await checkComplianceStatus('org1');
    expect(result.hipaa.status).toBe('action_required');
    expect(result.hipaa.actionItems.length).toBeGreaterThan(0);
    expect(result.soc2.status).toBe('action_required');
    expect(result.gdpr.status).toBe('action_required');
    expect(result.gdpr.actionItems).toContain('Generate GDPR Data Processing Agreement');
  });
});
