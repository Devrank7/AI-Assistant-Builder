'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Download,
  Globe,
  Clock,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Server,
} from 'lucide-react';

interface ComplianceConfig {
  hipaaMode: boolean;
  soc2AuditEnabled: boolean;
  gdprDpaGenerated: boolean;
  dataResidency: 'us' | 'eu' | 'auto';
  retentionDays: number;
  piiFields: string[];
  lastAuditExport?: string;
  dpaGeneratedAt?: string;
}

interface ComplianceStatus {
  hipaa: { enabled: boolean; status: string; actionItems: string[] };
  soc2: { enabled: boolean; status: string; lastAudit: string | null; actionItems: string[] };
  gdpr: { dpaGenerated: boolean; status: string; dpaGeneratedAt: string | null; actionItems: string[] };
  dataResidency: string;
  retentionDays: number;
}

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function CompliancePage() {
  const [config, setConfig] = useState<ComplianceConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [generatingDpa, setGeneratingDpa] = useState(false);
  const [dpaForm, setDpaForm] = useState({ companyName: '', address: '', dpoEmail: '' });
  const [showDpaForm, setShowDpaForm] = useState(false);
  const [dpaDocument, setDpaDocument] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/compliance');
      const json = await res.json();
      if (json.success) setConfig(json.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = async (updates: Partial<ComplianceConfig>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/compliance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const json = await res.json();
      if (json.success) setConfig(json.data);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const exportAudit = async () => {
    setExporting(true);
    try {
      const res = await fetch('/api/compliance/audit-export', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        const blob = new Blob([JSON.stringify(json.data.report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `soc2-audit-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        fetchConfig();
      }
    } catch {
      // ignore
    } finally {
      setExporting(false);
    }
  };

  const generateDpa = async () => {
    if (!dpaForm.companyName || !dpaForm.address || !dpaForm.dpoEmail) return;
    setGeneratingDpa(true);
    try {
      const res = await fetch('/api/compliance/dpa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dpaForm),
      });
      const json = await res.json();
      if (json.success) {
        setDpaDocument(json.data.document);
        setShowDpaForm(false);
        fetchConfig();
      }
    } catch {
      // ignore
    } finally {
      setGeneratingDpa(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const StatusBadge = ({ compliant }: { compliant: boolean }) => (
    <span
      className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        compliant ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
      }`}
    >
      {compliant ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
      {compliant ? 'Compliant' : 'Action Required'}
    </span>
  );

  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-6 p-6">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="rounded-lg bg-emerald-500/20 p-2">
          <Shield className="h-6 w-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Compliance Suite</h1>
          <p className="text-sm text-gray-400">HIPAA, SOC2, and GDPR compliance management</p>
        </div>
      </motion.div>

      {/* Compliance Scorecard */}
      <motion.div variants={stagger} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* HIPAA Card */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-400" />
              <h3 className="font-semibold text-white">HIPAA</h3>
            </div>
            <StatusBadge compliant={config?.hipaaMode || false} />
          </div>
          <p className="mb-4 text-sm text-gray-400">PHI field encryption for healthcare data protection</p>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={config?.hipaaMode || false}
              onChange={(e) => updateConfig({ hipaaMode: e.target.checked })}
              className="h-4 w-4 accent-blue-500"
            />
            <span className="text-sm text-gray-300">Enable HIPAA Mode</span>
          </label>
          {config?.hipaaMode && (
            <div className="mt-3">
              <span className="mb-1 block text-xs text-gray-500">Encrypted PII Fields</span>
              <div className="flex flex-wrap gap-1">
                {config.piiFields.map((f) => (
                  <span key={f} className="rounded bg-blue-500/20 px-2 py-0.5 text-xs text-blue-300">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* SOC2 Card */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <h3 className="font-semibold text-white">SOC2</h3>
            </div>
            <StatusBadge compliant={config?.soc2AuditEnabled || false} />
          </div>
          <p className="mb-4 text-sm text-gray-400">Audit logging and compliance reporting</p>
          <label className="mb-3 flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={config?.soc2AuditEnabled || false}
              onChange={(e) => updateConfig({ soc2AuditEnabled: e.target.checked })}
              className="h-4 w-4 accent-emerald-500"
            />
            <span className="text-sm text-gray-300">Enable SOC2 Audit</span>
          </label>
          <button
            onClick={exportAudit}
            disabled={exporting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-sm text-emerald-400 transition-colors hover:bg-emerald-600/30"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Audit Report
          </button>
          {config?.lastAuditExport && (
            <p className="mt-2 text-xs text-gray-500">
              Last export: {new Date(config.lastAuditExport).toLocaleDateString()}
            </p>
          )}
        </motion.div>

        {/* GDPR Card */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-400" />
              <h3 className="font-semibold text-white">GDPR</h3>
            </div>
            <StatusBadge compliant={config?.gdprDpaGenerated || false} />
          </div>
          <p className="mb-4 text-sm text-gray-400">Data Processing Agreement generation</p>
          <button
            onClick={() => setShowDpaForm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600/20 px-3 py-1.5 text-sm text-purple-400 transition-colors hover:bg-purple-600/30"
          >
            <FileText className="h-4 w-4" />
            Generate DPA
          </button>
          {config?.dpaGeneratedAt && (
            <p className="mt-2 text-xs text-gray-500">
              DPA generated: {new Date(config.dpaGeneratedAt).toLocaleDateString()}
            </p>
          )}
        </motion.div>
      </motion.div>

      {/* DPA Generator Form */}
      {showDpaForm && (
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-lg font-semibold text-white">Generate GDPR Data Processing Agreement</h3>
          <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Company Name</label>
              <input
                type="text"
                placeholder="Acme Corp"
                value={dpaForm.companyName}
                onChange={(e) => setDpaForm({ ...dpaForm, companyName: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Address</label>
              <input
                type="text"
                placeholder="123 Main St, City, Country"
                value={dpaForm.address}
                onChange={(e) => setDpaForm({ ...dpaForm, address: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">DPO Email</label>
              <input
                type="email"
                placeholder="dpo@example.com"
                value={dpaForm.dpoEmail}
                onChange={(e) => setDpaForm({ ...dpaForm, dpoEmail: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={generateDpa}
              disabled={generatingDpa}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {generatingDpa && <Loader2 className="h-4 w-4 animate-spin" />}
              Generate
            </button>
            <button
              onClick={() => setShowDpaForm(false)}
              className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* DPA Document */}
      {dpaDocument && (
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <h3 className="mb-4 text-lg font-semibold text-white">Generated DPA Document</h3>
          <pre className="max-h-96 overflow-y-auto rounded-lg bg-black/30 p-4 font-mono text-sm whitespace-pre-wrap text-gray-300">
            {dpaDocument}
          </pre>
        </motion.div>
      )}

      {/* Data Residency & Retention */}
      <motion.div variants={stagger} className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-400" />
            <h3 className="font-semibold text-white">Data Residency</h3>
          </div>
          <div className="flex gap-2">
            {(['us', 'eu', 'auto'] as const).map((region) => (
              <button
                key={region}
                onClick={() => updateConfig({ dataResidency: region })}
                className={`flex-1 rounded-lg px-4 py-3 text-sm font-medium transition-all ${
                  config?.dataResidency === region
                    ? 'border border-cyan-500/50 bg-cyan-600/30 text-cyan-400'
                    : 'border border-white/10 bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <Globe className="mx-auto mb-1 h-4 w-4" />
                {region.toUpperCase()}
              </button>
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-400" />
            <h3 className="font-semibold text-white">Data Retention</h3>
          </div>
          <div className="mb-2">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-300">Retention Period</span>
              <span className="text-orange-400">{config?.retentionDays || 365} days</span>
            </div>
            <input
              type="range"
              min="30"
              max="730"
              step="30"
              value={config?.retentionDays || 365}
              onChange={(e) => updateConfig({ retentionDays: Number(e.target.value) })}
              className="w-full accent-orange-500"
            />
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>30 days</span>
              <span>730 days</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Action Items Checklist */}
      <motion.div variants={fadeUp} className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
          <ShieldAlert className="h-5 w-5 text-yellow-400" />
          Compliance Action Items
        </h3>
        <div className="space-y-2">
          {[
            { label: 'Enable HIPAA mode for PHI encryption', done: config?.hipaaMode },
            { label: 'Enable SOC2 audit logging', done: config?.soc2AuditEnabled },
            { label: 'Export initial SOC2 audit report', done: !!config?.lastAuditExport },
            { label: 'Generate GDPR Data Processing Agreement', done: config?.gdprDpaGenerated },
            { label: 'Configure data residency region', done: config?.dataResidency !== 'auto' },
            { label: 'Review PII field encryption list', done: (config?.piiFields?.length || 0) > 0 },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                  item.done ? 'border-green-500 bg-green-500/20' : 'border-gray-600'
                }`}
              >
                {item.done && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
              </div>
              <span className={item.done ? 'text-gray-400 line-through' : 'text-gray-300'}>{item.label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {saving && (
        <div className="fixed right-4 bottom-4 flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm text-white backdrop-blur-xl">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
    </motion.div>
  );
}
