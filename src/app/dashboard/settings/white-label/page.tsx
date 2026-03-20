'use client';

import { useState, useEffect, useCallback } from 'react';
import { Syne } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import {
  Palette,
  Globe,
  Eye,
  EyeOff,
  Save,
  Crown,
  ArrowUpRight,
  Check,
  AlertTriangle,
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
    transition: { staggerChildren: 0.09, delayChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
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

/* ── Types ── */
interface WhiteLabelSettings {
  enabled: boolean;
  customDomain: string | null;
  hideBranding: boolean;
  brandName: string | null;
  brandColor: string | null;
  logoUrl: string | null;
}

/* ── Toggle Switch ── */
function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-gray-900 dark:text-white">{label}</p>
        {description && <p className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none"
        style={{
          background: checked ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' : 'rgba(107,114,128,0.15)',
          boxShadow: checked ? '0 0 0 1px rgba(139,92,246,0.3)' : '0 0 0 1px rgba(107,114,128,0.15)',
        }}
        aria-checked={checked}
        role="switch"
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="inline-block h-4 w-4 rounded-full bg-white shadow-sm"
          style={{ marginLeft: checked ? '24px' : '4px' }}
        />
      </button>
    </div>
  );
}

/* ── Inline spinner ── */
function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
  );
}

/* ── Toast ── */
function Toast({ type, message }: { type: 'success' | 'error'; message: string }) {
  const isSuccess = type === 'success';
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="fixed right-6 bottom-6 z-50 flex items-center gap-2.5 rounded-2xl px-5 py-3 text-[13px] font-semibold shadow-xl"
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
    </motion.div>
  );
}

