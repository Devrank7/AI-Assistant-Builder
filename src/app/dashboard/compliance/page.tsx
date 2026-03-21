'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Search,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  RefreshCw,
  Activity,
  Database,
  Eye,
  Trash2,
  Clock,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ComplianceLevel {
  soc2: number;
  hipaa: number;
  gdpr: number;
  overall: number;
}

interface AuditLogEntry {
  action: string;
  user: string;
  timestamp: string;
  details: string;
}

interface AuditLogPage {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  totalPages: number;
}

interface ComplianceConfig {
  // SOC2
  soc2Enabled: boolean;
  auditLogging: boolean;
  encryptionAtRest: boolean;
  accessControl: boolean;
  incidentResponsePlan: boolean;
  // HIPAA
  hipaaMode: boolean;
  piiEncryption: boolean;
  accessAuditTrail: boolean;
  dataMinimization: boolean;
  breachNotificationPlan: boolean;
  // GDPR
  gdprConsent: boolean;
  rightToErasure: boolean;
  dataPortability: boolean;
  cookieConsent: boolean;
  dpaGenerated: boolean;
  // General
  dataResidency: 'US' | 'EU' | 'APAC';
  retentionDays: number;
  ipWhitelist: string[];
  mfaRequired: boolean;
  // Computed
  complianceScore: number;
  complianceLevel: ComplianceLevel;
  lastAuditDate?: string;
  nextAuditDate?: string;
  dpaGeneratedAt?: string;
}

// ---------------------------------------------------------------------------
// Toast system
// ---------------------------------------------------------------------------

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

let toastCounter = 0;

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none fixed right-6 bottom-6 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur-xl ${
              t.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : t.type === 'error'
                  ? 'border-red-500/30 bg-red-500/10 text-red-300'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-300'
            }`}
          >
            {t.type === 'success' && <CheckCircle2 className="h-4 w-4 flex-shrink-0" />}
            {t.type === 'error' && <AlertTriangle className="h-4 w-4 flex-shrink-0" />}
            {t.type === 'info' && <Activity className="h-4 w-4 flex-shrink-0" />}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Score gauge
// ---------------------------------------------------------------------------

function ScoreGauge({ value, size = 96 }: { value: number; size?: number }) {
  const r = (size - 12) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = (value / 100) * circumference;
  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference - progress }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Toggle row
// ---------------------------------------------------------------------------

function ToggleRow({
  icon: Icon,
  label,
  description,
  value,
  onChange,
  disabled,
  accent = 'emerald',
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${value ? `text-${accent}-400` : 'text-gray-500'}`} />
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          <div className="mt-0.5 text-xs text-gray-500">{description}</div>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!value)}
        disabled={disabled}
        aria-label={`Toggle ${label}`}
        className="ml-4 flex-shrink-0 disabled:opacity-40"
      >
        {value ? (
          <ToggleRight className={`h-10 w-10 text-${accent}-400`} />
        ) : (
          <ToggleLeft className="h-10 w-10 text-gray-600" />
        )}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: ComplianceConfig = {
  soc2Enabled: false,
  auditLogging: false,
  encryptionAtRest: false,
  accessControl: true,
  incidentResponsePlan: false,
  hipaaMode: false,
  piiEncryption: false,
  accessAuditTrail: false,
  dataMinimization: false,
  breachNotificationPlan: false,
  gdprConsent: false,
  rightToErasure: false,
  dataPortability: false,
  cookieConsent: false,
  dpaGenerated: false,
  dataResidency: 'US',
  retentionDays: 365,
  ipWhitelist: [],
  mfaRequired: false,
  complianceScore: 0,
  complianceLevel: { soc2: 0, hipaa: 0, gdpr: 0, overall: 0 },
};

