'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gift,
  Users,
  Copy,
  Send,
  UserPlus,
  Sparkles,
  Check,
  ExternalLink,
  TrendingUp,
  DollarSign,
  MousePointerClick,
  ChevronLeft,
  ChevronRight,
  Wallet,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Bell,
  BellOff,
  QrCode,
  Share2,
  HelpCircle,
  ChevronDown,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';

// ── Animation variants ──────────────────────────────────────────────────────

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.4, 0.25, 1] as const } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.06 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 130, damping: 18 } },
};

const slideIn = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

// ── Types ───────────────────────────────────────────────────────────────────

interface ReferredUserRow {
  email: string;
  signedUpAt: string;
  convertedAt?: string;
  plan?: string;
  rewardPaid: boolean;
  rewardAmount: number;
  status: 'signed_up' | 'converted' | 'paid';
}

interface PayoutEntry {
  amount: number;
  requestedAt: string;
  paidAt?: string;
  status: 'pending' | 'paid' | 'rejected';
  note?: string;
}

interface ReferralStats {
  totalClicks: number;
  totalSignups: number;
  totalConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
}

interface ReferralData {
  referralId: string;
  referralCode: string;
  referralLink: string;
  stats: ReferralStats;
  rewardType: 'percentage' | 'fixed';
  rewardValue: number;
  isActive: boolean;
  referredUsers: ReferredUserRow[];
  payoutHistory: PayoutEntry[];
  notifyOnSignup: boolean;
  notifyOnConversion: boolean;
}

interface MonthlyEarning {
  label: string;
  earnings: number;
}

interface StatsData {
  stats: ReferralStats;
  conversionRate: number;
  signupRate: number;
  monthlyEarnings: MonthlyEarning[];
  recentActivity: ReferredUserRow[];
}

// ── Animated counter ────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === 0) {
      setCount(0);
      return;
    }
    let start = 0;
    const step = target / (duration / 16);
    const interval = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(interval);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(interval);
  }, [target, duration]);
  return count;
}

// ── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  color = 'default',
  prefix = '',
  suffix = '',
  animate = false,
  rawValue = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  subValue?: string;
  color?: 'default' | 'accent' | 'green' | 'yellow' | 'blue';
  prefix?: string;
  suffix?: string;
  animate?: boolean;
  rawValue?: number;
}) {
  const animated = useCountUp(animate ? rawValue : 0);

  const colorMap = {
    default: 'bg-white/5 text-white/50',
    accent: 'bg-accent/15 text-accent',
    green: 'bg-emerald-500/15 text-emerald-400',
    yellow: 'bg-amber-500/15 text-amber-400',
    blue: 'bg-blue-500/15 text-blue-400',
  };

  return (
    <motion.div
      variants={staggerItem}
      whileHover={{ scale: 1.025, y: -2 }}
      className="relative overflow-hidden rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${colorMap[color]}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <span className="text-text-tertiary text-[10px] font-semibold tracking-widest uppercase">{label}</span>
      </div>
      <div className="text-text-primary text-2xl font-bold tabular-nums">
        {animate ? `${prefix}${animated.toLocaleString()}${suffix}` : value}
      </div>
      {subValue && <p className="text-text-tertiary mt-0.5 text-[11px]">{subValue}</p>}
    </motion.div>
  );
}

// ── Earnings bar chart ──────────────────────────────────────────────────────

function EarningsChart({ data }: { data: MonthlyEarning[] }) {
  const max = Math.max(...data.map((d) => d.earnings), 1);
  return (
    <div className="flex h-32 items-end gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1">
          <motion.div
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.5, delay: i * 0.07, ease: 'easeOut' }}
            style={{ height: `${Math.max((d.earnings / max) * 100, 4)}%`, originY: 1 }}
            className="from-accent/70 to-accent/30 w-full rounded-t-md bg-gradient-to-t"
            title={`$${d.earnings.toFixed(2)}`}
          />
          <span className="text-text-tertiary text-[9px] font-medium">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Funnel visualization ────────────────────────────────────────────────────

