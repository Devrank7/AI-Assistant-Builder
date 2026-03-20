'use client';

import { useState, useEffect } from 'react';
import { Syne } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { Button, Input } from '@/components/ui';
import Link from 'next/link';
import {
  Shield,
  ArrowLeft,
  Check,
  AlertTriangle,
  ChevronDown,
  Globe,
  Lock,
  Key,
  Users,
  RefreshCw,
  Zap,
  Play,
  X,
} from 'lucide-react';

const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};
const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 120, damping: 16 },
  },
};
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.4, 0.25, 1] as const } },
};

type Protocol = 'saml' | 'oidc';
type Provider = 'microsoft-entra' | 'okta' | 'onelogin' | 'google-workspace' | 'custom';

const providerPresets: Record<Provider, { label: string; protocol: Protocol; color: string; hint: string }> = {
  'microsoft-entra': {
    label: 'Microsoft Entra ID',
    protocol: 'saml',
    color: '#00A4EF',
    hint: 'Supports SAML 2.0 and OIDC',
  },
  okta: { label: 'Okta', protocol: 'saml', color: '#007DC1', hint: 'SAML 2.0 or OIDC with Okta' },
  onelogin: { label: 'OneLogin', protocol: 'saml', color: '#2C3E50', hint: 'SAML 2.0 federation' },
  'google-workspace': { label: 'Google Workspace', protocol: 'saml', color: '#4285F4', hint: 'Google SAML apps' },
  custom: { label: 'Custom IdP', protocol: 'saml', color: '#6B7280', hint: 'Any SAML 2.0 or OIDC provider' },
};

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

