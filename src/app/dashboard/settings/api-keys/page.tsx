'use client';

import { useState, useEffect, useCallback } from 'react';
import { Syne } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import {
  Key,
  Plus,
  Copy,
  Check,
  Trash2,
  Shield,
  Globe,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Edit3,
  X,
  Crown,
  ArrowUpRight,
  ChevronLeft,
} from 'lucide-react';
import Link from 'next/link';

/* ── Display font ── */
const syne = Syne({ subsets: ['latin'], weight: ['700', '800'], display: 'swap' });

/* ── Animations ── */
const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
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
const modalVariants = {
  hidden: { opacity: 0, scale: 0.96, y: 12 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 28 } },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: 0.18 } },
};

/* ── Types ── */
interface ApiKey {
  _id: string;
  name: string;
  prefix: string;
  environment: 'live' | 'test';
  scopes: ('read' | 'write' | 'admin')[];
  status: 'active' | 'revoked';
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  totalRequests: number;
  ipWhitelist: string[];
}

type Scope = 'read' | 'write' | 'admin';

/* ── Helpers ── */
function relativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

/* ── Inline spinner ── */
function Spinner({ light = false }: { light?: boolean }) {
  return (
    <span
      className={`inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 ${light ? 'border-white/30 border-t-white' : 'border-gray-300 border-t-gray-600 dark:border-white/20 dark:border-t-white/60'}`}
    />
  );
}

