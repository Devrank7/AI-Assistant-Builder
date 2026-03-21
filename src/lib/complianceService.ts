import connectDB from './mongodb';
import ComplianceConfig, { IComplianceConfig } from '@/models/ComplianceConfig';

// ---------------------------------------------------------------------------
// Score calculation
// ---------------------------------------------------------------------------

export function calculateSOC2Score(config: Partial<IComplianceConfig>): number {
  const checks = [
    config.soc2Enabled,
    config.auditLogging,
    config.encryptionAtRest,
    config.accessControl,
    config.incidentResponsePlan,
    config.mfaRequired,
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

export function calculateHIPAAScore(config: Partial<IComplianceConfig>): number {
  const checks = [
    config.hipaaMode,
    config.piiEncryption,
    config.accessAuditTrail,
    config.dataMinimization,
    config.breachNotificationPlan,
    config.encryptionAtRest,
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

export function calculateGDPRScore(config: Partial<IComplianceConfig>): number {
  const checks = [
    config.gdprConsent,
    config.rightToErasure,
    config.dataPortability,
    config.cookieConsent,
    config.dpaGenerated,
    config.dataResidency === 'EU',
  ];
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
}

export function calculateComplianceScore(config: Partial<IComplianceConfig>): {
  soc2: number;
  hipaa: number;
  gdpr: number;
  overall: number;
} {
  const soc2 = calculateSOC2Score(config);
  const hipaa = calculateHIPAAScore(config);
  const gdpr = calculateGDPRScore(config);
  // Weighted: SOC2 40%, HIPAA 30%, GDPR 30%
  const overall = Math.round(soc2 * 0.4 + hipaa * 0.3 + gdpr * 0.3);
  return { soc2, hipaa, gdpr, overall };
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

export async function getComplianceConfig(orgId: string): Promise<IComplianceConfig> {
  await connectDB();
  let config = await ComplianceConfig.findOne({ organizationId: orgId });
  if (!config) {
    const scores = calculateComplianceScore({});
    config = await ComplianceConfig.create({
      organizationId: orgId,
      soc2Score: scores.soc2,
      hipaaScore: scores.hipaa,
      gdprScore: scores.gdpr,
      complianceScore: scores.overall,
    });
  }
  return config;
}

export async function updateComplianceConfig(
  orgId: string,
  updates: Record<string, unknown>,
  actorEmail = 'system'
): Promise<IComplianceConfig> {
  await connectDB();

  // Strip score fields from incoming updates — we recalculate them
  const {
    complianceScore: _cs,
    soc2Score: _s2,
    hipaaScore: _hs,
    gdprScore: _gs,
    ...safeUpdates
  } = updates as Record<string, unknown>;
  void _cs;
  void _s2;
  void _hs;
  void _gs;

  // Fetch current config so we can merge for score calculation
  const current = await getComplianceConfig(orgId);
  const merged = { ...current.toObject(), ...safeUpdates };

  const scores = calculateComplianceScore(merged as Partial<IComplianceConfig>);

  const auditEntry = {
    action: 'settings_updated',
    user: actorEmail,
    timestamp: new Date(),
    details: `Updated fields: ${Object.keys(safeUpdates).join(', ')}`,
  };

  const updated = await ComplianceConfig.findOneAndUpdate(
    { organizationId: orgId },
    {
      $set: {
        ...safeUpdates,
        soc2Score: scores.soc2,
        hipaaScore: scores.hipaa,
        gdprScore: scores.gdpr,
        complianceScore: scores.overall,
      },
      $push: {
        auditLog: {
          $each: [auditEntry],
          $slice: -500, // keep last 500 entries
        },
      },
    },
    { new: true, upsert: true }
  );

  return updated!;
}

// ---------------------------------------------------------------------------
// Audit log (paginated)
// ---------------------------------------------------------------------------

export async function getAuditLog(
  orgId: string,
  page = 1,
  limit = 20,
  search = ''
): Promise<{ entries: unknown[]; total: number; page: number; totalPages: number }> {
  await connectDB();
  const config = await ComplianceConfig.findOne({ organizationId: orgId }).select('auditLog');
  if (!config) return { entries: [], total: 0, page, totalPages: 0 };

  let entries = [...config.auditLog].reverse(); // newest first

  if (search) {
    const lower = search.toLowerCase();
    entries = entries.filter(
      (e) =>
        e.action.toLowerCase().includes(lower) ||
        e.user.toLowerCase().includes(lower) ||
        e.details.toLowerCase().includes(lower)
    );
  }

  const total = entries.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = entries.slice(start, start + limit);

  return { entries: paginated, total, page, totalPages };
}

// ---------------------------------------------------------------------------
// Compliance status summary
// ---------------------------------------------------------------------------

export async function checkComplianceStatus(orgId: string) {
  const config = await getComplianceConfig(orgId);
  const scores = calculateComplianceScore(config.toObject());

  return {
    soc2: scores.soc2,
    hipaa: scores.hipaa,
    gdpr: scores.gdpr,
    overall: scores.overall,
    lastAuditDate: config.lastAuditDate || null,
    nextAuditDate: config.nextAuditDate || null,
    dataResidency: config.dataResidency,
    retentionDays: config.retentionDays,
    mfaRequired: config.mfaRequired,
    ipWhitelistCount: config.ipWhitelist?.length ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Compliance report export
// ---------------------------------------------------------------------------

export async function exportComplianceReport(orgId: string, actorEmail = 'system') {
  await connectDB();
  const config = await getComplianceConfig(orgId);
  const scores = calculateComplianceScore(config.toObject());

  // Record audit entry for the export itself
  await ComplianceConfig.findOneAndUpdate(
    { organizationId: orgId },
    {
      $set: { lastAuditExport: new Date() },
      $push: {
        auditLog: {
          $each: [
            {
              action: 'report_exported',
              user: actorEmail,
              timestamp: new Date(),
              details: 'Full compliance report exported',
            },
          ],
          $slice: -500,
        },
      },
    }
  );

  const report = {
    meta: {
      organizationId: orgId,
      generatedAt: new Date().toISOString(),
      generatedBy: actorEmail,
      reportVersion: '2.0',
    },
    scores: {
      overall: scores.overall,
      soc2: scores.soc2,
      hipaa: scores.hipaa,
      gdpr: scores.gdpr,
    },
    soc2: {
      enabled: config.soc2Enabled,
      auditLogging: config.auditLogging,
      encryptionAtRest: config.encryptionAtRest,
      accessControl: config.accessControl,
      incidentResponsePlan: config.incidentResponsePlan,
      mfaRequired: config.mfaRequired,
    },
    hipaa: {
      mode: config.hipaaMode,
      piiEncryption: config.piiEncryption,
      accessAuditTrail: config.accessAuditTrail,
      dataMinimization: config.dataMinimization,
      breachNotificationPlan: config.breachNotificationPlan,
    },
    gdpr: {
      consentManagement: config.gdprConsent,
      rightToErasure: config.rightToErasure,
      dataPortability: config.dataPortability,
      cookieConsent: config.cookieConsent,
      dpaGenerated: config.dpaGenerated,
      dpaGeneratedAt: config.dpaGeneratedAt || null,
    },
    dataGovernance: {
      dataResidency: config.dataResidency,
      retentionDays: config.retentionDays,
      ipWhitelistEntries: config.ipWhitelist?.length ?? 0,
    },
    auditTimeline: {
      lastAuditDate: config.lastAuditDate || null,
      nextAuditDate: config.nextAuditDate || null,
      lastExport: new Date().toISOString(),
      recentLogCount: config.auditLog?.length ?? 0,
    },
  };

  return report;
}

// ---------------------------------------------------------------------------
// Legacy compat exports (used by old API routes)
// ---------------------------------------------------------------------------

export async function generateSOC2AuditReport(orgId: string) {
  const report = await exportComplianceReport(orgId);
  return { report };
}

export async function generateGDPRDPA(
  orgId: string,
  companyInfo: { companyName: string; address: string; dpoEmail: string }
) {
  await connectDB();

  const document = `
DATA PROCESSING AGREEMENT (DPA)

Effective Date: ${new Date().toISOString().split('T')[0]}

BETWEEN:
Data Controller: ${companyInfo.companyName}
Address: ${companyInfo.address}
DPO Contact: ${companyInfo.dpoEmail}

AND:
Data Processor: WinBix AI Platform

1. SCOPE AND PURPOSE
This DPA governs the processing of personal data by the Processor on behalf of the Controller
in connection with the use of the WinBix AI chat widget and analytics platform.

2. TYPES OF PERSONAL DATA
- Visitor names and email addresses
- Chat conversation content
- IP addresses and device information
- Behavioral analytics data (page views, interactions)

3. PROCESSING ACTIVITIES
- AI-powered chat responses
- Lead collection and contact management
- Analytics and engagement tracking
- Data storage and retention per configured policies

4. DATA SUBJECT RIGHTS
The Processor shall assist the Controller in fulfilling data subject requests including:
- Right to access
- Right to rectification
- Right to erasure
- Right to data portability
- Right to restrict processing

5. DATA SECURITY MEASURES
- Encryption in transit (TLS 1.3)
- Encryption at rest (AES-256)
- Role-based access control
- Regular security audits
- Incident response procedures

6. DATA RETENTION
Data shall be retained for the period specified in the compliance configuration
and automatically purged thereafter.

7. SUB-PROCESSORS
The Processor shall notify the Controller before engaging any new sub-processors.

8. DATA BREACH NOTIFICATION
The Processor shall notify the Controller within 72 hours of becoming aware of a personal data breach.

9. GOVERNING LAW
This DPA is governed by the laws of the European Union and the GDPR (Regulation 2016/679).

Signed electronically on ${new Date().toISOString().split('T')[0]}
`.trim();

  await ComplianceConfig.findOneAndUpdate(
    { organizationId: orgId },
    { $set: { dpaGenerated: true, gdprDpaGenerated: true, dpaGeneratedAt: new Date() } }
  );

  return { document };
}