/* ── Widget Preview Card ── */
function WidgetPreview({
  hideBranding,
  brandName,
  brandColor,
}: {
  hideBranding: boolean;
  brandName: string | null;
  brandColor: string | null;
}) {
  const accentColor = brandColor || '#8B5CF6';
  const displayBrandName = brandName || 'WinBix AI';

  return (
    <div
      className="overflow-hidden rounded-2xl border"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
      }}
    >
      {/* Chat header */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{ background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}10)` }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
          style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
        >
          AI
        </div>
        <div>
          <p className="text-[13px] font-semibold text-gray-900 dark:text-white">{displayBrandName}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Online · Typically replies instantly</p>
        </div>
        <div
          className="ml-auto h-2 w-2 rounded-full"
          style={{ background: '#10B981', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }}
        />
      </div>

      {/* Chat body */}
      <div className="space-y-2.5 px-4 py-3">
        <div className="flex justify-start">
          <div
            className="max-w-[75%] rounded-2xl rounded-tl-sm px-3 py-2 text-[12px] text-gray-900 dark:text-white"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            Hello! How can I help you today?
          </div>
        </div>
        <div className="flex justify-end">
          <div
            className="max-w-[75%] rounded-2xl rounded-tr-sm px-3 py-2 text-[12px] text-white"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
          >
            I have a question about pricing.
          </div>
        </div>
      </div>

      {/* Footer — shows/hides branding */}
      <div
        className="flex items-center justify-between border-t px-4 py-2"
        style={{ borderColor: 'rgba(255,255,255,0.04)', background: 'rgba(0,0,0,0.1)' }}
      >
        <div className="h-7 flex-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }} />
        {!hideBranding ? (
          <motion.div
            key="branding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ml-3 shrink-0 text-[10px] font-medium text-gray-400 dark:text-gray-500"
          >
            Powered by <span style={{ color: accentColor }}>WinBix AI</span>
          </motion.div>
        ) : (
          <motion.div
            key="no-branding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ml-3 shrink-0 text-[10px] font-medium text-emerald-500"
          >
            Branding hidden
          </motion.div>
        )}
      </div>
    </div>
  );
}

/* ── Field wrapper ── */
function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <label className="block text-[12px] font-medium text-gray-500 dark:text-gray-400">{label}</label>
        {hint && <span className="text-[10px] text-gray-400 dark:text-gray-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────── */
export default function WhiteLabelPage() {
  const { user } = useAuth();

  const [isEnterprise, setIsEnterprise] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [customDomain, setCustomDomain] = useState('');
  const [hideBranding, setHideBranding] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandColor, setBrandColor] = useState('#8B5CF6');
  const [logoUrl, setLogoUrl] = useState('');

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/org/white-label');
        const data = await res.json();
        if (data.success) {
          setIsEnterprise(data.data.isEnterprise);
          const wl: WhiteLabelSettings = data.data.whiteLabel;
          if (wl) {
            setCustomDomain(wl.customDomain || '');
            setHideBranding(wl.hideBranding ?? false);
            setBrandName(wl.brandName || '');
            setBrandColor(wl.brandColor || '#8B5CF6');
            setLogoUrl(wl.logoUrl || '');
          }
        }
      } catch {
        // silently fail — user sees upgrade CTA if not enterprise
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/org/white-label', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customDomain: customDomain || null,
          hideBranding,
          brandName: brandName || null,
          brandColor: brandColor || null,
          logoUrl: logoUrl || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast('success', 'White-label settings saved');
      } else {
        showToast('error', data.error || 'Failed to save settings');
      }
    } catch {
      showToast('error', 'Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'h-10 w-full rounded-xl border bg-white/[0.03] px-3.5 text-[13px] text-gray-900 placeholder-gray-400 transition-all dark:text-white dark:placeholder-gray-500 focus:outline-none focus:ring-2 border-gray-200/60 dark:border-white/[0.06] focus:border-violet-500/40 focus:ring-violet-500/10 dark:focus:border-violet-500/30';

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-12">
        <div className="h-16 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.03]" />
        <div className="h-64 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.03]" />
        <div className="h-96 animate-pulse rounded-2xl bg-gray-100 dark:bg-white/[0.03]" />
      </div>
    );
  }

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
          <div className="flex items-start gap-3">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.25))',
                color: '#8B5CF6',
                boxShadow: '0 0 0 1px rgba(139,92,246,0.2)',
              }}
            >
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className={`${syne.className} text-2xl font-bold text-gray-900 dark:text-white`}>
                  White-Label Settings
                </h1>
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(99,102,241,0.12))',
                    color: '#8B5CF6',
                    border: '1px solid rgba(139,92,246,0.2)',
                  }}
                >
                  <Crown className="h-2.5 w-2.5" />
                  Enterprise
                </span>
              </div>
              <p className="mt-1 text-[13px] text-gray-500 dark:text-gray-400">
                Customize branding, domain, and remove WinBix attribution from your widgets
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Enterprise gate ── */}
        {!isEnterprise && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative overflow-hidden rounded-2xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(139,92,246,0.06) 0%, rgba(99,102,241,0.04) 50%, rgba(236,72,153,0.04) 100%)',
              border: '1px solid rgba(139,92,246,0.15)',
              boxShadow: '0 0 40px rgba(139,92,246,0.06)',
            }}
          >
            {/* Glow blob */}
            <div
              className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full opacity-20 blur-3xl"
              style={{ background: 'radial-gradient(circle, #8B5CF6, transparent)' }}
            />

            <div className="relative p-6">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                    boxShadow: '0 8px 24px rgba(139,92,246,0.3)',
                  }}
                >
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1 space-y-1">
                  <h2 className={`${syne.className} text-[17px] font-bold text-gray-900 dark:text-white`}>
                    Unlock White-Label on Enterprise
                  </h2>
                  <p className="text-[13px] leading-relaxed text-gray-500 dark:text-gray-400">
                    White-label features — custom domain, hidden branding, custom brand colors — are exclusive to the
                    Enterprise plan. Upgrade to present a fully branded AI experience to your customers.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { icon: Globe, label: 'Custom Domain', desc: 'chat.yourdomain.com' },
                  { icon: EyeOff, label: 'Hide Branding', desc: 'Remove "Powered by WinBix AI"' },
                  { icon: Palette, label: 'Brand Colors', desc: 'Your colors, your identity' },
                ].map(({ icon: Icon, label, desc }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                    style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.1)' }}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-violet-400" />
                    <div>
                      <p className="text-[12px] font-semibold text-gray-900 dark:text-white">{label}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-3">
                <a href="/dashboard/billing">
                  <motion.button
                    whileHover={{ scale: 1.03, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                      boxShadow: '0 8px 24px rgba(139,92,246,0.3)',
                    }}
                  >
                    <Crown className="h-4 w-4" />
                    Upgrade to Enterprise
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </motion.button>
                </a>
                <p className="text-[11px] text-gray-400 dark:text-gray-500">
                  Current plan:{' '}
                  <span className="font-semibold text-gray-600 capitalize dark:text-gray-300">
                    {user?.orgPlan || user?.plan || 'Free'}
                  </span>
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Settings form (always rendered for enterprise, blurred for others) ── */}
        <div className={!isEnterprise ? 'pointer-events-none opacity-40 select-none' : ''}>
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-5">
            {/* ── BRANDING ── */}
            <motion.div
              variants={staggerItem}
              className="relative overflow-hidden rounded-2xl border bg-white transition-all dark:bg-[#111118]"
              style={{
                borderColor: 'rgba(139,92,246,0.12)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              {/* Top accent */}
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #8B5CF6, #8B5CF640)' }}
              />

              <div className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.2))',
                      color: '#8B5CF6',
                      boxShadow: '0 0 0 1px rgba(139,92,246,0.15)',
                    }}
                  >
                    <Palette className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Brand Identity</h2>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Customize how your brand appears in widgets
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FieldGroup label="Brand Name" hint="Shown in widget header">
                      <input
                        type="text"
                        className={inputClass}
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="Your Company Name"
                        disabled={!isEnterprise}
                      />
                    </FieldGroup>

                    <FieldGroup label="Brand Color" hint="Primary accent color">
                      <div className="relative flex items-center gap-2">
                        <div
                          className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl border"
                          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
                        >
                          <input
                            type="color"
                            value={brandColor}
                            onChange={(e) => setBrandColor(e.target.value)}
                            disabled={!isEnterprise}
                            className="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
                          />
                          <div className="h-full w-full rounded-xl" style={{ background: brandColor }} />
                        </div>
                        <input
                          type="text"
                          className={inputClass}
                          value={brandColor}
                          onChange={(e) => setBrandColor(e.target.value)}
                          placeholder="#8B5CF6"
                          maxLength={7}
                          disabled={!isEnterprise}
                        />
                      </div>
                    </FieldGroup>
                  </div>

                  <FieldGroup label="Logo URL" hint="PNG or SVG, max 64px height recommended">
                    <input
                      type="url"
                      className={inputClass}
                      value={logoUrl}
                      onChange={(e) => setLogoUrl(e.target.value)}
                      placeholder="https://yourdomain.com/logo.svg"
                      disabled={!isEnterprise}
                    />
                  </FieldGroup>

                  <div
                    className="rounded-xl p-4"
                    style={{ background: 'rgba(139,92,246,0.03)', border: '1px solid rgba(139,92,246,0.08)' }}
                  >
                    <ToggleSwitch
                      checked={hideBranding}
                      onChange={setHideBranding}
                      label="Hide WinBix Branding"
                      description='Removes the "Powered by WinBix AI" footer text from all widgets'
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── CUSTOM DOMAIN ── */}
            <motion.div
              variants={staggerItem}
              className="relative overflow-hidden rounded-2xl border bg-white transition-all dark:bg-[#111118]"
              style={{
                borderColor: 'rgba(59,130,246,0.1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #3B82F6, #3B82F640)' }}
              />

              <div className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.18))',
                      color: '#3B82F6',
                      boxShadow: '0 0 0 1px rgba(59,130,246,0.12)',
                    }}
                  >
                    <Globe className="h-[18px] w-[18px]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Custom Domain</h2>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Serve the widget API from your own subdomain
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <FieldGroup label="Custom Domain" hint="e.g. chat.yourdomain.com">
                    <div className="relative">
                      <Globe className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        className={`${inputClass} pl-10`}
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                        placeholder="chat.yourdomain.com"
                        disabled={!isEnterprise}
                      />
                    </div>
                  </FieldGroup>

                  <div
                    className="rounded-xl p-4 text-[12px] leading-relaxed text-gray-500 dark:text-gray-400"
                    style={{ background: 'rgba(59,130,246,0.04)', border: '1px solid rgba(59,130,246,0.08)' }}
                  >
                    <p className="mb-1 font-semibold text-gray-700 dark:text-gray-300">DNS Configuration</p>
                    Add a CNAME record pointing{' '}
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/[0.06]">
                      chat.yourdomain.com
                    </code>{' '}
                    to{' '}
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/[0.06]">
                      winbixai.com
                    </code>
                    , then contact support to finalize SSL provisioning.
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── PREVIEW ── */}
            <motion.div
              variants={staggerItem}
              className="relative overflow-hidden rounded-2xl border bg-white transition-all dark:bg-[#111118]"
              style={{
                borderColor: 'rgba(16,185,129,0.1)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, #10B981, #10B98140)' }}
              />

              <div className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(16,185,129,0.18))',
                      color: '#10B981',
                      boxShadow: '0 0 0 1px rgba(16,185,129,0.12)',
                    }}
                  >
                    {hideBranding ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                  </div>
                  <div>
                    <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">Widget Preview</h2>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Live preview of your branded widget footer
                    </p>
                  </div>
                </div>

                <div className="mx-auto max-w-sm">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${hideBranding}-${brandColor}-${brandName}`}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.25 }}
                    >
                      <WidgetPreview
                        hideBranding={hideBranding}
                        brandName={brandName || null}
                        brandColor={brandColor}
                      />
                    </motion.div>
                  </AnimatePresence>
                </div>

                <p className="mt-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
                  Preview updates in real-time as you adjust settings above
                </p>
              </div>
            </motion.div>

            {/* ── SAVE BUTTON ── */}
            <motion.div variants={staggerItem} className="flex items-center justify-end gap-3">
              <motion.button
                whileHover={saving || !isEnterprise ? undefined : { scale: 1.03, y: -1 }}
                whileTap={saving || !isEnterprise ? undefined : { scale: 0.97 }}
                onClick={handleSave}
                disabled={saving || !isEnterprise}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-[13px] font-semibold text-white shadow-md transition-all hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
                style={{
                  background: 'linear-gradient(135deg, #8B5CF6, #6366F1)',
                  boxShadow: '0 4px 16px rgba(139,92,246,0.25)',
                }}
              >
                {saving ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save White-Label Settings
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ── Toast notification ── */}
      <AnimatePresence>{toast && <Toast type={toast.type} message={toast.message} />}</AnimatePresence>
    </>
  );
}