/* ── Toast ── */
function Toast({ type, message, onClose }: { type: 'success' | 'error'; message: string; onClose: () => void }) {
  const isSuccess = type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="fixed right-6 bottom-6 z-[100] flex items-center gap-2.5 rounded-2xl px-5 py-3 text-[13px] font-semibold shadow-xl"
      style={{
        background: isSuccess
          ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))'
          : 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.06))',
        border: `1px solid ${isSuccess ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
        color: isSuccess ? '#10B981' : '#EF4444',
        backdropFilter: 'blur(12px)',
      }}
    >
      {isSuccess ? <Check className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
      {message}
      <button onClick={onClose} className="ml-1 opacity-60 transition-opacity hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

/* ── Scope badge ── */
function ScopeBadge({ scope }: { scope: Scope }) {
  const config: Record<Scope, { bg: string; color: string; border: string }> = {
    read: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6', border: 'rgba(59,130,246,0.18)' },
    write: { bg: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: 'rgba(245,158,11,0.18)' },
    admin: { bg: 'rgba(239,68,68,0.08)', color: '#EF4444', border: 'rgba(239,68,68,0.18)' },
  };
  const c = config[scope];
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}
    >
      {scope}
    </span>
  );
}

/* ── Environment badge ── */
function EnvBadge({ env }: { env: 'live' | 'test' }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
      style={
        env === 'live'
          ? { background: 'rgba(16,185,129,0.08)', color: '#10B981', border: '1px solid rgba(16,185,129,0.18)' }
          : { background: 'rgba(245,158,11,0.08)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.18)' }
      }
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: env === 'live' ? '#10B981' : '#F59E0B' }} />
      {env}
    </span>
  );
}

/* ── Status badge ── */
function StatusBadge({ status }: { status: 'active' | 'revoked' }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
      style={
        status === 'active'
          ? { background: 'rgba(16,185,129,0.06)', color: '#10B981', border: '1px solid rgba(16,185,129,0.15)' }
          : { background: 'rgba(107,114,128,0.08)', color: '#9CA3AF', border: '1px solid rgba(107,114,128,0.15)' }
      }
    >
      {status}
    </span>
  );
}

/* ── Skeleton loader ── */
function KeySkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-gray-200/60 bg-white p-5 dark:border-white/[0.06] dark:bg-[#111118]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2.5">
          <div className="h-4 w-40 rounded-full bg-gray-200 dark:bg-white/[0.06]" />
          <div className="flex gap-2">
            <div className="h-5 w-16 rounded-md bg-gray-100 dark:bg-white/[0.04]" />
            <div className="h-5 w-12 rounded-md bg-gray-100 dark:bg-white/[0.04]" />
            <div className="h-5 w-14 rounded-md bg-gray-100 dark:bg-white/[0.04]" />
          </div>
          <div className="h-3 w-56 rounded-full bg-gray-100 dark:bg-white/[0.03]" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
          <div className="h-8 w-8 rounded-lg bg-gray-100 dark:bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}

/* ── Modal backdrop ── */
function ModalBackdrop({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    />
  );
}

/* ── Create key modal ── */
function CreateKeyModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (key: ApiKey, rawKey: string) => void;
}) {
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'live' | 'test'>('test');
  const [scopes, setScopes] = useState<Scope[]>(['read']);
  const [expiresInDays, setExpiresInDays] = useState<string>('90');
  const [ipWhitelist, setIpWhitelist] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleScope = (scope: Scope) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      setError('Key name is required');
      return;
    }
    if (scopes.length === 0) {
      setError('Select at least one scope');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          environment,
          scopes,
          expiresInDays: expiresInDays === 'never' ? null : parseInt(expiresInDays),
          ipWhitelist: ipWhitelist
            .split(',')
            .map((ip) => ip.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onCreate(data.data.key, data.data.rawKey);
      } else {
        setError(data.error || 'Failed to create key');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111118]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-blue-500 to-violet-500" />

          <div className="p-6">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.18))',
                    color: '#3B82F6',
                    boxShadow: '0 0 0 1px rgba(59,130,246,0.15)',
                  }}
                >
                  <Key className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Create API Key</h2>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">Configure access permissions</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">
                  Key Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Production Backend, CI/CD Pipeline"
                  className="h-10 w-full rounded-xl border border-gray-200/60 bg-white/[0.03] px-3.5 text-[13px] text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 focus:outline-none dark:border-white/[0.06] dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500/30"
                />
              </div>

              {/* Environment */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">Environment</label>
                <div className="flex gap-2">
                  {(['live', 'test'] as const).map((env) => (
                    <button
                      key={env}
                      onClick={() => setEnvironment(env)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-2.5 text-[12px] font-semibold transition-all"
                      style={
                        environment === env
                          ? env === 'live'
                            ? {
                                background: 'rgba(16,185,129,0.08)',
                                color: '#10B981',
                                border: '1px solid rgba(16,185,129,0.25)',
                              }
                            : {
                                background: 'rgba(245,158,11,0.08)',
                                color: '#F59E0B',
                                border: '1px solid rgba(245,158,11,0.25)',
                              }
                          : {
                              background: 'transparent',
                              color: '#9CA3AF',
                              border: '1px solid rgba(107,114,128,0.15)',
                            }
                      }
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: env === 'live' ? '#10B981' : '#F59E0B' }}
                      />
                      {env === 'live' ? 'Live' : 'Test'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Scopes */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">Permissions</label>
                <div className="flex gap-2">
                  {(['read', 'write', 'admin'] as Scope[]).map((scope) => {
                    const active = scopes.includes(scope);
                    const colors: Record<Scope, { active: string; border: string; activeBorder: string }> = {
                      read: {
                        active: 'rgba(59,130,246,0.08)',
                        border: 'rgba(107,114,128,0.15)',
                        activeBorder: 'rgba(59,130,246,0.25)',
                      },
                      write: {
                        active: 'rgba(245,158,11,0.08)',
                        border: 'rgba(107,114,128,0.15)',
                        activeBorder: 'rgba(245,158,11,0.25)',
                      },
                      admin: {
                        active: 'rgba(239,68,68,0.08)',
                        border: 'rgba(107,114,128,0.15)',
                        activeBorder: 'rgba(239,68,68,0.25)',
                      },
                    };
                    const textColors: Record<Scope, string> = {
                      read: '#3B82F6',
                      write: '#F59E0B',
                      admin: '#EF4444',
                    };
                    return (
                      <button
                        key={scope}
                        onClick={() => toggleScope(scope)}
                        className="flex flex-1 flex-col items-center gap-1 rounded-xl border py-2.5 text-[11px] font-semibold tracking-wide uppercase transition-all"
                        style={{
                          background: active ? colors[scope].active : 'transparent',
                          color: active ? textColors[scope] : '#9CA3AF',
                          border: `1px solid ${active ? colors[scope].activeBorder : colors[scope].border}`,
                        }}
                      >
                        {active && <Check className="h-3 w-3" />}
                        {scope}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expiration */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">Expiration</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200/60 bg-white/[0.03] px-3.5 text-[13px] text-gray-900 transition-all focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 focus:outline-none dark:border-white/[0.06] dark:bg-[#0d0d14] dark:text-white"
                >
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="365">1 year</option>
                  <option value="never">Never</option>
                </select>
              </div>

              {/* IP Whitelist */}
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">
                  IP Whitelist{' '}
                  <span className="font-normal text-gray-400 dark:text-gray-500">(optional, comma-separated)</span>
                </label>
                <textarea
                  value={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.value)}
                  placeholder="192.168.1.1, 10.0.0.0/24"
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200/60 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 transition-all focus:border-blue-500/40 focus:ring-2 focus:ring-blue-500/10 focus:outline-none dark:border-white/[0.06] dark:text-white dark:placeholder-gray-500 dark:focus:border-blue-500/30"
                />
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-medium"
                    style={{
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      color: '#EF4444',
                    }}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-200/60 py-2.5 text-[13px] font-semibold text-gray-600 transition-all hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={loading ? undefined : { scale: 1.02, y: -1 }}
                  whileTap={loading ? undefined : { scale: 0.98 }}
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                    boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
                  }}
                >
                  {loading ? <Spinner light /> : <Key className="h-3.5 w-3.5" />}
                  {loading ? 'Creating...' : 'Create Key'}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* ── New key reveal box ── */
function NewKeyReveal({ rawKey, onDismiss }: { rawKey: string; onDismiss: () => void }) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
      className="relative overflow-hidden rounded-2xl border"
      style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.03))',
        border: '1px solid rgba(16,185,129,0.2)',
        boxShadow: '0 0 32px rgba(16,185,129,0.08)',
      }}
    >
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-emerald-500 to-emerald-500/30" />

      <div className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-emerald-500" />
          <p className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
            Copy this key now — it won&apos;t be shown again
          </p>
        </div>

        <div
          className="relative flex items-center gap-3 rounded-xl p-3"
          style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)' }}
        >
          <code className="flex-1 overflow-x-auto font-mono text-[12px] whitespace-nowrap text-emerald-700 select-all dark:text-emerald-300">
            {visible ? rawKey : '•'.repeat(Math.min(rawKey.length, 52))}
          </code>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              onClick={() => setVisible((v) => !v)}
              className="flex h-7 w-7 items-center justify-center rounded-lg text-emerald-500 transition-colors hover:bg-emerald-500/10"
              title={visible ? 'Hide key' : 'Show key'}
            >
              {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleCopy}
              className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold text-emerald-700 transition-all dark:text-emerald-300"
              style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.2)' }}
            >
              <AnimatePresence mode="wait">
                {copied ? (
                  <motion.span key="check" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
                    <Check className="h-3.5 w-3.5" />
                  </motion.span>
                ) : (
                  <motion.span key="copy" initial={{ scale: 0.6 }} animate={{ scale: 1 }} exit={{ scale: 0.6 }}>
                    <Copy className="h-3.5 w-3.5" />
                  </motion.span>
                )}
              </AnimatePresence>
              {copied ? 'Copied' : 'Copy'}
            </motion.button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end">
          <button
            onClick={onDismiss}
            className="text-[12px] font-medium text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-300"
          >
            Dismiss
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Edit key modal ── */
function EditKeyModal({
  apiKey,
  onClose,
  onSave,
}: {
  apiKey: ApiKey;
  onClose: () => void;
  onSave: (updated: ApiKey) => void;
}) {
  const [name, setName] = useState(apiKey.name);
  const [scopes, setScopes] = useState<Scope[]>(apiKey.scopes);
  const [ipWhitelist, setIpWhitelist] = useState(apiKey.ipWhitelist.join(', '));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleScope = (scope: Scope) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Key name is required');
      return;
    }
    if (scopes.length === 0) {
      setError('Select at least one scope');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/developer/keys/${apiKey._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          scopes,
          ipWhitelist: ipWhitelist
            .split(',')
            .map((ip) => ip.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSave(data.data);
      } else {
        setError(data.error || 'Failed to update key');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111118]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-violet-500 to-violet-500/30" />

          <div className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Edit API Key</h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/[0.06] dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">Key Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-gray-200/60 bg-white/[0.03] px-3.5 text-[13px] text-gray-900 placeholder-gray-400 transition-all focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 focus:outline-none dark:border-white/[0.06] dark:text-white dark:placeholder-gray-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">Permissions</label>
                <div className="flex gap-2">
                  {(['read', 'write', 'admin'] as Scope[]).map((scope) => {
                    const active = scopes.includes(scope);
                    const textColors: Record<Scope, string> = { read: '#3B82F6', write: '#F59E0B', admin: '#EF4444' };
                    return (
                      <button
                        key={scope}
                        onClick={() => toggleScope(scope)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-[11px] font-semibold tracking-wide uppercase transition-all"
                        style={{
                          color: active ? textColors[scope] : '#9CA3AF',
                          border: `1px solid ${active ? `${textColors[scope]}40` : 'rgba(107,114,128,0.15)'}`,
                          background: active ? `${textColors[scope]}10` : 'transparent',
                        }}
                      >
                        {active && <Check className="h-3 w-3" />}
                        {scope}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">
                  IP Whitelist <span className="font-normal text-gray-400">(comma-separated)</span>
                </label>
                <textarea
                  value={ipWhitelist}
                  onChange={(e) => setIpWhitelist(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200/60 bg-white/[0.03] px-3.5 py-2.5 text-[13px] text-gray-900 placeholder-gray-400 transition-all focus:border-violet-500/40 focus:ring-2 focus:ring-violet-500/10 focus:outline-none dark:border-white/[0.06] dark:text-white dark:placeholder-gray-500"
                />
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12px] font-medium"
                    style={{
                      background: 'rgba(239,68,68,0.06)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      color: '#EF4444',
                    }}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-gray-200/60 py-2.5 text-[13px] font-semibold text-gray-600 transition-all hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
                <motion.button
                  whileHover={loading ? undefined : { scale: 1.02, y: -1 }}
                  whileTap={loading ? undefined : { scale: 0.98 }}
                  onClick={handleSave}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                    boxShadow: '0 4px 16px rgba(139,92,246,0.25)',
                  }}
                >
                  {loading ? <Spinner light /> : <Check className="h-3.5 w-3.5" />}
                  {loading ? 'Saving...' : 'Save Changes'}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* ── Revoke confirm modal ── */
function RevokeConfirmModal({
  apiKey,
  onClose,
  onConfirm,
}: {
  apiKey: ApiKey;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleRevoke = async () => {
    setLoading(true);
    await onConfirm();
    setLoading(false);
  };

  return (
    <>
      <ModalBackdrop onClose={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-gray-200/60 bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111118]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-red-500 to-red-500/30" />

          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  color: '#EF4444',
                  border: '1px solid rgba(239,68,68,0.15)',
                }}
              >
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Revoke API Key</h2>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">This cannot be undone</p>
              </div>
            </div>

            <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
              Are you sure you want to revoke{' '}
              <span className="font-semibold text-gray-900 dark:text-white">&ldquo;{apiKey.name}&rdquo;</span>? Any
              application using this key will immediately lose access.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200/60 py-2.5 text-[13px] font-semibold text-gray-600 transition-all hover:bg-gray-50 dark:border-white/[0.08] dark:text-gray-400 dark:hover:bg-white/[0.04]"
              >
                Cancel
              </button>
              <motion.button
                whileHover={loading ? undefined : { scale: 1.02 }}
                whileTap={loading ? undefined : { scale: 0.98 }}
                onClick={handleRevoke}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-[13px] font-semibold text-white shadow-md shadow-red-500/15 transition-all hover:bg-red-700 hover:shadow-lg hover:shadow-red-500/25 disabled:opacity-60"
              >
                {loading ? <Spinner light /> : <Trash2 className="h-3.5 w-3.5" />}
                {loading ? 'Revoking...' : 'Revoke Key'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}

/* ── Key card ── */
function KeyCard({
  apiKey,
  onEdit,
  onRevoke,
}: {
  apiKey: ApiKey;
  onEdit: (k: ApiKey) => void;
  onRevoke: (k: ApiKey) => void;
}) {
  const isRevoked = apiKey.status === 'revoked';

  return (
    <motion.div
      variants={staggerItem}
      layout
      className={`group relative overflow-hidden rounded-2xl border bg-white transition-all dark:bg-[#111118] ${
        isRevoked
          ? 'border-gray-200/40 opacity-60 dark:border-white/[0.04]'
          : 'border-gray-200/60 hover:border-gray-300/60 hover:shadow-sm dark:border-white/[0.06] dark:hover:border-white/[0.1]'
      }`}
      style={{ boxShadow: isRevoked ? 'none' : '0 1px 3px rgba(0,0,0,0.04)' }}
    >
      {!isRevoked && (
        <div
          className="absolute inset-x-0 top-0 h-[2px] opacity-60"
          style={{
            background:
              apiKey.environment === 'live'
                ? 'linear-gradient(90deg, #10B981, #10B98140)'
                : 'linear-gradient(90deg, #F59E0B, #F59E0B40)',
          }}
        />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: info */}
          <div className="min-w-0 flex-1">
            {/* Name + prefix */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background:
                    apiKey.environment === 'live'
                      ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.2))'
                      : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.2))',
                  color: apiKey.environment === 'live' ? '#10B981' : '#F59E0B',
                }}
              >
                <Key className="h-3.5 w-3.5" />
              </div>
              <p className="text-[14px] font-semibold text-gray-900 dark:text-white">{apiKey.name}</p>
              <code className="rounded-md bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-500 dark:bg-white/[0.06] dark:text-gray-400">
                {apiKey.prefix}••••••••
              </code>
            </div>

            {/* Badges row */}
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <EnvBadge env={apiKey.environment} />
              {apiKey.scopes.map((scope) => (
                <ScopeBadge key={scope} scope={scope} />
              ))}
              <StatusBadge status={apiKey.status} />
            </div>

            {/* Meta row */}
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                Created {relativeTime(apiKey.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3 shrink-0" />
                Last used: {relativeTime(apiKey.lastUsedAt)}
              </span>
              <span className="flex items-center gap-1">
                <Shield className="h-3 w-3 shrink-0" />
                {apiKey.totalRequests.toLocaleString()} requests
              </span>
              {apiKey.expiresAt && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 shrink-0" />
                  Expires {relativeTime(apiKey.expiresAt)}
                </span>
              )}
              {apiKey.ipWhitelist.length > 0 && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3 shrink-0" />
                  {apiKey.ipWhitelist.length} IP{apiKey.ipWhitelist.length > 1 ? 's' : ''} whitelisted
                </span>
              )}
            </div>
          </div>

          {/* Right: actions */}
          {!isRevoked && (
            <div className="flex shrink-0 items-center gap-1.5">
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onEdit(apiKey)}
                title="Edit key"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => onRevoke(apiKey)}
                title="Revoke key"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════ */
export default function ApiKeysPage() {
  const { user } = useAuth();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [revokingKey, setRevokingKey] = useState<ApiKey | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isPro = user?.plan === 'pro' || user?.plan === 'enterprise';

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/developer/keys');
      const data = await res.json();
      if (data.success) setKeys(data.data);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreated = (key: ApiKey, rawKey: string) => {
    setKeys((prev) => [key, ...prev]);
    setNewRawKey(rawKey);
    setShowCreate(false);
    showToast('success', 'API key created successfully');
  };

  const handleEdited = (updated: ApiKey) => {
    setKeys((prev) => prev.map((k) => (k._id === updated._id ? updated : k)));
    setEditingKey(null);
    showToast('success', 'API key updated');
  };

  const handleRevoke = async () => {
    if (!revokingKey) return;
    try {
      const res = await fetch(`/api/developer/keys/${revokingKey._id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setKeys((prev) => prev.map((k) => (k._id === revokingKey._id ? { ...k, status: 'revoked' as const } : k)));
        showToast('success', `"${revokingKey.name}" has been revoked`);
      } else {
        showToast('error', data.error || 'Failed to revoke key');
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setRevokingKey(null);
    }
  };

  const activeKeys = keys.filter((k) => k.status === 'active');
  const revokedKeys = keys.filter((k) => k.status === 'revoked');

  return (
    <>
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        {/* ── Header ── */}
        <motion.div {...fadeUp} className="space-y-1">
          <Link
            href="/dashboard/settings"
            className="mb-3 inline-flex items-center gap-1.5 text-[11px] font-medium text-gray-400 transition-colors hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to Settings
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(99,102,241,0.2))',
                  color: '#3B82F6',
                  boxShadow: '0 0 0 1px rgba(59,130,246,0.18)',
                }}
              >
                <Key className="h-5 w-5" />
              </div>
              <div>
                <h1 className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>API Keys</h1>
                <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                  Manage programmatic access to your WinBix AI workspace
                </p>
              </div>
            </div>

            {isPro && (
              <motion.button
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowCreate(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white shadow-md transition-all hover:shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
                }}
              >
                <Plus className="h-4 w-4" />
                New Key
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* ── Upgrade CTA (free plan) ── */}
        {!isPro && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden rounded-2xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(99,102,241,0.04) 50%, rgba(139,92,246,0.04) 100%)',
              border: '1px solid rgba(59,130,246,0.15)',
              boxShadow: '0 0 40px rgba(59,130,246,0.06)',
            }}
          >
            <div
              className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-20 blur-3xl"
              style={{ background: 'radial-gradient(circle, #3B82F6, transparent)' }}
            />

            <div className="relative p-6">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                    boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
                  }}
                >
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <h2 className={`${syne.className} text-[17px] font-bold text-gray-900 dark:text-white`}>
                    Unlock API Access on Pro
                  </h2>
                  <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                    API keys are available on the Pro plan. Connect your backend, automate workflows, and build custom
                    integrations with full programmatic access to your WinBix AI workspace.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: Key, label: 'Secure API Keys', desc: 'Scoped & expirable tokens' },
                  { icon: Shield, label: 'IP Whitelisting', desc: 'Lock down by IP or CIDR' },
                  { icon: Globe, label: 'Full REST API', desc: 'Widgets, leads, analytics' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                    style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.1)' }}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-blue-400" />
                    <div>
                      <p className="text-[12px] font-semibold text-gray-900 dark:text-white">{label}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5">
                <a href="/plans">
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                      boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
                    }}
                  >
                    <Crown className="h-4 w-4" />
                    Upgrade to Pro
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </motion.button>
                </a>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── New key reveal ── */}
        <AnimatePresence>
          {newRawKey && <NewKeyReveal rawKey={newRawKey} onDismiss={() => setNewRawKey(null)} />}
        </AnimatePresence>

        {/* ── Key list ── */}
        {isPro && (
          <>
            {/* Skeleton */}
            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <KeySkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && keys.length === 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200/80 py-16 text-center dark:border-white/[0.08]"
              >
                <div
                  className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(99,102,241,0.12))',
                    color: '#3B82F6',
                    border: '1px solid rgba(59,130,246,0.15)',
                  }}
                >
                  <Key className="h-6 w-6" />
                </div>
                <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">No API keys yet</h3>
                <p className="mt-1 max-w-xs text-[13px] text-gray-500 dark:text-gray-400">
                  Create your first API key to start integrating with the WinBix AI platform.
                </p>
                <motion.button
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowCreate(true)}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
                    boxShadow: '0 4px 16px rgba(59,130,246,0.25)',
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Create First Key
                </motion.button>
              </motion.div>
            )}

            {/* Active keys */}
            {!loading && activeKeys.length > 0 && (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                    Active Keys ({activeKeys.length})
                  </p>
                </div>
                {activeKeys.map((key) => (
                  <KeyCard key={key._id} apiKey={key} onEdit={setEditingKey} onRevoke={setRevokingKey} />
                ))}
              </motion.div>
            )}

            {/* Revoked keys */}
            {!loading && revokedKeys.length > 0 && (
              <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
                <p className="text-[11px] font-semibold tracking-wider text-gray-400 uppercase dark:text-gray-500">
                  Revoked Keys ({revokedKeys.length})
                </p>
                {revokedKeys.map((key) => (
                  <KeyCard key={key._id} apiKey={key} onEdit={setEditingKey} onRevoke={setRevokingKey} />
                ))}
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showCreate && <CreateKeyModal onClose={() => setShowCreate(false)} onCreate={handleCreated} />}
      </AnimatePresence>
      <AnimatePresence>
        {editingKey && <EditKeyModal apiKey={editingKey} onClose={() => setEditingKey(null)} onSave={handleEdited} />}
      </AnimatePresence>
      <AnimatePresence>
        {revokingKey && (
          <RevokeConfirmModal apiKey={revokingKey} onClose={() => setRevokingKey(null)} onConfirm={handleRevoke} />
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </>
  );
}