export default function CompliancePage() {
  const { toasts, show: showToast } = useToast();
  const [config, setConfig] = useState<ComplianceConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Audit log state
  const [auditLog, setAuditLog] = useState<AuditLogPage | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // IP whitelist
  const [newIp, setNewIp] = useState('');

  // Export state
  const [exportingReport, setExportingReport] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch config
  // ---------------------------------------------------------------------------

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/compliance');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setConfig({
          ...DEFAULT_CONFIG,
          ...d,
          complianceLevel: d.complianceLevel || { soc2: 0, hipaa: 0, gdpr: 0, overall: 0 },
          ipWhitelist: d.ipWhitelist || [],
        });
      } else {
        setError(json.error || 'Failed to load compliance config');
      }
    } catch {
      setError('Network error — could not fetch compliance configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // ---------------------------------------------------------------------------
  // Save changes
  // ---------------------------------------------------------------------------

  const saveConfig = useCallback(
    async (updates: Partial<ComplianceConfig>) => {
      const optimistic = { ...config, ...updates };
      setConfig(optimistic);
      setSaving(true);
      try {
        const res = await fetch('/api/compliance', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setConfig({
            ...DEFAULT_CONFIG,
            ...d,
            complianceLevel: d.complianceLevel || { soc2: 0, hipaa: 0, gdpr: 0, overall: 0 },
            ipWhitelist: d.ipWhitelist || [],
          });
          showToast('Settings saved', 'success');
        } else {
          showToast(json.error || 'Failed to save', 'error');
          fetchConfig();
        }
      } catch {
        showToast('Network error — changes not saved', 'error');
        fetchConfig();
      } finally {
        setSaving(false);
      }
    },
    [config, fetchConfig, showToast]
  );

  // ---------------------------------------------------------------------------
  // Audit log fetch
  // ---------------------------------------------------------------------------

  const fetchAuditLog = useCallback(async (page: number, search: string) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);
      const res = await fetch(`/api/compliance/audit-log?${params}`);
      const json = await res.json();
      if (json.success && json.data) {
        setAuditLog(json.data);
      }
    } catch {
      // silent
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) fetchAuditLog(auditPage, auditSearch);
  }, [loading, auditPage, fetchAuditLog]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (val: string) => {
    setAuditSearch(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setAuditPage(1);
      fetchAuditLog(1, val);
    }, 350);
  };

  // ---------------------------------------------------------------------------
  // Export report
  // ---------------------------------------------------------------------------

  const exportReport = async () => {
    setExportingReport(true);
    try {
      const res = await fetch('/api/compliance/report');
      const json = await res.json();
      if (json.success && json.data) {
        const blob = new Blob([JSON.stringify(json.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Report downloaded', 'success');
        fetchAuditLog(auditPage, auditSearch);
      } else {
        showToast('Export failed', 'error');
      }
    } catch {
      showToast('Export failed — network error', 'error');
    } finally {
      setExportingReport(false);
    }
  };

  // ---------------------------------------------------------------------------
  // IP whitelist helpers
  // ---------------------------------------------------------------------------

  const addIp = () => {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    // Basic IP/CIDR validation
    const ipPattern = /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/;
    if (!ipPattern.test(trimmed)) {
      showToast('Invalid IP address format (e.g. 192.168.1.1 or 10.0.0.0/24)', 'error');
      return;
    }
    if (config.ipWhitelist.includes(trimmed)) {
      showToast('IP already in whitelist', 'info');
      return;
    }
    const updated = [...config.ipWhitelist, trimmed];
    setNewIp('');
    saveConfig({ ipWhitelist: updated });
  };

  const removeIp = (ip: string) => {
    saveConfig({ ipWhitelist: config.ipWhitelist.filter((i) => i !== ip) });
  };

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const scoreColor = (v: number) => (v >= 80 ? 'text-emerald-400' : v >= 50 ? 'text-yellow-400' : 'text-red-400');
  const scoreBg = (v: number) => (v >= 80 ? 'bg-emerald-500' : v >= 50 ? 'bg-yellow-500' : 'bg-red-500');
  const scoreLabel = (v: number) => (v >= 80 ? 'Compliant' : v >= 50 ? 'Partial' : 'Non-compliant');
  const scoreBadgeBg = (v: number) =>
    v >= 80
      ? 'bg-emerald-500/15 text-emerald-400'
      : v >= 50
        ? 'bg-yellow-500/15 text-yellow-400'
        : 'bg-red-500/15 text-red-400';

  const formatDate = (d?: string) => (d ? new Date(d).toLocaleDateString('en-US', { dateStyle: 'medium' }) : '—');
  const formatDateTime = (d: string) => new Date(d).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' });

  const actionLabel: Record<string, string> = {
    settings_updated: 'Settings Updated',
    report_exported: 'Report Exported',
    dpa_generated: 'DPA Generated',
    audit_exported: 'Audit Exported',
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen space-y-6 bg-[#0a0a0f] p-6">
      <ToastContainer toasts={toasts} />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-center justify-between gap-4"
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
        <div className="flex items-center gap-3">
          {saving && (
            <div className="flex items-center gap-2 text-sm text-blue-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </div>
          )}
          {config.lastAuditDate && (
            <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400">
              <Clock className="h-3.5 w-3.5" />
              Last audit: {formatDate(config.lastAuditDate)}
            </div>
          )}
          <button
            onClick={exportReport}
            disabled={exportingReport || loading}
            className="flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-500/30 disabled:opacity-40"
          >
            {exportingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export Report
          </button>
        </div>
      </motion.div>

      {/* ── Loading ── */}
      {loading && (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
          Loading compliance configuration...
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="py-12 text-center text-red-400">
          <AlertTriangle className="mx-auto mb-2 h-8 w-8 opacity-60" />
          <p>{error}</p>
          <button
            onClick={fetchConfig}
            className="mx-auto mt-3 flex items-center gap-1.5 text-sm text-blue-400 hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ── Overall Score + Individual Scores ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="grid grid-cols-1 gap-4 lg:grid-cols-4"
          >
            {/* Overall gauge */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur lg:col-span-1">
              <p className="mb-3 text-sm font-medium text-gray-400">Overall Score</p>
              <div className="relative">
                <ScoreGauge value={config.complianceLevel.overall} size={110} />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${scoreColor(config.complianceLevel.overall)}`}>
                    {config.complianceLevel.overall}%
                  </span>
                </div>
              </div>
              <span
                className={`mt-3 rounded-full px-3 py-1 text-xs font-semibold ${scoreBadgeBg(config.complianceLevel.overall)}`}
              >
                {scoreLabel(config.complianceLevel.overall)}
              </span>
            </div>

            {/* Per-framework scores */}
            {(
              [
                { label: 'SOC 2', value: config.complianceLevel.soc2, icon: ShieldCheck, weight: '40%' },
                { label: 'HIPAA', value: config.complianceLevel.hipaa, icon: Lock, weight: '30%' },
                { label: 'GDPR', value: config.complianceLevel.gdpr, icon: Globe, weight: '30%' },
              ] as const
            ).map((card, i) => (
              <motion.div
                key={card.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <card.icon className={`h-5 w-5 ${scoreColor(card.value)}`} />
                    <span className="text-sm font-medium text-white">{card.label}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-600">{card.weight}</span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${scoreBadgeBg(card.value)}`}>
                      {scoreLabel(card.value)}
                    </span>
                  </div>
                </div>
                <div className={`text-3xl font-bold ${scoreColor(card.value)}`}>{card.value}%</div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${card.value}%` }}
                    transition={{ duration: 0.9, delay: 0.15 + i * 0.1 }}
                    className={`h-full rounded-full ${scoreBg(card.value)}`}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* ── SOC 2 Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-blue-500/10 p-1.5">
                  <ShieldCheck className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">SOC 2 Controls</h3>
                  <p className="text-xs text-gray-500">
                    Trust Services Criteria — Security, Availability, Confidentiality
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${scoreBadgeBg(config.complianceLevel.soc2)}`}
              >
                {config.complianceLevel.soc2}%
              </span>
            </div>
            <div className="space-y-3">
              <ToggleRow
                icon={ShieldCheck}
                label="SOC 2 Mode"
                description="Activate SOC 2 Type II compliance posture and reporting"
                value={config.soc2Enabled}
                onChange={(v) => saveConfig({ soc2Enabled: v })}
                disabled={saving}
                accent="blue"
              />
              <ToggleRow
                icon={FileText}
                label="Audit Logging"
                description="Log all data access and administrative actions with timestamps"
                value={config.auditLogging}
                onChange={(v) => saveConfig({ auditLogging: v })}
                disabled={saving}
                accent="blue"
              />
              <ToggleRow
                icon={Database}
                label="Encryption at Rest"
                description="AES-256 encryption for all stored data and backups"
                value={config.encryptionAtRest}
                onChange={(v) => saveConfig({ encryptionAtRest: v })}
                disabled={saving}
                accent="blue"
              />
              <ToggleRow
                icon={Eye}
                label="Access Control (RBAC)"
                description="Role-based access control for all administrative operations"
                value={config.accessControl}
                onChange={(v) => saveConfig({ accessControl: v })}
                disabled={saving}
                accent="blue"
              />
              <ToggleRow
                icon={Activity}
                label="Incident Response Plan"
                description="Documented and tested incident response procedures in place"
                value={config.incidentResponsePlan}
                onChange={(v) => saveConfig({ incidentResponsePlan: v })}
                disabled={saving}
                accent="blue"
              />
            </div>
          </motion.div>

          {/* ── HIPAA Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-purple-500/10 p-1.5">
                  <Lock className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">HIPAA Safeguards</h3>
                  <p className="text-xs text-gray-500">Protected Health Information (PHI) handling requirements</p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${scoreBadgeBg(config.complianceLevel.hipaa)}`}
              >
                {config.complianceLevel.hipaa}%
              </span>
            </div>
            <div className="space-y-3">
              <ToggleRow
                icon={Lock}
                label="HIPAA Mode"
                description="Enable full HIPAA-compliant data handling and PHI protections"
                value={config.hipaaMode}
                onChange={(v) => saveConfig({ hipaaMode: v })}
                disabled={saving}
                accent="purple"
              />
              <ToggleRow
                icon={Database}
                label="PII Encryption"
                description="Field-level encryption for all personally identifiable information"
                value={config.piiEncryption}
                onChange={(v) => saveConfig({ piiEncryption: v })}
                disabled={saving}
                accent="purple"
              />
              <ToggleRow
                icon={Eye}
                label="Access Audit Trail"
                description="Track all access to PHI data with full audit trails"
                value={config.accessAuditTrail}
                onChange={(v) => saveConfig({ accessAuditTrail: v })}
                disabled={saving}
                accent="purple"
              />
              <ToggleRow
                icon={Shield}
                label="Data Minimization"
                description="Collect and retain only the minimum necessary PHI data"
                value={config.dataMinimization}
                onChange={(v) => saveConfig({ dataMinimization: v })}
                disabled={saving}
                accent="purple"
              />
              <ToggleRow
                icon={AlertTriangle}
                label="Breach Notification Plan"
                description="Documented 72-hour breach notification procedures"
                value={config.breachNotificationPlan}
                onChange={(v) => saveConfig({ breachNotificationPlan: v })}
                disabled={saving}
                accent="purple"
              />
            </div>
          </motion.div>

          {/* ── GDPR Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-emerald-500/10 p-1.5">
                  <Globe className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">GDPR Compliance</h3>
                  <p className="text-xs text-gray-500">EU General Data Protection Regulation requirements</p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${scoreBadgeBg(config.complianceLevel.gdpr)}`}
              >
                {config.complianceLevel.gdpr}%
              </span>
            </div>
            <div className="space-y-3">
              <ToggleRow
                icon={CheckCircle2}
                label="Consent Management"
                description="Require explicit consent for all data collection and processing"
                value={config.gdprConsent}
                onChange={(v) => saveConfig({ gdprConsent: v })}
                disabled={saving}
                accent="emerald"
              />
              <ToggleRow
                icon={Trash2}
                label="Right to Erasure"
                description="Enable data subject erasure requests (Right to be Forgotten)"
                value={config.rightToErasure}
                onChange={(v) => saveConfig({ rightToErasure: v })}
                disabled={saving}
                accent="emerald"
              />
              <ToggleRow
                icon={Download}
                label="Data Portability"
                description="Allow users to export their personal data in machine-readable format"
                value={config.dataPortability}
                onChange={(v) => saveConfig({ dataPortability: v })}
                disabled={saving}
                accent="emerald"
              />
              <ToggleRow
                icon={Eye}
                label="Cookie Consent"
                description="Display compliant cookie consent banners to EU visitors"
                value={config.cookieConsent}
                onChange={(v) => saveConfig({ cookieConsent: v })}
                disabled={saving}
                accent="emerald"
              />
              <ToggleRow
                icon={FileSignature}
                label="DPA Generated"
                description="Data Processing Agreement has been generated and signed"
                value={config.dpaGenerated}
                onChange={(v) => saveConfig({ dpaGenerated: v })}
                disabled={saving}
                accent="emerald"
              />
            </div>
            {config.dpaGeneratedAt && (
              <p className="mt-3 text-xs text-gray-500">DPA generated: {formatDate(config.dpaGeneratedAt)}</p>
            )}
          </motion.div>

          {/* ── Data Governance ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <h3 className="mb-5 text-base font-semibold text-white">Data Governance</h3>
            <div className="space-y-4">
              {/* MFA */}
              <ToggleRow
                icon={Lock}
                label="Require MFA"
                description="Enforce multi-factor authentication for all organization members"
                value={config.mfaRequired}
                onChange={(v) => saveConfig({ mfaRequired: v })}
                disabled={saving}
                accent="orange"
              />

              {/* Data Residency */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <Server className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-white">Data Residency</div>
                    <div className="mt-0.5 text-xs text-gray-500">Select where your data is stored and processed</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {(['US', 'EU', 'APAC'] as const).map((region) => (
                    <button
                      key={region}
                      onClick={() => saveConfig({ dataResidency: region })}
                      disabled={saving}
                      className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors disabled:opacity-40 ${
                        config.dataResidency === region
                          ? 'border border-blue-500/30 bg-blue-500/20 text-blue-400'
                          : 'border border-white/[0.06] bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
                      }`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              </div>

              {/* Retention days */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-white">Data Retention Period</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      How long to retain customer data before automatic deletion
                    </div>
                  </div>
                </div>
                <select
                  value={config.retentionDays}
                  onChange={(e) => saveConfig({ retentionDays: parseInt(e.target.value) })}
                  disabled={saving}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.05] px-3 py-2 text-sm text-white focus:border-blue-500/50 focus:outline-none disabled:opacity-40"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                >
                  <option value={30}>30 days</option>
                  <option value={90}>90 days</option>
                  <option value={180}>180 days</option>
                  <option value={365}>1 year</option>
                  <option value={730}>2 years</option>
                  <option value={1825}>5 years</option>
                </select>
              </div>

              {/* IP Whitelist */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-4">
                <div className="mb-3 flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-500" />
                  <div>
                    <div className="text-sm font-medium text-white">IP Whitelist</div>
                    <div className="mt-0.5 text-xs text-gray-500">
                      Restrict API access to specific IPs or CIDR ranges (leave empty to allow all)
                    </div>
                  </div>
                </div>
                <div className="mb-3 flex gap-2">
                  <input
                    type="text"
                    value={newIp}
                    onChange={(e) => setNewIp(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addIp()}
                    placeholder="192.168.1.0/24"
                    className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-blue-500/40 focus:outline-none"
                  />
                  <button
                    onClick={addIp}
                    disabled={saving || !newIp.trim()}
                    className="flex items-center gap-1.5 rounded-xl bg-blue-500/20 px-3 py-2 text-sm text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" /> Add
                  </button>
                </div>
                {config.ipWhitelist.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {config.ipWhitelist.map((ip) => (
                      <span
                        key={ip}
                        className="flex items-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1 font-mono text-xs text-gray-300"
                      >
                        {ip}
                        <button
                          onClick={() => removeIp(ip)}
                          className="text-gray-500 transition-colors hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">No IP restrictions — all IPs allowed</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* ── Reports & Documents ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <h3 className="mb-5 text-base font-semibold text-white">Reports & Documents</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Compliance report */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <ShieldCheck className="h-5 w-5 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Full Compliance Report</h4>
                    <p className="mt-0.5 text-xs text-gray-500">
                      JSON export of all compliance settings, scores, and audit summary
                    </p>
                  </div>
                </div>
                {config.lastAuditDate && (
                  <p className="mb-3 text-xs text-gray-500">Last exported: {formatDate(config.lastAuditDate)}</p>
                )}
                <button
                  onClick={exportReport}
                  disabled={exportingReport}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2.5 text-sm text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-40"
                >
                  {exportingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Export JSON Report
                </button>
              </div>

              {/* DPA status card */}
              <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] p-5">
                <div className="mb-3 flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <FileSignature className="h-5 w-5 text-purple-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-white">Data Processing Agreement</h4>
                    <p className="mt-0.5 text-xs text-gray-500">GDPR Article 28 compliant DPA document</p>
                  </div>
                </div>
                {config.dpaGenerated ? (
                  <div className="mb-3 flex items-center gap-2 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Generated {config.dpaGeneratedAt ? formatDate(config.dpaGeneratedAt) : ''}
                  </div>
                ) : (
                  <p className="mb-3 text-xs text-gray-600">DPA not yet generated — enable GDPR settings first</p>
                )}
                <button
                  onClick={() => saveConfig({ dpaGenerated: true })}
                  disabled={saving}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-purple-500/20 px-4 py-2.5 text-sm text-purple-400 transition-colors hover:bg-purple-500/30 disabled:opacity-40"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />}
                  {config.dpaGenerated ? 'Regenerate DPA' : 'Generate DPA'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Status Overview ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <h3 className="mb-4 text-base font-semibold text-white">Status Overview</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {[
                { label: 'SOC 2 Mode', active: config.soc2Enabled },
                { label: 'Audit Logging', active: config.auditLogging },
                { label: 'Encryption at Rest', active: config.encryptionAtRest },
                { label: 'HIPAA Mode', active: config.hipaaMode },
                { label: 'PII Encryption', active: config.piiEncryption },
                { label: 'Consent Management', active: config.gdprConsent },
                { label: 'Right to Erasure', active: config.rightToErasure },
                { label: 'MFA Required', active: config.mfaRequired },
                { label: `Residency: ${config.dataResidency}`, active: true },
                { label: `Retention: ${config.retentionDays}d`, active: true },
                { label: `IP Rules: ${config.ipWhitelist.length}`, active: config.ipWhitelist.length > 0 },
                { label: 'DPA Generated', active: config.dpaGenerated },
              ].map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-xl border p-3 ${
                    item.active ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/[0.04] bg-white/[0.01]'
                  }`}
                >
                  {item.active ? (
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 text-gray-600" />
                  )}
                  <span className={`text-xs ${item.active ? 'text-emerald-400' : 'text-gray-600'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── Audit Log ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-6 backdrop-blur"
          >
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-gray-500/10 p-1.5">
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Audit Log</h3>
                  <p className="text-xs text-gray-500">
                    {auditLog ? `${auditLog.total} total entries` : 'All configuration changes and exports'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
                  <input
                    type="text"
                    value={auditSearch}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search logs..."
                    className="w-48 rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pr-3 pl-8 text-sm text-white placeholder-gray-600 focus:border-blue-500/40 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => fetchAuditLog(auditPage, auditSearch)}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2 text-gray-400 transition-colors hover:bg-white/[0.06]"
                >
                  <RefreshCw className={`h-4 w-4 ${auditLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {auditLoading && !auditLog && (
              <div className="flex items-center justify-center py-8 text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading audit log...
              </div>
            )}

            {auditLog && (
              <>
                {auditLog.entries.length === 0 ? (
                  <div className="py-8 text-center text-gray-600">
                    <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="text-sm">No audit entries yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLog.entries.map((entry, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-white/[0.03] bg-white/[0.02] px-4 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-emerald-500/60" />
                          <div>
                            <div className="text-sm font-medium text-white">
                              {actionLabel[entry.action] || entry.action.replace(/_/g, ' ')}
                            </div>
                            {entry.details && (
                              <div className="mt-0.5 max-w-md truncate text-xs text-gray-500">{entry.details}</div>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-500">{entry.user}</div>
                          <div className="mt-0.5 text-xs text-gray-600">{formatDateTime(entry.timestamp)}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {auditLog.totalPages > 1 && (
                  <div className="mt-4 flex items-center justify-between">
                    <p className="text-xs text-gray-500">
                      Page {auditLog.page} of {auditLog.totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const p = Math.max(1, auditPage - 1);
                          setAuditPage(p);
                          fetchAuditLog(p, auditSearch);
                        }}
                        disabled={auditPage <= 1 || auditLoading}
                        className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" /> Prev
                      </button>
                      <button
                        onClick={() => {
                          const p = Math.min(auditLog.totalPages, auditPage + 1);
                          setAuditPage(p);
                          fetchAuditLog(p, auditSearch);
                        }}
                        disabled={auditPage >= auditLog.totalPages || auditLoading}
                        className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
                      >
                        Next <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </div>
  );
}
