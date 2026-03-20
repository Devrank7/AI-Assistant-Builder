'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  FileText,
  Download,
  Loader2,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Lock,
  Server,
  FileSignature,
} from 'lucide-react';

interface ComplianceConfig {
  soc2Enabled: boolean;
  hipaaMode: boolean;
  gdprConsent: boolean;
  dataResidency: 'US' | 'EU';
  auditLogging: boolean;
  encryptionAtRest: boolean;
  dataRetentionDays: number;
  lastAuditDate?: string;
  complianceLevel: {
    soc2: number;
    hipaa: number;
    gdpr: number;
  };
}

export default function CompliancePage() {
  const [config, setConfig] = useState<ComplianceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/compliance');
      const json = await res.json();
      if (json.success) {
        setConfig(json.data);
      } else {
        setError(json.error || 'Failed to load compliance config');
      }
    } catch {
      setError('Failed to fetch compliance configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = async (updates: Partial<ComplianceConfig>) => {
    if (!config) return;
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    setSaving(true);
    try {
      const res = await fetch('/api/compliance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setConfig(json.data);
      }
    } catch {
      fetchConfig();
    } finally {
      setSaving(false);
    }
  };

  const exportAudit = async () => {
    setExporting('audit');
    try {
      const res = await fetch('/api/compliance/audit-export', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data?.downloadUrl) {
        window.open(json.data.downloadUrl, '_blank');
      }
    } catch {
      // ignore
    } finally {
      setExporting(null);
    }
  };

  const generateDpa = async () => {
    setExporting('dpa');
    try {
      const res = await fetch('/api/compliance/dpa', { method: 'POST' });
      const json = await res.json();
      if (json.success && json.data?.downloadUrl) {
        window.open(json.data.downloadUrl, '_blank');
      }
    } catch {
      // ignore
    } finally {
      setExporting(null);
    }
  };

  const complianceLevelColor = (level: number) => {
    if (level >= 80) return 'text-green-400';
    if (level >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const complianceLevelBg = (level: number) => {
    if (level >= 80) return 'bg-green-500';
    if (level >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const complianceLevelLabel = (level: number) => {
    if (level >= 80) return 'Compliant';
    if (level >= 50) return 'Partial';
    return 'Non-compliant';
  };

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-500/20 p-2.5">
            <Shield className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Compliance</h1>
            <p className="text-sm text-gray-400">Security frameworks, data governance, and audit controls</p>
          </div>
        </div>
        {saving && (
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading compliance configuration...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="py-12 text-center text-red-400">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 opacity-60" />
          <p>{error}</p>
          <button onClick={fetchConfig} className="mt-3 text-sm text-blue-400 hover:underline">
            Retry
          </button>
        </div>
      )}

      {!loading && !error && config && (
        <>
          {/* Compliance Level Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              { label: 'SOC 2', value: config.complianceLevel.soc2, icon: ShieldCheck, key: 'soc2' },
              { label: 'HIPAA', value: config.complianceLevel.hipaa, icon: Lock, key: 'hipaa' },
              { label: 'GDPR', value: config.complianceLevel.gdpr, icon: Globe, key: 'gdpr' },
            ].map((card, index) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <card.icon className={`h-5 w-5 ${complianceLevelColor(card.value)}`} />
                    <span className="text-sm font-medium text-white">{card.label}</span>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      card.value >= 80
                        ? 'bg-green-500/20 text-green-400'
                        : card.value >= 50
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {complianceLevelLabel(card.value)}
                  </span>
                </div>
                <div className={`text-3xl font-bold ${complianceLevelColor(card.value)}`}>{card.value}%</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${card.value}%` }}
                    transition={{ duration: 0.8, delay: index * 0.1 }}
                    className={`h-full rounded-full ${complianceLevelBg(card.value)}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Configuration Toggles */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <h3 className="mb-5 text-lg font-semibold text-white">Configuration</h3>
            <div className="space-y-4">
              {[
                {
                  key: 'soc2Enabled',
                  label: 'SOC 2 Compliance',
                  description: 'Enable SOC 2 Type II audit trail and security controls',
                  icon: ShieldCheck,
                  value: config.soc2Enabled,
                },
                {
                  key: 'hipaaMode',
                  label: 'HIPAA Mode',
                  description: 'Enable HIPAA-compliant data handling and PHI protections',
                  icon: Lock,
                  value: config.hipaaMode,
                },
                {
                  key: 'gdprConsent',
                  label: 'GDPR Consent Management',
                  description: 'Require explicit consent for data collection and processing',
                  icon: Globe,
                  value: config.gdprConsent,
                },
                {
                  key: 'auditLogging',
                  label: 'Audit Logging',
                  description: 'Log all data access and administrative actions',
                  icon: FileText,
                  value: config.auditLogging,
                },
                {
                  key: 'encryptionAtRest',
                  label: 'Encryption at Rest',
                  description: 'Encrypt all stored data using AES-256 encryption',
                  icon: Lock,
                  value: config.encryptionAtRest,
                },
              ].map((toggle, index) => (
                <motion.div
                  key={toggle.key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
                >
                  <div className="flex items-center gap-3">
                    <toggle.icon className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-white">{toggle.label}</div>
                      <div className="mt-0.5 text-xs text-gray-400">{toggle.description}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateConfig({ [toggle.key]: !toggle.value } as Partial<ComplianceConfig>)}
                    className="ml-4 flex-shrink-0"
                  >
                    {toggle.value ? (
                      <ToggleRight className="h-10 w-10 text-emerald-400" />
                    ) : (
                      <ToggleLeft className="h-10 w-10 text-gray-500" />
                    )}
                  </button>
                </motion.div>
              ))}

              {/* Data Residency Selector */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 }}
                className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-4"
              >
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Data Residency</div>
                    <div className="mt-0.5 text-xs text-gray-400">Select where your data is stored and processed</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(['US', 'EU'] as const).map((region) => (
                    <button
                      key={region}
                      onClick={() => updateConfig({ dataResidency: region })}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                        config.dataResidency === region
                          ? 'border border-blue-500/30 bg-blue-500/20 text-blue-400'
                          : 'border border-white/[0.06] bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Data Retention */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-4"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-white">Data Retention Period</div>
                    <div className="mt-0.5 text-xs text-gray-400">
                      How long to retain customer data before automatic deletion
                    </div>
                  </div>
                </div>
                <select
                  value={config.dataRetentionDays}
                  onChange={(e) => updateConfig({ dataRetentionDays: parseInt(e.target.value) })}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                  <option value={730}>2 years</option>
                </select>
              </motion.div>
            </div>
          </motion.div>

          {/* Export Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <h3 className="mb-5 text-lg font-semibold text-white">Reports & Documents</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* SOC2 Audit Export */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <ShieldCheck className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">SOC 2 Audit Report</h4>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Export a full audit trail for SOC 2 compliance review
                    </p>
                  </div>
                </div>
                {config.lastAuditDate && (
                  <p className="mb-3 text-xs text-gray-400">
                    Last exported: {new Date(config.lastAuditDate).toLocaleDateString()}
                  </p>
                )}
                <button
                  onClick={exportAudit}
                  disabled={exporting === 'audit'}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2.5 text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-40"
                >
                  {exporting === 'audit' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export Audit Report
                </button>
              </div>

              {/* DPA Generator */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <FileSignature className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">DPA Document</h4>
                    <p className="mt-0.5 text-xs text-gray-400">
                      Generate a Data Processing Agreement for GDPR compliance
                    </p>
                  </div>
                </div>
                <p className="mb-3 text-xs text-gray-400">Auto-generated based on your current compliance settings</p>
                <button
                  onClick={generateDpa}
                  disabled={exporting === 'dpa'}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500/20 px-4 py-2.5 text-purple-400 transition-colors hover:bg-purple-500/30 disabled:opacity-40"
                >
                  {exporting === 'dpa' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSignature className="h-4 w-4" />
                  )}
                  Generate DPA
                </button>
              </div>
            </div>
          </motion.div>

          {/* Status Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <h3 className="mb-4 text-lg font-semibold text-white">Status Overview</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'SOC 2 Controls', active: config.soc2Enabled },
                { label: 'HIPAA Mode', active: config.hipaaMode },
                { label: 'GDPR Consent', active: config.gdprConsent },
                { label: 'Audit Logging', active: config.auditLogging },
                { label: 'Encryption at Rest', active: config.encryptionAtRest },
                { label: `Data Residency: ${config.dataResidency}`, active: true },
              ].map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className={`flex items-center gap-2.5 rounded-xl border p-3 ${
                    item.active ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/[0.04] bg-white/[0.01]'
                  }`}
                >
                  {item.active ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-gray-500" />
                  )}
                  <span className={`text-sm ${item.active ? 'text-emerald-400' : 'text-gray-500'}`}>{item.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
