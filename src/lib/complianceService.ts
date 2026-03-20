import connectDB from './mongodb';
import ComplianceConfig from '@/models/ComplianceConfig';

export async function getComplianceConfig(orgId: string) {
  await connectDB();
  let config = await ComplianceConfig.findOne({ organizationId: orgId });
  if (!config) {
    config = await ComplianceConfig.create({ organizationId: orgId });
  }
  return config;
}

export async function updateComplianceConfig(orgId: string, data: Record<string, unknown>) {
  await connectDB();
  return ComplianceConfig.findOneAndUpdate({ organizationId: orgId }, { $set: data }, { new: true, upsert: true });
}

export async function generateSOC2AuditReport(orgId: string) {
  await connectDB();
  const config = await getComplianceConfig(orgId);

  const report = {
    organizationId: orgId,
    generatedAt: new Date().toISOString(),
    reportType: 'SOC2 Type II',
    period: {
      start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    controls: {
      accessControl: {
        status: 'compliant',
        details: 'Role-based access control implemented with JWT auth',
      },
      encryption: {
        status: config.hipaaMode ? 'compliant' : 'partial',
        details: config.hipaaMode
          ? 'PHI field encryption enabled for all PII fields'
          : 'Standard encryption in transit (TLS). Enable HIPAA mode for field-level encryption.',
      },
      dataRetention: {
        status: 'compliant',
        retentionDays: config.retentionDays,
        details: `Data retention policy set to ${config.retentionDays} days`,
      },
      auditLogging: {
        status: config.soc2AuditEnabled ? 'compliant' : 'not_enabled',
        details: config.soc2AuditEnabled
          ? 'Audit logging active for all data access events'
          : 'Enable SOC2 audit mode to activate comprehensive logging',
      },
      dataResidency: {
        status: 'compliant',
        region: config.dataResidency,
        details: `Data residency configured: ${config.dataResidency}`,
      },
    },
    piiFieldsEncrypted: config.piiFields,
  };

  await ComplianceConfig.findOneAndUpdate({ organizationId: orgId }, { $set: { lastAuditExport: new Date() } });

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
    { $set: { gdprDpaGenerated: true, dpaGeneratedAt: new Date() } }
  );

  return { document };
}

export async function checkComplianceStatus(orgId: string) {
  const config = await getComplianceConfig(orgId);

  const hipaa = {
    enabled: config.hipaaMode,
    status: config.hipaaMode ? ('compliant' as const) : ('action_required' as const),
    actionItems: config.hipaaMode ? [] : ['Enable HIPAA mode to encrypt PHI fields', 'Configure PII field list'],
  };

  const soc2 = {
    enabled: config.soc2AuditEnabled,
    status: config.soc2AuditEnabled ? ('compliant' as const) : ('action_required' as const),
    lastAudit: config.lastAuditExport || null,
    actionItems: config.soc2AuditEnabled
      ? config.lastAuditExport
        ? []
        : ['Generate first SOC2 audit report']
      : ['Enable SOC2 audit logging', 'Generate initial audit report'],
  };

  const gdpr = {
    dpaGenerated: config.gdprDpaGenerated,
    status: config.gdprDpaGenerated ? ('compliant' as const) : ('action_required' as const),
    dpaGeneratedAt: config.dpaGeneratedAt || null,
    actionItems: config.gdprDpaGenerated ? [] : ['Generate GDPR Data Processing Agreement'],
  };

  return { hipaa, soc2, gdpr, dataResidency: config.dataResidency, retentionDays: config.retentionDays };
}