function Alert({ type, message }: { type: 'success' | 'error'; message: string }) {
  const isSuccess = type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-medium"
      style={{
        background: isSuccess ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
        border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}`,
        color: isSuccess ? '#10B981' : '#EF4444',
      }}
    >
      {isSuccess ? <Check className="h-3.5 w-3.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0" />}
      {message}
    </motion.div>
  );
}

export default function SSOSettingsPage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // SSO config state
  const [protocol, setProtocol] = useState<Protocol>('saml');
  const [provider, setProvider] = useState<Provider>('custom');
  const [enabled, setEnabled] = useState(false);
  const [enforceSSO, setEnforceSSO] = useState(false);
  const [autoProvision, setAutoProvision] = useState(true);
  const [defaultRole, setDefaultRole] = useState('viewer');
  const [allowedDomains, setAllowedDomains] = useState('');

  // SAML fields
  const [entryPoint, setEntryPoint] = useState('');
  const [issuer, setIssuer] = useState('');
  const [cert, setCert] = useState('');

  // OIDC fields
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [discoveryUrl, setDiscoveryUrl] = useState('');

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/org/sso');
      const data = await res.json();
      if (data.success && data.data) {
        const c = data.data;
        setProtocol(c.protocol || 'saml');
        setProvider(c.provider || 'custom');
        setEnabled(c.enabled || false);
        setEnforceSSO(c.enforceSSO || false);
        setAutoProvision(c.autoProvision ?? true);
        setDefaultRole(c.defaultRole || 'viewer');
        setAllowedDomains((c.allowedDomains || []).join(', '));
        setEntryPoint(c.entryPoint || '');
        setIssuer(c.issuer || '');
        setCert(c.cert || '');
        setClientId(c.clientId || '');
        setClientSecret(c.clientSecret || '');
        setDiscoveryUrl(c.discoveryUrl || '');
      }
    } catch {
      // No config yet
    } finally {
      setLoading(false);
    }
  };

  const handleProviderChange = (p: Provider) => {
    setProvider(p);
    const preset = providerPresets[p];
    if (preset) {
      setProtocol(preset.protocol);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/org/sso', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          protocol,
          provider,
          enabled,
          enforceSSO,
          autoProvision,
          defaultRole,
          allowedDomains: allowedDomains
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean),
          entryPoint: protocol === 'saml' ? entryPoint : null,
          issuer: protocol === 'saml' ? issuer : null,
          cert: protocol === 'saml' ? cert : null,
          clientId: protocol === 'oidc' ? clientId : null,
          clientSecret: protocol === 'oidc' ? clientSecret : null,
          discoveryUrl: protocol === 'oidc' ? discoveryUrl : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('SSO configuration saved successfully');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(data.error || 'Failed to save SSO configuration');
      }
    } catch {
      setError('Failed to save SSO configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError('');
    setSuccess('');
    try {
      // Attempt SSO initiation as a test
      const testDomain = allowedDomains.split(',')[0]?.trim();
      if (!testDomain) {
        setError('Add at least one allowed domain to test the connection');
        return;
      }
      const res = await fetch('/api/auth/sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `test@${testDomain}` }),
      });
      const data = await res.json();
      if (data.success && data.data?.redirectUrl) {
        setSuccess('SSO connection test passed — redirect URL generated successfully');
      } else {
        setError(data.error || 'SSO connection test failed. Please verify your configuration.');
      }
    } catch {
      setError('SSO connection test failed');
    } finally {
      setTesting(false);
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      {/* Header */}
      <motion.div {...fadeUp}>
        <Link
          href="/dashboard/settings"
          className="mb-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Settings
        </Link>
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(99,102,241,0.25))',
              color: '#8B5CF6',
            }}
          >
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>Enterprise SSO</h1>
            <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
              Configure SAML 2.0 or OIDC single sign-on for your organization
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
        {/* Provider Selection */}
        <motion.div
          variants={staggerItem}
          className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white transition-all dark:border-white/[0.06] dark:bg-[#111118]"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500/60 to-indigo-500/40" />
          <div className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(99,102,241,0.2))',
                  color: '#6366F1',
                  boxShadow: '0 0 0 1px rgba(99,102,241,0.15)',
                }}
              >
                <Globe className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Identity Provider</h2>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Choose your IdP and protocol</p>
              </div>
            </div>

            {/* Provider presets */}
            <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {(Object.entries(providerPresets) as [Provider, (typeof providerPresets)[Provider]][]).map(
                ([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => handleProviderChange(key)}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center transition-all ${
                      provider === key
                        ? 'border-violet-500/30 bg-violet-50/50 dark:border-violet-500/20 dark:bg-violet-500/[0.08]'
                        : 'border-gray-200/60 bg-white hover:border-gray-300 dark:border-white/[0.06] dark:bg-white/[0.02] dark:hover:border-white/[0.12]'
                    }`}
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-bold text-white"
                      style={{ background: preset.color }}
                    >
                      {preset.label[0]}
                    </div>
                    <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{preset.label}</span>
                  </button>
                )
              )}
            </div>

            {/* Protocol selector */}
            <div className="space-y-2">
              <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">Protocol</label>
              <div className="flex gap-2">
                {(['saml', 'oidc'] as Protocol[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProtocol(p)}
                    className={`rounded-xl border px-4 py-2 text-[13px] font-semibold transition-all ${
                      protocol === p
                        ? 'border-violet-500/30 bg-violet-50 text-violet-700 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-300'
                        : 'border-gray-200/60 text-gray-500 hover:border-gray-300 dark:border-white/[0.06] dark:text-gray-400'
                    }`}
                  >
                    {p === 'saml' ? 'SAML 2.0' : 'OpenID Connect'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Configuration Fields */}
        <motion.div
          variants={staggerItem}
          className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white transition-all dark:border-white/[0.06] dark:bg-[#111118]"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500/60 to-cyan-500/40" />
          <div className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.2))',
                  color: '#3B82F6',
                  boxShadow: '0 0 0 1px rgba(59,130,246,0.15)',
                }}
              >
                <Key className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Configuration</h2>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  {protocol === 'saml' ? 'SAML 2.0 service provider settings' : 'OIDC client settings'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {protocol === 'saml' ? (
                <>
                  <Input
                    label="SSO Entry Point (Login URL)"
                    id="entryPoint"
                    value={entryPoint}
                    onChange={(e) => setEntryPoint(e.target.value)}
                    placeholder="https://idp.example.com/sso/saml"
                  />
                  <Input
                    label="Issuer (Entity ID)"
                    id="issuer"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder="winbix-ai"
                  />
                  <div className="space-y-1.5">
                    <label htmlFor="cert" className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">
                      X.509 Certificate
                    </label>
                    <textarea
                      id="cert"
                      value={cert}
                      onChange={(e) => setCert(e.target.value)}
                      rows={4}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;MIICpDCCAYwCCQ..."
                      className="w-full rounded-xl border border-gray-200/60 bg-white px-3.5 py-2.5 font-mono text-[12px] text-gray-700 placeholder:text-gray-300 focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 focus:outline-none dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-gray-300 dark:placeholder:text-gray-600"
                    />
                  </div>
                </>
              ) : (
                <>
                  <Input
                    label="Client ID"
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="your-client-id"
                  />
                  <Input
                    label="Client Secret"
                    id="clientSecret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="your-client-secret"
                  />
                  <Input
                    label="Discovery URL"
                    id="discoveryUrl"
                    value={discoveryUrl}
                    onChange={(e) => setDiscoveryUrl(e.target.value)}
                    placeholder="https://login.example.com/.well-known/openid-configuration"
                  />
                </>
              )}
            </div>
          </div>
        </motion.div>

        {/* Access Control */}
        <motion.div
          variants={staggerItem}
          className="group relative overflow-hidden rounded-2xl border border-gray-200/60 bg-white transition-all dark:border-white/[0.06] dark:bg-[#111118]"
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500/60 to-teal-500/40" />
          <div className="p-6">
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.2))',
                  color: '#10B981',
                  boxShadow: '0 0 0 1px rgba(16,185,129,0.15)',
                }}
              >
                <Users className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Access Control</h2>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">Domain restrictions and provisioning</p>
              </div>
            </div>

            <div className="space-y-4">
              <Input
                label="Allowed Email Domains"
                id="allowedDomains"
                value={allowedDomains}
                onChange={(e) => setAllowedDomains(e.target.value)}
                placeholder="company.com, subsidiary.com"
              />
              <p className="!mt-1 text-[11px] text-gray-400">Comma-separated list of domains allowed to use SSO</p>

              <div className="space-y-1.5">
                <label htmlFor="defaultRole" className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">
                  Default Role for New Users
                </label>
                <select
                  id="defaultRole"
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200/60 bg-white px-3.5 text-[13px] text-gray-700 focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 focus:outline-none dark:border-white/[0.06] dark:bg-white/[0.02] dark:text-gray-300"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Toggle: Auto-provision */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200/60 p-4 dark:border-white/[0.06]">
                <div>
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white">Auto-Provision Users</p>
                  <p className="mt-0.5 text-[11px] text-gray-400">Automatically create accounts on first SSO login</p>
                </div>
                <button
                  onClick={() => setAutoProvision(!autoProvision)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    autoProvision ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      autoProvision ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Toggle: Enforce SSO */}
              <div className="flex items-center justify-between rounded-xl border border-amber-200/60 bg-amber-50/30 p-4 dark:border-amber-500/10 dark:bg-amber-500/[0.04]">
                <div>
                  <p className="text-[13px] font-semibold text-gray-900 dark:text-white">
                    Enforce SSO
                    <span
                      className="ml-2 inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase"
                      style={{
                        background: 'rgba(245,158,11,0.1)',
                        color: '#F59E0B',
                        border: '1px solid rgba(245,158,11,0.2)',
                      }}
                    >
                      Caution
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-400">
                    Block password login for all org members. Users must use SSO.
                  </p>
                </div>
                <button
                  onClick={() => setEnforceSSO(!enforceSSO)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${
                    enforceSSO ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                      enforceSSO ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div variants={staggerItem} className="space-y-3">
          <AnimatePresence>
            {error && <Alert type="error" message={error} />}
            {success && <Alert type="success" message={success} />}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-3">
            {/* Enable toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEnabled(!enabled)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  enabled ? 'bg-violet-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300">
                {enabled ? 'SSO Enabled' : 'SSO Disabled'}
              </span>
            </div>

            <div className="flex-1" />

            {/* Test connection */}
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleTestConnection}
              disabled={testing || !enabled}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200/60 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 shadow-sm transition-all hover:shadow-md disabled:opacity-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300"
            >
              {testing ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              {testing ? 'Testing...' : 'Test Connection'}
            </motion.button>

            {/* Save */}
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-violet-500/15 transition-all hover:shadow-lg hover:shadow-violet-500/25 disabled:opacity-50"
            >
              {saving ? <Spinner /> : <Check className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