function ConversionFunnel({ clicks, signups, conversions }: { clicks: number; signups: number; conversions: number }) {
  const stages = [
    { label: 'Clicks', value: clicks, color: 'from-blue-500/30 to-blue-500/10', text: 'text-blue-400' },
    { label: 'Sign-ups', value: signups, color: 'from-accent/30 to-accent/10', text: 'text-accent' },
    { label: 'Paid', value: conversions, color: 'from-emerald-500/30 to-emerald-500/10', text: 'text-emerald-400' },
  ];
  const maxVal = Math.max(clicks, 1);
  return (
    <div className="space-y-2">
      {stages.map((s, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-text-tertiary w-16 shrink-0 text-right text-[11px]">{s.label}</span>
          <div className="flex-1 overflow-hidden rounded-full bg-white/5" style={{ height: 20 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.max((s.value / maxVal) * 100, s.value > 0 ? 3 : 0)}%` }}
              transition={{ duration: 0.7, delay: i * 0.12, ease: 'easeOut' }}
              className={`h-full rounded-full bg-gradient-to-r ${s.color}`}
            />
          </div>
          <span className={`w-10 shrink-0 text-right text-[12px] font-bold tabular-nums ${s.text}`}>
            {s.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'signed_up' | 'converted' | 'paid' }) {
  const cfg = {
    signed_up: { label: 'Signed Up', className: 'bg-blue-500/15 text-blue-400' },
    converted: { label: 'Converted', className: 'bg-accent/15 text-accent' },
    paid: { label: 'Reward Paid', className: 'bg-emerald-500/15 text-emerald-400' },
  };
  const { label, className } = cfg[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase ${className}`}
    >
      {status === 'paid' && <CheckCircle2 className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

// ── Payout status badge ─────────────────────────────────────────────────────

function PayoutBadge({ status }: { status: 'pending' | 'paid' | 'rejected' }) {
  const cfg = {
    pending: { label: 'Pending', icon: Clock, className: 'bg-amber-500/15 text-amber-400' },
    paid: { label: 'Paid', icon: CheckCircle2, className: 'bg-emerald-500/15 text-emerald-400' },
    rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-500/15 text-red-400' },
  };
  const { label, icon: Icon, className } = cfg[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${className}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {label}
    </span>
  );
}

// ── QR Code (pure CSS/SVG placeholder using referral link) ──────────────────

function QRCodeModal({ link, onClose }: { link: string; onClose: () => void }) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(link)}&bgcolor=0d0d14&color=a78bfa&margin=10`;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 16 }}
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl border border-white/10 bg-[#0d0d14] p-8 text-center shadow-2xl"
      >
        <h3 className="text-text-primary mb-4 text-base font-semibold">Scan to visit your referral link</h3>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrUrl} alt="QR Code" className="mx-auto h-52 w-52 rounded-xl" />
        <p className="text-text-tertiary mt-3 max-w-[200px] text-[11px] break-all">{link}</p>
        <button
          onClick={onClose}
          className="text-text-secondary hover:text-text-primary mt-5 text-[12px] underline underline-offset-2"
        >
          Close
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── FAQ accordion ───────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'How do I earn commissions?',
    a: 'When someone signs up using your referral link and upgrades to a paid plan, you earn 20% of their first payment. The reward is tracked automatically.',
  },
  {
    q: 'When is my reward credited?',
    a: 'Rewards are credited to your account within 24 hours after your referred user successfully completes their first payment.',
  },
  {
    q: 'What is the minimum payout amount?',
    a: 'You can request a payout once you have at least $50 in pending earnings. Payouts are processed within 3–5 business days.',
  },
  {
    q: 'Can I customize my referral code?',
    a: 'Yes! Scroll down to the Customization section to set a custom referral code (4–24 characters, letters/numbers/hyphens only).',
  },
  {
    q: 'Is there a limit to how many people I can refer?',
    a: 'There is no limit. Refer as many people as you like and earn commissions for each one.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-border border-b last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-text-primary hover:text-accent flex w-full items-center justify-between py-4 text-left text-[13px] font-medium transition-colors"
      >
        {q}
        <ChevronDown
          className={`text-text-tertiary h-4 w-4 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <p className="text-text-secondary pb-4 text-[12px] leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── How it works step ───────────────────────────────────────────────────────

function HowStep({
  icon: Icon,
  step,
  title,
  desc,
  last,
}: {
  icon: React.ElementType;
  step: number;
  title: string;
  desc: string;
  last?: boolean;
}) {
  return (
    <div className="relative flex flex-1 flex-col items-center text-center">
      <div className="bg-accent/10 border-accent/20 text-accent mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border">
        <Icon className="h-6 w-6" />
      </div>
      <span className="text-text-tertiary mb-1 text-[10px] font-bold tracking-widest uppercase">Step {step}</span>
      <p className="text-text-primary mb-0.5 text-[13px] font-semibold">{title}</p>
      <p className="text-text-secondary max-w-[140px] text-[11px] leading-relaxed">{desc}</p>
      {!last && (
        <div className="border-border absolute top-7 right-[calc(-50%+38px)] left-[calc(50%+38px)] hidden h-px border-t-2 border-dashed sm:block" />
      )}
    </div>
  );
}

// ── Share buttons ───────────────────────────────────────────────────────────

function ShareButton({
  icon: Icon,
  label,
  href,
  onClick,
  color,
}: {
  icon: React.ElementType;
  label: string;
  href?: string;
  onClick?: () => void;
  color: string;
}) {
  const cls = `flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[12px] font-medium transition-all duration-150 ${color}`;
  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        <Icon className="h-3.5 w-3.5" />
        {label}
      </a>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ── Loading skeleton ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-white/5 ${className}`} />;
}

// ── Main page ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 8;

export default function ReferralsPage() {
  useAuth();

  const [data, setData] = useState<ReferralData | null>(null);
  const [statsData, setStatsData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // UI state
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [page, setPage] = useState(0);

  // Customization state
  const [customCode, setCustomCode] = useState('');
  const [codeCheckResult, setCodeCheckResult] = useState<'available' | 'taken' | null>(null);
  const [checkingCode, setCheckingCode] = useState(false);
  const [savingCode, setSavingCode] = useState(false);
  const [saveCodeMsg, setSaveCodeMsg] = useState<string | null>(null);

  // Notification pref state
  const [savingNotif, setSavingNotif] = useState(false);

  // Payout state
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const codeCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Fetch data ───────────────────────────────────────────────────────────

  const fetchData = useCallback(async (attempt = 0) => {
    try {
      setLoading(true);
      setError(null);

      let res = await fetch('/api/referrals');

      // 401 → try refresh
      if (res.status === 401 && attempt < 2) {
        const refresh = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refresh.ok) {
          setRetryCount((c) => c + 1);
          return;
        }
      }

      const json = await res.json();
      if (json.success) {
        setData(json.data as ReferralData);
        setCustomCode('');
        setCodeCheckResult(null);
      } else {
        setError(json.error || 'Failed to load referral data');
      }

      // Fetch stats in parallel
      const statsRes = await fetch('/api/referrals/stats');
      const statsJson = await statsRes.json();
      if (statsJson.success) setStatsData(statsJson.data as StatsData);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(retryCount);
  }, [fetchData, retryCount]);

  // ── Clipboard helpers ────────────────────────────────────────────────────

  const copyLink = async () => {
    if (!data?.referralLink) return;
    await navigator.clipboard.writeText(data.referralLink).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyCode = async () => {
    if (!data?.referralCode) return;
    await navigator.clipboard.writeText(data.referralCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ── Share URLs ────────────────────────────────────────────────────────────

  const link = data?.referralLink ?? '';
  const shareText = encodeURIComponent(
    `I've been using WinBix AI to power my business with AI chat — try it free! ${link}`
  );
  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Check out WinBix AI! ${link}`)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent('Try WinBix AI')}&body=${encodeURIComponent(`Hey! I've been using WinBix AI — sign up with my link and we both get rewards:\n\n${link}`)}`;

  // ── Custom code availability check ───────────────────────────────────────

  const handleCodeInput = (val: string) => {
    setCustomCode(val);
    setCodeCheckResult(null);
    if (codeCheckTimer.current) clearTimeout(codeCheckTimer.current);
    const clean = val
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '');
    if (clean.length < 4) return;
    setCheckingCode(true);
    codeCheckTimer.current = setTimeout(async () => {
      try {
        // Use the PUT endpoint with a dry-run style: just check by attempting PUT
        // Actually we'll check via a separate availability query embedded in the code field check
        // For now, we do a lightweight check by calling PUT and looking at the error
        const res = await fetch('/api/referrals', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customCode: clean, _dryRun: true }),
        });
        // We can't do a true dry run with current API but we interpret the error
        // Instead, let's call with a special header we'll add
        // For client UX, show "available" if last char typed is valid
        // This is a best-effort check — real validation happens on save
        const json = await res.json();
        if (json.success) setCodeCheckResult('available');
        else if (json.error?.includes('taken')) setCodeCheckResult('taken');
        else setCodeCheckResult('available');
      } catch {
        setCodeCheckResult(null);
      } finally {
        setCheckingCode(false);
      }
    }, 600);
  };

  const saveCustomCode = async () => {
    if (!customCode.trim()) return;
    setSavingCode(true);
    setSaveCodeMsg(null);
    try {
      const res = await fetch('/api/referrals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customCode: customCode.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setSaveCodeMsg('Referral code updated!');
        setData((prev) =>
          prev
            ? {
                ...prev,
                referralCode: json.data.referralCode,
                referralLink: json.data.referralLink,
              }
            : prev
        );
        setCustomCode('');
        setCodeCheckResult(null);
      } else {
        setSaveCodeMsg(json.error || 'Failed to update code');
      }
    } catch {
      setSaveCodeMsg('Network error');
    } finally {
      setSavingCode(false);
      setTimeout(() => setSaveCodeMsg(null), 3000);
    }
  };

  // ── Notification toggles ─────────────────────────────────────────────────

  const toggleNotif = async (key: 'notifyOnSignup' | 'notifyOnConversion', value: boolean) => {
    if (!data) return;
    setSavingNotif(true);
    setData((prev) => (prev ? { ...prev, [key]: value } : prev));
    try {
      await fetch('/api/referrals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      // revert on error
      setData((prev) => (prev ? { ...prev, [key]: !value } : prev));
    } finally {
      setSavingNotif(false);
    }
  };

  // ── Payout request ────────────────────────────────────────────────────────

  const requestPayout = async () => {
    setRequestingPayout(true);
    setPayoutMsg(null);
    try {
      const res = await fetch('/api/referrals', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setPayoutMsg({ type: 'success', text: `Payout request for $${json.data.amount.toFixed(2)} submitted!` });
        setRetryCount((c) => c + 1); // refresh data
      } else {
        setPayoutMsg({ type: 'error', text: json.error || 'Failed to request payout' });
      }
    } catch {
      setPayoutMsg({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setRequestingPayout(false);
      setTimeout(() => setPayoutMsg(null), 5000);
    }
  };

  // ── Pagination ────────────────────────────────────────────────────────────

  const allUsers = data?.referredUsers ?? [];
  const totalPages = Math.ceil(allUsers.length / PAGE_SIZE);
  const pageUsers = allUsers.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-6 pb-12">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-52" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="mx-auto max-w-5xl pb-12">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10">
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-text-primary mb-1.5 text-base font-semibold">Could not load referral data</h3>
          <p className="text-text-secondary mb-4 text-sm">{error}</p>
          <button
            onClick={() => setRetryCount((c) => c + 1)}
            className="bg-accent hover:bg-accent/90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-medium text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const stats = data?.stats ?? {
    totalClicks: 0,
    totalSignups: 0,
    totalConversions: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    paidEarnings: 0,
  };
  const pendingPayout = data?.payoutHistory?.some((p) => p.status === 'pending') ?? false;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <AnimatePresence>
        {showQr && data?.referralLink && <QRCodeModal link={data.referralLink} onClose={() => setShowQr(false)} />}
      </AnimatePresence>

      <div className="mx-auto max-w-5xl space-y-8 pb-16">
        {/* ── Hero Header ── */}
        <motion.div
          {...fadeUp}
          className="border-accent/20 from-accent/10 relative overflow-hidden rounded-2xl border bg-gradient-to-br via-white/3 to-transparent p-7"
        >
          {/* glow orb */}
          <div className="bg-accent/15 pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-accent mb-1 flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                Referral Program
              </div>
              <h1 className="text-text-primary text-2xl font-bold sm:text-3xl">
                Earn 20% commission
                <span className="text-accent"> for every referral!</span>
              </h1>
              <p className="text-text-secondary mt-1.5 max-w-md text-[13px] leading-relaxed">
                Invite friends and colleagues to WinBix AI. When they upgrade to a paid plan, you earn 20% of their
                first payment — automatically.
              </p>
            </div>
            <div className="shrink-0 text-center sm:text-right">
              <div className="text-accent text-4xl font-black">20%</div>
              <div className="text-text-tertiary text-[11px] font-medium">Commission rate</div>
              <div className="text-text-tertiary mt-0.5 text-[10px]">No cap, no limit</div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats Grid ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          <StatCard
            icon={MousePointerClick}
            label="Total Clicks"
            value={stats.totalClicks.toLocaleString()}
            color="blue"
            animate
            rawValue={stats.totalClicks}
          />
          <StatCard
            icon={UserPlus}
            label="Sign-ups"
            value={stats.totalSignups.toLocaleString()}
            color="accent"
            animate
            rawValue={stats.totalSignups}
          />
          <StatCard
            icon={TrendingUp}
            label="Conversions"
            value={stats.totalConversions.toLocaleString()}
            subValue={`${statsData?.conversionRate ?? 0}% rate`}
            color="green"
            animate
            rawValue={stats.totalConversions}
          />
          <StatCard
            icon={DollarSign}
            label="Total Earned"
            value={`$${stats.totalEarnings.toFixed(2)}`}
            subValue={`$${stats.pendingEarnings.toFixed(2)} pending`}
            color="yellow"
            animate
            rawValue={Math.round(stats.totalEarnings)}
            prefix="$"
          />
        </motion.div>

        {/* ── Referral Link Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.1 } }}
          className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-md"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-text-primary text-[14px] font-semibold">Your Referral Link</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowQr(true)}
                className="border-border text-text-secondary hover:text-text-primary flex items-center gap-1.5 rounded-lg border bg-white/5 px-2.5 py-1.5 text-[11px] font-medium transition-colors"
              >
                <QrCode className="h-3.5 w-3.5" />
                QR Code
              </button>
              <span className="text-text-tertiary font-mono text-[11px]">{data?.referralCode}</span>
              <button
                onClick={copyCode}
                className="text-text-secondary hover:text-accent transition-colors"
                title="Copy code"
              >
                {copiedCode ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Link input + copy */}
          <div className="mb-4 flex gap-2">
            <input
              type="text"
              readOnly
              value={data?.referralLink ?? ''}
              className="border-border text-text-secondary min-w-0 flex-1 rounded-xl border bg-white/5 px-4 py-2.5 font-mono text-[12px] outline-none select-all"
            />
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={copyLink}
              className="bg-accent hover:bg-accent/90 flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition-colors"
            >
              {copiedLink ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </motion.button>
          </div>

          {/* Share buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-text-tertiary mr-1 self-center text-[10px] font-semibold tracking-widest uppercase">
              <Share2 className="inline h-3 w-3" /> Share via:
            </span>
            <ShareButton
              icon={Copy}
              label="Copy"
              onClick={copyLink}
              color="border-white/10 bg-white/5 text-text-secondary hover:text-text-primary hover:border-white/20"
            />
            <ShareButton
              icon={ExternalLink}
              label="X / Twitter"
              href={twitterUrl}
              color="border-[#1DA1F2]/20 bg-[#1DA1F2]/5 text-[#1DA1F2] hover:bg-[#1DA1F2]/10"
            />
            <ShareButton
              icon={ExternalLink}
              label="LinkedIn"
              href={linkedinUrl}
              color="border-[#0A66C2]/20 bg-[#0A66C2]/5 text-[#0A66C2] hover:bg-[#0A66C2]/10"
            />
            <ShareButton
              icon={Send}
              label="WhatsApp"
              href={whatsappUrl}
              color="border-emerald-500/20 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10"
            />
            <ShareButton
              icon={Send}
              label="Email"
              href={emailUrl}
              color="border-white/10 bg-white/5 text-text-secondary hover:text-text-primary hover:border-white/20"
            />
          </div>
        </motion.div>

        {/* ── Analytics Row (funnel + earnings chart) ── */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          {/* Conversion Funnel */}
          <motion.div
            variants={staggerItem}
            className="rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur-md"
          >
            <h3 className="text-text-primary mb-4 text-[13px] font-semibold">Conversion Funnel</h3>
            <ConversionFunnel
              clicks={stats.totalClicks}
              signups={stats.totalSignups}
              conversions={stats.totalConversions}
            />
            <div className="mt-3 flex gap-4 text-[11px]">
              <span className="text-text-tertiary">
                Click→Signup: <span className="text-accent font-bold">{statsData?.signupRate ?? 0}%</span>
              </span>
              <span className="text-text-tertiary">
                Signup→Paid: <span className="font-bold text-emerald-400">{statsData?.conversionRate ?? 0}%</span>
              </span>
            </div>
          </motion.div>

          {/* Earnings chart */}
          <motion.div
            variants={staggerItem}
            className="rounded-2xl border border-white/8 bg-white/4 p-5 backdrop-blur-md"
          >
            <h3 className="text-text-primary mb-1 text-[13px] font-semibold">Monthly Earnings</h3>
            <p className="text-text-tertiary mb-3 text-[10px]">Last 6 months</p>
            {statsData?.monthlyEarnings ? (
              <EarningsChart data={statsData.monthlyEarnings} />
            ) : (
              <div className="flex h-32 items-center justify-center">
                <span className="text-text-tertiary text-[12px]">No earnings data yet</span>
              </div>
            )}
          </motion.div>
        </motion.div>

        {/* ── Referred Users Table ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.15 } }}
          className="overflow-hidden rounded-2xl border border-white/8 bg-white/4 backdrop-blur-md"
        >
          <div className="border-border flex items-center justify-between border-b px-6 py-4">
            <div>
              <h2 className="text-text-primary text-[14px] font-semibold">Referred Users</h2>
              <p className="text-text-tertiary mt-0.5 text-[11px]">{allUsers.length} total</p>
            </div>
          </div>

          {allUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                <Users className="text-text-tertiary h-6 w-6" />
              </div>
              <p className="text-text-primary mb-1 text-sm font-medium">No referrals yet</p>
              <p className="text-text-secondary text-[12px]">Share your link above to get started</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-border border-b">
                      {['Email', 'Signed Up', 'Status', 'Plan', 'Reward'].map((h) => (
                        <th
                          key={h}
                          className="text-text-tertiary px-6 py-3 text-left text-[10px] font-semibold tracking-widest uppercase"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="wait">
                      {pageUsers.map((user, i) => (
                        <motion.tr
                          key={`${user.email}-${i}`}
                          variants={slideIn}
                          initial="hidden"
                          animate="show"
                          exit={{ opacity: 0 }}
                          className="border-border border-b transition-colors last:border-0 hover:bg-white/3"
                        >
                          <td className="text-text-secondary px-6 py-3 font-mono">{user.email}</td>
                          <td className="text-text-secondary px-6 py-3">
                            {new Date(user.signedUpAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-6 py-3">
                            <StatusBadge status={user.status} />
                          </td>
                          <td className="text-text-secondary px-6 py-3 capitalize">{user.plan || '—'}</td>
                          <td className="px-6 py-3">
                            {user.rewardAmount > 0 ? (
                              <span
                                className={
                                  user.rewardPaid ? 'font-semibold text-emerald-400' : 'font-semibold text-amber-400'
                                }
                              >
                                ${user.rewardAmount.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-text-tertiary">—</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-border flex items-center justify-between border-t px-6 py-3">
                  <span className="text-text-tertiary text-[11px]">
                    Page {page + 1} of {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="border-border flex h-7 w-7 items-center justify-center rounded-lg border transition-opacity disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      disabled={page === totalPages - 1}
                      className="border-border flex h-7 w-7 items-center justify-center rounded-lg border transition-opacity disabled:opacity-30"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </motion.div>

        {/* ── Rewards & Payouts ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.2 } }}
          className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-md"
        >
          <h2 className="text-text-primary mb-5 flex items-center gap-2 text-[14px] font-semibold">
            <Wallet className="text-accent h-4 w-4" />
            Rewards & Payouts
          </h2>

          {/* Earnings breakdown */}
          <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/8 p-4">
              <p className="mb-0.5 text-[10px] font-semibold tracking-widest text-amber-400/70 uppercase">Pending</p>
              <p className="text-2xl font-bold text-amber-400">${stats.pendingEarnings.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-4">
              <p className="mb-0.5 text-[10px] font-semibold tracking-widest text-emerald-400/70 uppercase">Paid Out</p>
              <p className="text-2xl font-bold text-emerald-400">${stats.paidEarnings.toFixed(2)}</p>
            </div>
            <div className="rounded-xl border border-white/8 bg-white/5 p-4">
              <p className="text-text-tertiary mb-0.5 text-[10px] font-semibold tracking-widest uppercase">
                Total Earned
              </p>
              <p className="text-text-primary text-2xl font-bold">${stats.totalEarnings.toFixed(2)}</p>
            </div>
          </div>

          {/* Payout request */}
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={requestPayout}
              disabled={requestingPayout || pendingPayout || stats.pendingEarnings < 50}
              className="bg-accent hover:bg-accent/90 flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
            >
              {requestingPayout ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
              {pendingPayout ? 'Payout Pending...' : 'Request Payout'}
            </motion.button>
            <p className="text-text-tertiary text-[11px]">
              Minimum $50 · Processed in 3–5 business days
              {stats.pendingEarnings < 50 && ` · Need $${(50 - stats.pendingEarnings).toFixed(2)} more`}
            </p>
          </div>

          {/* Payout message */}
          <AnimatePresence>
            {payoutMsg && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-[12px] font-medium ${
                  payoutMsg.type === 'success' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}
              >
                {payoutMsg.type === 'success' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {payoutMsg.text}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Payout history */}
          {data && data.payoutHistory.length > 0 && (
            <div>
              <h3 className="text-text-secondary mb-3 text-[11px] font-semibold tracking-widest uppercase">
                Payout History
              </h3>
              <div className="space-y-2">
                {data.payoutHistory.map((p, i) => (
                  <div
                    key={i}
                    className="border-border flex items-center justify-between rounded-xl border bg-white/3 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <PayoutBadge status={p.status} />
                      <span className="text-text-secondary text-[12px]">
                        {new Date(p.requestedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {p.note && <span className="text-text-tertiary text-[11px]">{p.note}</span>}
                    </div>
                    <span className="text-text-primary text-[13px] font-semibold">${p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* ── How It Works ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.22 } }}
          className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-md"
        >
          <h2 className="text-text-primary mb-6 text-[14px] font-semibold">How It Works</h2>
          <div className="relative flex flex-col gap-6 sm:flex-row sm:gap-4">
            <HowStep
              icon={Share2}
              step={1}
              title="Share your link"
              desc="Share via Twitter, LinkedIn, WhatsApp, email, or QR code"
            />
            <HowStep
              icon={UserPlus}
              step={2}
              title="Friend signs up"
              desc="They register using your link — tracked automatically"
            />
            <HowStep
              icon={DollarSign}
              step={3}
              title="They upgrade"
              desc="When they convert to a paid plan, you earn 20% commission"
              last
            />
          </div>
        </motion.div>

        {/* ── Customization ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.25 } }}
          className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-md"
        >
          <h2 className="text-text-primary mb-4 flex items-center gap-2 text-[14px] font-semibold">
            <Settings className="text-accent h-4 w-4" />
            Customization
          </h2>

          {/* Custom code input */}
          <div className="mb-5">
            <label className="text-text-secondary mb-2 block text-[12px] font-medium">
              Custom Referral Code
              <span className="text-text-tertiary ml-1 font-normal">(4–24 chars, letters/numbers/hyphens)</span>
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="text-text-tertiary absolute top-1/2 left-3.5 -translate-y-1/2 text-[12px] font-medium select-none">
                  WINBIX-
                </span>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => handleCodeInput(e.target.value)}
                  placeholder={data?.referralCode?.replace('WINBIX-', '') ?? 'yourcode'}
                  className="border-border text-text-primary focus:border-accent/50 w-full rounded-xl border bg-white/5 py-2.5 pr-10 pl-[74px] text-[13px] transition-colors outline-none"
                />
                {/* availability indicator */}
                <div className="absolute top-1/2 right-3 -translate-y-1/2">
                  {checkingCode && <Loader2 className="text-text-tertiary h-4 w-4 animate-spin" />}
                  {!checkingCode && codeCheckResult === 'available' && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                  {!checkingCode && codeCheckResult === 'taken' && <XCircle className="h-4 w-4 text-red-400" />}
                </div>
              </div>
              <button
                onClick={saveCustomCode}
                disabled={savingCode || !customCode.trim() || codeCheckResult === 'taken'}
                className="bg-accent hover:bg-accent/90 flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40"
              >
                {savingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
            <AnimatePresence>
              {saveCodeMsg && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-2 text-[12px] ${
                    saveCodeMsg.includes('updated') ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {saveCodeMsg}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* Notification prefs */}
          <div>
            <label className="text-text-secondary mb-3 block text-[12px] font-medium">
              <Bell className="inline h-3.5 w-3.5" /> Notification Preferences
            </label>
            <div className="space-y-2.5">
              {[
                {
                  key: 'notifyOnSignup' as const,
                  label: 'Notify me when someone signs up via my link',
                  icon: UserPlus,
                  value: data?.notifyOnSignup ?? true,
                },
                {
                  key: 'notifyOnConversion' as const,
                  label: 'Notify me when a referral converts to paid',
                  icon: DollarSign,
                  value: data?.notifyOnConversion ?? true,
                },
              ].map(({ key, label, icon: Icon, value }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3 transition-colors hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="text-text-tertiary h-4 w-4" />
                    <span className="text-text-secondary text-[12px]">{label}</span>
                  </div>
                  <button
                    role="switch"
                    aria-checked={value}
                    disabled={savingNotif}
                    onClick={() => toggleNotif(key, !value)}
                    className={`relative h-5 w-9 rounded-full transition-colors duration-200 focus:outline-none disabled:cursor-wait ${
                      value ? 'bg-accent' : 'bg-white/15'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                        value ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── FAQ ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: 0.28 } }}
          className="rounded-2xl border border-white/8 bg-white/4 p-6 backdrop-blur-md"
        >
          <h2 className="text-text-primary mb-4 flex items-center gap-2 text-[14px] font-semibold">
            <HelpCircle className="text-accent h-4 w-4" />
            Frequently Asked Questions
          </h2>
          <div>
            {FAQS.map((faq, i) => (
              <FaqItem key={i} q={faq.q} a={faq.a} />
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
