'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  CheckCircle2,
  Clock,
  Shield,
  AlertTriangle,
  XCircle,
  ChevronDown,
} from 'lucide-react';

interface CustomDomain {
  _id: string;
  domain: string;
  clientId: string;
  status: string;
  verificationToken: string;
  cnameTarget: string;
  sslExpiresAt?: string;
  verifiedAt?: string;
  lastCheckedAt?: string;
  error?: string;
  createdAt: string;
}

interface Widget {
  clientId: string;
  username: string;
}

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode; label: string }> = {
  pending_verification: {
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10 border-yellow-400/20',
    icon: <Clock className="h-4 w-4" />,
    label: 'Pending Verification',
  },
  verified: {
    color: 'text-blue-400',
    bg: 'bg-blue-400/10 border-blue-400/20',
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Verified',
  },
  ssl_provisioning: {
    color: 'text-purple-400',
    bg: 'bg-purple-400/10 border-purple-400/20',
    icon: <Shield className="h-4 w-4" />,
    label: 'SSL Provisioning',
  },
  active: {
    color: 'text-green-400',
    bg: 'bg-green-400/10 border-green-400/20',
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: 'Active',
  },
  failed: {
    color: 'text-red-400',
    bg: 'bg-red-400/10 border-red-400/20',
    icon: <XCircle className="h-4 w-4" />,
    label: 'Failed',
  },
  expired: {
    color: 'text-gray-400',
    bg: 'bg-gray-400/10 border-gray-400/20',
    icon: <AlertTriangle className="h-4 w-4" />,
    label: 'Expired',
  },
};

const stagger = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.4, ease: 'easeOut' as const },
  }),
};

export default function DomainsPage() {
  const [domains, setDomains] = useState<CustomDomain[]>([]);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    try {
      const res = await fetch('/api/org/domains');
      const data = await res.json();
      if (data.success) setDomains(data.data || []);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWidgets = useCallback(async () => {
    try {
      const res = await fetch('/api/widgets');
      const data = await res.json();
      if (data.success) setWidgets(data.data || []);
    } catch {
      // Failed to load
    }
  }, []);

  useEffect(() => {
    fetchDomains();
    fetchWidgets();
  }, [fetchDomains, fetchWidgets]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain || !selectedClientId) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/org/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain, clientId: selectedClientId }),
      });
      const data = await res.json();
      if (data.success) {
        setDomains((prev) => [data.data, ...prev]);
        setNewDomain('');
        setSelectedClientId('');
        setShowAddForm(false);
      }
    } catch {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (domainId: string) => {
    setVerifyingId(domainId);
    try {
      const res = await fetch(`/api/org/domains/${domainId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setDomains((prev) => prev.map((d) => (d._id === domainId ? data.data : d)));
      }
    } catch {
      // Handle error
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDelete = async (domainId: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return;
    try {
      const res = await fetch(`/api/org/domains/${domainId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDomains((prev) => prev.filter((d) => d._id !== domainId));
      }
    } catch {
      // Handle error
    }
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent">
            Custom Domains
          </h1>
          <p className="mt-1 text-gray-400">Connect your own domain to serve widgets under your brand</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600"
        >
          <Plus className="h-4 w-4" />
          Add Domain
        </button>
      </motion.div>

      {/* Add Domain Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Domain</label>
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="chat.yourdomain.com"
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-300">Widget</label>
                    <div className="relative">
                      <select
                        value={selectedClientId}
                        onChange={(e) => setSelectedClientId(e.target.value)}
                        className="w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500/50 focus:outline-none"
                      >
                        <option value="" className="bg-gray-900">
                          Select widget...
                        </option>
                        {widgets.map((w) => (
                          <option key={w.clientId} value={w.clientId} className="bg-gray-900">
                            {w.username} ({w.clientId})
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={submitting || !newDomain || !selectedClientId}
                  className="rounded-lg bg-blue-500 px-6 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? 'Adding...' : 'Add Domain'}
                </button>
              </form>

              {/* DNS Instructions */}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-blue-400">Step 1: CNAME Record</h3>
                  <p className="mb-3 text-xs text-gray-400">
                    Add a CNAME record pointing your domain to our proxy server.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
                      <div>
                        <span className="text-xs text-gray-500">Type:</span>
                        <span className="ml-2 font-mono text-sm text-white">CNAME</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
                      <div>
                        <span className="text-xs text-gray-500">Value:</span>
                        <span className="ml-2 font-mono text-sm text-white">proxy.winbixai.com</span>
                      </div>
                      <button
                        onClick={() => copyToClipboard('proxy.winbixai.com', 'cname')}
                        className="text-gray-400 transition-colors hover:text-white"
                      >
                        {copiedField === 'cname' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-purple-400">Step 2: TXT Record</h3>
                  <p className="mb-3 text-xs text-gray-400">
                    Add a TXT record to verify domain ownership. The token will be generated after adding.
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2">
                      <div>
                        <span className="text-xs text-gray-500">Type:</span>
                        <span className="ml-2 font-mono text-sm text-white">TXT</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-black/30 px-3 py-2">
                      <span className="text-xs text-gray-500">Value:</span>
                      <span className="ml-2 text-sm text-gray-400 italic">Generated after adding domain</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Domain List */}
      {domains.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl"
        >
          <Globe className="mx-auto mb-4 h-12 w-12 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-300">No custom domains</h3>
          <p className="mt-1 text-gray-500">Add a domain to serve widgets under your own brand</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain, i) => {
            const status = statusConfig[domain.status] || statusConfig.pending_verification;
            return (
              <motion.div
                key={domain._id}
                custom={i}
                initial="hidden"
                animate="show"
                variants={stagger}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-colors hover:border-white/20"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <Globe className="h-5 w-5 text-blue-400" />
                      <h3 className="text-lg font-semibold text-white">{domain.domain}</h3>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${status.bg} ${status.color}`}
                      >
                        {status.icon}
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">Widget: {domain.clientId}</p>

                    {domain.error && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-red-400">
                        <AlertTriangle className="h-4 w-4" />
                        {domain.error}
                      </div>
                    )}

                    {/* Verification token */}
                    {domain.status === 'pending_verification' && (
                      <div className="mt-3 rounded-lg bg-black/20 p-3">
                        <p className="mb-1 text-xs text-gray-400">TXT Verification Record:</p>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm break-all text-yellow-300">
                            {domain.verificationToken}
                          </code>
                          <button
                            onClick={() => copyToClipboard(domain.verificationToken, `token-${domain._id}`)}
                            className="shrink-0 text-gray-400 transition-colors hover:text-white"
                          >
                            {copiedField === `token-${domain._id}` ? (
                              <CheckCircle2 className="h-4 w-4 text-green-400" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* SSL expiry info */}
                    {domain.sslExpiresAt && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                        <Shield className="h-4 w-4 text-green-400" />
                        SSL expires: {new Date(domain.sslExpiresAt).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  <div className="ml-4 flex items-center gap-2">
                    {(domain.status === 'pending_verification' || domain.status === 'failed') && (
                      <button
                        onClick={() => handleVerify(domain._id)}
                        disabled={verifyingId === domain._id}
                        className="flex items-center gap-1.5 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${verifyingId === domain._id ? 'animate-spin' : ''}`} />
                        {verifyingId === domain._id ? 'Verifying...' : 'Verify'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(domain._id)}
                      className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-400/10 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
