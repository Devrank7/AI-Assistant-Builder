'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
  UserPlus,
  Crown,
  BarChart3,
  CheckCircle,
  XCircle,
  Search,
  Settings,
  Palette,
  Globe,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  RefreshCw,
  Wallet,
  Clock,
  Award,
  ArrowUpRight,
  Pause,
  Play,
  Filter,
  Download,
  MoreVertical,
  X,
  Check,
  Building2,
  Mail,
  CreditCard,
  Star,
  Zap,
  Shield,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubAccount {
  _id: string;
  accountId: string;
  companyName: string;
  email: string;
  plan: string;
  status: 'active' | 'suspended' | 'canceled';
  widgetCount: number;
  monthlyRevenue: number;
  createdAt: string;
}

interface PayoutEntry {
  _id?: string;
  amount: number;
  method: string;
  status: 'pending' | 'paid' | 'rejected';
  requestedAt: string;
  paidAt?: string;
}

interface ResellerAccount {
  _id: string;
  companyName: string;
  contactEmail: string;
  status: 'pending' | 'active' | 'suspended';
  tier: 'starter' | 'professional' | 'enterprise';
  commission: { percentage: number; minPayout: number };
  earnings: {
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
  };
  settings: {
    whiteLabel: boolean;
    customDomain?: string;
    brandName?: string;
    brandLogo?: string;
  };
  payoutHistory: PayoutEntry[];
  subAccounts: SubAccount[];
}

interface EarningsData {
  overview: {
    totalEarnings: number;
    pendingEarnings: number;
    paidEarnings: number;
    thisMonthEarnings: number;
    lastMonthEarnings: number;
  };
  commissionRate: number;
  minPayout: number;
  tier: string;
  monthly: Array<{ month: string; revenue: number; accounts: number }>;
  perAccount: Array<{
    accountId: string;
    companyName: string;
    email: string;
    plan: string;
    status: string;
    monthlyRevenue: number;
    commission: number;
  }>;
  payoutHistory: PayoutEntry[];
}

interface SubAccountsData {
  subAccounts: SubAccount[];
  stats: { total: number; active: number; suspended: number; totalMRR: number };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TABS = ['overview', 'accounts', 'earnings', 'settings', 'payouts'] as const;
type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  overview: 'Overview',
  accounts: 'Sub-Accounts',
  earnings: 'Earnings',
  settings: 'White-Label',
  payouts: 'Payouts',
};

const TIER_CONFIG = {
  starter: {
    label: 'Starter',
    commission: 15,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    icon: Star,
    features: ['Up to 10 sub-accounts', '15% commission', '$50 min payout', 'Basic white-label'],
  },
  professional: {
    label: 'Professional',
    commission: 20,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    icon: Zap,
    features: ['Up to 50 sub-accounts', '20% commission', '$100 min payout', 'Full white-label', 'Custom domain'],
  },
  enterprise: {
    label: 'Enterprise',
    commission: 25,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: Shield,
    features: ['Unlimited sub-accounts', '25% commission', '$200 min payout', 'Full white-label', 'Priority support'],
  },
};

const PLAN_COLORS: Record<string, string> = {
  starter: 'bg-blue-500/10 text-blue-400',
  professional: 'bg-purple-500/10 text-purple-400',
  enterprise: 'bg-amber-500/10 text-amber-400',
  basic: 'bg-gray-500/10 text-gray-400',
};

const STATUS_CONFIG = {
  active: { label: 'Active', cls: 'bg-green-500/10 text-green-400', icon: CheckCircle },
  suspended: { label: 'Suspended', cls: 'bg-red-500/10 text-red-400', icon: XCircle },
  canceled: { label: 'Canceled', cls: 'bg-gray-500/10 text-gray-400', icon: XCircle },
  pending: { label: 'Pending', cls: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
  paid: { label: 'Paid', cls: 'bg-green-500/10 text-green-400', icon: CheckCircle },
  rejected: { label: 'Rejected', cls: 'bg-red-500/10 text-red-400', icon: XCircle },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, opts);
  if (res.status === 401) {
    // Retry once on 401
    await new Promise((r) => setTimeout(r, 500));
    const retry = await fetch(url, opts);
    if (!retry.ok) throw new Error('Unauthorized');
    return retry.json().then((j) => j.data ?? j);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json().then((j) => j.data ?? j);
}

function fmt(n: number | undefined | null) {
  return (n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = display;
    const end = value;
    const dur = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(start + (end - start) * eased);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <span>${fmt(display)}</span>;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.95 }}
      className={`fixed right-5 bottom-5 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-2xl backdrop-blur ${
        type === 'success'
          ? 'border-green-500/20 bg-green-500/10 text-green-400'
          : 'border-red-500/20 bg-red-500/10 text-red-400'
      }`}
    >
      {type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">
        <X className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  icon: React.ElementType;
  color: string;
  sub?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium tracking-wide text-gray-500 uppercase">{label}</span>
        <div className={`rounded-xl p-2 ${color.replace('text-', 'bg-').replace('400', '500/10')}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-gray-600">{sub}</div>}
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResellerPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [account, setAccount] = useState<ResellerAccount | null>(null);
  const [subData, setSubData] = useState<SubAccountsData | null>(null);
  const [earningsData, setEarningsData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [subLoading, setSubLoading] = useState(false);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: number; msg: string; type: 'success' | 'error' }>>([]);
  const toastId = useRef(0);

  // Sub-accounts state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteForm, setInviteForm] = useState({ companyName: '', email: '', plan: 'starter' });
  const [inviting, setInviting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  // Settings state
  const [settingsForm, setSettingsForm] = useState({
    companyName: '',
    contactEmail: '',
    whiteLabel: false,
    customDomain: '',
    brandName: '',
    brandLogo: '',
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  // Payout state
  const [payoutMethod, setPayoutMethod] = useState('bank_transfer');
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [showPayoutConfirm, setShowPayoutConfirm] = useState(false);

  // ─── Toast helper ──────────────────────────────────────────────────────────

  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ─── Data fetchers ─────────────────────────────────────────────────────────

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<ResellerAccount>('/api/reseller');
      setAccount(data);
      setSettingsForm({
        companyName: data.companyName ?? '',
        contactEmail: data.contactEmail ?? '',
        whiteLabel: data.settings?.whiteLabel ?? false,
        customDomain: data.settings?.customDomain ?? '',
        brandName: data.settings?.brandName ?? '',
        brandLogo: data.settings?.brandLogo ?? '',
      });
      setLogoPreview(data.settings?.brandLogo ?? '');
    } catch (e) {
      toast((e as Error).message || 'Failed to load reseller data', 'error');
    }
    setLoading(false);
  }, [toast]);

  const fetchSubAccounts = useCallback(async () => {
    setSubLoading(true);
    try {
      const data = await apiFetch<SubAccountsData>('/api/reseller/sub-accounts');
      setSubData(data);
    } catch (e) {
      toast((e as Error).message || 'Failed to load sub-accounts', 'error');
    }
    setSubLoading(false);
  }, [toast]);

  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const data = await apiFetch<EarningsData>('/api/reseller/earnings');
      setEarningsData(data);
    } catch (e) {
      toast((e as Error).message || 'Failed to load earnings', 'error');
    }
    setEarningsLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  useEffect(() => {
    if (tab === 'accounts') fetchSubAccounts();
    if (tab === 'earnings' || tab === 'payouts') fetchEarnings();
  }, [tab, fetchSubAccounts, fetchEarnings]);

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleInvite = async () => {
    if (!inviteForm.companyName || !inviteForm.email) return;
    setInviting(true);
    try {
      await apiFetch('/api/reseller/sub-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      toast('Sub-account invited successfully');
      setShowInviteForm(false);
      setInviteForm({ companyName: '', email: '', plan: 'starter' });
      fetchSubAccounts();
      fetchAccount();
    } catch (e) {
      toast((e as Error).message || 'Failed to invite sub-account', 'error');
    }
    setInviting(false);
  };

  const handleToggleSubStatus = async (sub: SubAccount) => {
    const newStatus = sub.status === 'active' ? 'suspended' : 'active';
    const id = sub._id || sub.accountId;
    setActionLoading(id);
    setOpenMenu(null);
    try {
      await apiFetch(`/api/reseller/sub-accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      toast(`Sub-account ${newStatus === 'active' ? 'reactivated' : 'suspended'}`);
      fetchSubAccounts();
    } catch (e) {
      toast((e as Error).message || 'Action failed', 'error');
    }
    setActionLoading(null);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await apiFetch('/api/reseller', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: settingsForm.companyName,
          contactEmail: settingsForm.contactEmail,
          settings: {
            whiteLabel: settingsForm.whiteLabel,
            customDomain: settingsForm.customDomain,
            brandName: settingsForm.brandName,
            brandLogo: settingsForm.brandLogo,
          },
        }),
      });
      toast('Settings saved successfully');
      fetchAccount();
    } catch (e) {
      toast((e as Error).message || 'Failed to save settings', 'error');
    }
    setSavingSettings(false);
  };

  const handleRequestPayout = async () => {
    setRequestingPayout(true);
    setShowPayoutConfirm(false);
    try {
      const result = await apiFetch<{ amount: number }>('/api/reseller/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: payoutMethod }),
      });
      toast(`Payout of $${fmt(result.amount)} requested`);
      fetchEarnings();
      fetchAccount();
    } catch (e) {
      toast((e as Error).message || 'Payout request failed', 'error');
    }
    setRequestingPayout(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast('Logo must be under 512KB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target?.result as string;
      setLogoPreview(b64);
      setSettingsForm((f) => ({ ...f, brandLogo: b64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpgradeTier = async (tier: 'starter' | 'professional' | 'enterprise') => {
    try {
      await apiFetch('/api/reseller', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      });
      toast(`Upgraded to ${TIER_CONFIG[tier].label} tier`);
      fetchAccount();
    } catch (e) {
      toast((e as Error).message || 'Upgrade failed', 'error');
    }
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  const filteredAccounts = (subData?.subAccounts ?? []).filter((a) => {
    const matchSearch =
      a.companyName.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const currentTier = account?.tier ?? 'starter';
  const tierConf = TIER_CONFIG[currentTier];
  const TierIcon = tierConf.icon;
  const pendingEarnings = account?.earnings?.pendingEarnings ?? 0;
  const minPayout = account?.commission?.minPayout ?? 50;
  const canRequestPayout = pendingEarnings >= minPayout;

  // ─── Loading skeleton ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-blue-500/20 border-t-blue-500" />
            <Crown className="absolute inset-0 m-auto h-5 w-5 text-blue-400" />
          </div>
          <p className="text-sm text-gray-500">Loading Reseller Portal...</p>
        </div>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-4 md:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/[0.06] bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <Crown className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Reseller Portal</h1>
              <p className="text-xs text-gray-500">Manage clients, track earnings, build your business</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
                account?.status === 'active'
                  ? 'border-green-500/20 bg-green-500/10 text-green-400'
                  : account?.status === 'pending'
                    ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400'
                    : 'border-red-500/20 bg-red-500/10 text-red-400'
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${account?.status === 'active' ? 'bg-green-400' : account?.status === 'pending' ? 'bg-yellow-400' : 'bg-red-400'} animate-pulse`}
              />
              {account?.status === 'active'
                ? 'Active'
                : account?.status === 'pending'
                  ? 'Pending Approval'
                  : 'Suspended'}
            </span>
            {/* Tier badge */}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${tierConf.bg}`}
            >
              <TierIcon className={`h-3 w-3 ${tierConf.color}`} />
              <span className={tierConf.color}>{tierConf.label}</span>
            </span>
            <button
              onClick={() => {
                fetchAccount();
                fetchSubAccounts();
              }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-2 text-gray-400 transition hover:text-white"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-shrink-0 rounded-xl px-4 py-2 text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-blue-500/20 text-blue-400 shadow-sm'
                  : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-300'
              }`}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {/* ══ OVERVIEW TAB ══════════════════════════════════════════════════════ */}
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              {/* Top stats */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Total Earnings"
                  value={<AnimatedNumber value={account?.earnings?.totalEarnings ?? 0} />}
                  icon={DollarSign}
                  color="text-green-400"
                  sub={`${tierConf.commission}% commission`}
                  delay={0}
                />
                <StatCard
                  label="This Month"
                  value={<AnimatedNumber value={account?.earnings?.thisMonthEarnings ?? 0} />}
                  icon={TrendingUp}
                  color="text-blue-400"
                  sub="Current earnings"
                  delay={0.05}
                />
                <StatCard
                  label="Pending Payout"
                  value={<AnimatedNumber value={account?.earnings?.pendingEarnings ?? 0} />}
                  icon={Wallet}
                  color="text-amber-400"
                  sub={`Min: $${minPayout}`}
                  delay={0.1}
                />
                <StatCard
                  label="Sub-Accounts"
                  value={
                    <span className="text-2xl font-bold text-purple-400">
                      {subData?.stats?.total ?? account?.subAccounts?.length ?? 0}
                    </span>
                  }
                  icon={Users}
                  color="text-purple-400"
                  sub={`${subData?.stats?.active ?? 0} active`}
                  delay={0.15}
                />
              </div>

              {/* MRR + Commission rate */}
              <div className="grid gap-4 sm:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-semibold text-white">Earnings Trend</span>
                    </div>
                    <span className="text-xs text-gray-500">Last 6 months</span>
                  </div>
                  <MiniEarningsChart account={account} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                >
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Commission</span>
                  </div>
                  <div className="text-4xl font-bold text-amber-400">{account?.commission?.percentage ?? 15}%</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Total MRR</span>
                      <span className="font-medium text-white">${fmt(subData?.stats?.totalMRR)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Monthly Commission</span>
                      <span className="font-medium text-green-400">
                        ${fmt((subData?.stats?.totalMRR ?? 0) * ((account?.commission?.percentage ?? 15) / 100))}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Paid Out</span>
                      <span className="font-medium text-gray-300">${fmt(account?.earnings?.paidEarnings)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setTab('payouts')}
                    disabled={!canRequestPayout}
                    className="w-full rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {canRequestPayout ? 'Request Payout' : `Need $${fmt(minPayout - pendingEarnings)} more`}
                  </button>
                </motion.div>
              </div>

              {/* Quick actions & tier */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Recent sub-accounts */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-semibold text-white">Recent Accounts</span>
                    </div>
                    <button
                      onClick={() => setTab('accounts')}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      View all <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                  {(account?.subAccounts?.length ?? 0) === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-600">
                      No sub-accounts yet.{' '}
                      <button onClick={() => setTab('accounts')} className="text-blue-400 hover:underline">
                        Invite one
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(account?.subAccounts ?? []).slice(0, 4).map((sub) => (
                        <div
                          key={sub.accountId || sub._id}
                          className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{sub.companyName || sub.email}</div>
                            <div className="text-xs text-gray-500">{sub.plan}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-green-400">${fmt(sub.monthlyRevenue)}</div>
                            <StatusBadge status={sub.status} size="xs" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Tier info */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                >
                  <div className="mb-4 flex items-center gap-2">
                    <TierIcon className={`h-4 w-4 ${tierConf.color}`} />
                    <span className="text-sm font-semibold text-white">Your Tier: {tierConf.label}</span>
                  </div>
                  <ul className="mb-4 space-y-2">
                    {tierConf.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-gray-400">
                        <CheckCircle className={`h-3.5 w-3.5 ${tierConf.color} shrink-0`} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {currentTier !== 'enterprise' && (
                    <button
                      onClick={() => setTab('earnings')}
                      className={`w-full rounded-xl border px-3 py-2 text-xs font-medium transition ${tierConf.bg} ${tierConf.color} hover:opacity-80`}
                    >
                      View Upgrade Options
                    </button>
                  )}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ══ ACCOUNTS TAB ════════════════════════════════════════════════════ */}
          {tab === 'accounts' && (
            <motion.div
              key="accounts"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              {/* Stats bar */}
              {subData && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Total', value: subData.stats.total, color: 'text-white' },
                    { label: 'Active', value: subData.stats.active, color: 'text-green-400' },
                    { label: 'Suspended', value: subData.stats.suspended, color: 'text-red-400' },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-center"
                    >
                      <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-xs text-gray-500">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Controls */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search accounts..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-4 pl-10 text-sm text-white transition outline-none placeholder:text-gray-600 focus:border-blue-500/50"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Status filter */}
                <div className="relative">
                  <Filter className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-8 pl-9 text-sm text-gray-300 outline-none focus:border-blue-500/50"
                  >
                    <option value="all" className="bg-[#0a0a0f]">
                      All Status
                    </option>
                    <option value="active" className="bg-[#0a0a0f]">
                      Active
                    </option>
                    <option value="suspended" className="bg-[#0a0a0f]">
                      Suspended
                    </option>
                    <option value="canceled" className="bg-[#0a0a0f]">
                      Canceled
                    </option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-gray-500" />
                </div>

                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/20 px-4 py-2.5 text-sm font-medium whitespace-nowrap text-blue-400 transition hover:bg-blue-500/30"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite Sub-Account
                </button>
              </div>

              {/* Invite form */}
              <AnimatePresence>
                {showInviteForm && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 p-5">
                      <div className="flex items-center justify-between">
                        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                          <UserPlus className="h-4 w-4 text-blue-400" />
                          Invite New Sub-Account
                        </h3>
                        <button onClick={() => setShowInviteForm(false)} className="text-gray-500 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-gray-400">Company Name *</label>
                          <div className="relative">
                            <Building2 className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                            <input
                              value={inviteForm.companyName}
                              onChange={(e) => setInviteForm((f) => ({ ...f, companyName: e.target.value }))}
                              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-3 pl-9 text-sm text-white transition outline-none focus:border-blue-500/50"
                              placeholder="Acme Corp"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-gray-400">Email Address *</label>
                          <div className="relative">
                            <Mail className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                            <input
                              value={inviteForm.email}
                              onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))}
                              type="email"
                              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-3 pl-9 text-sm text-white transition outline-none focus:border-blue-500/50"
                              placeholder="admin@acme.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-gray-400">Plan</label>
                          <div className="relative">
                            <CreditCard className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                            <select
                              value={inviteForm.plan}
                              onChange={(e) => setInviteForm((f) => ({ ...f, plan: e.target.value }))}
                              className="w-full appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-8 pl-9 text-sm text-white outline-none focus:border-blue-500/50"
                            >
                              <option value="starter" className="bg-[#0a0a0f]">
                                Starter — $29/mo
                              </option>
                              <option value="professional" className="bg-[#0a0a0f]">
                                Professional — $79/mo
                              </option>
                              <option value="enterprise" className="bg-[#0a0a0f]">
                                Enterprise — $199/mo
                              </option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-gray-500" />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleInvite}
                          disabled={inviting || !inviteForm.companyName || !inviteForm.email}
                          className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition hover:bg-blue-500/30 disabled:opacity-50"
                        >
                          {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                          {inviting ? 'Sending Invite...' : 'Send Invite'}
                        </button>
                        <button
                          onClick={() => setShowInviteForm(false)}
                          className="rounded-xl bg-white/[0.03] px-4 py-2 text-sm text-gray-400 transition hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Table */}
              <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur">
                {subLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-[11px] tracking-wide text-gray-600 uppercase">
                          <th className="px-5 py-3.5 font-medium">Company</th>
                          <th className="hidden px-5 py-3.5 font-medium sm:table-cell">Email</th>
                          <th className="px-5 py-3.5 font-medium">Plan</th>
                          <th className="px-5 py-3.5 font-medium">Status</th>
                          <th className="hidden px-5 py-3.5 font-medium md:table-cell">Widgets</th>
                          <th className="px-5 py-3.5 font-medium">MRR</th>
                          <th className="hidden px-5 py-3.5 font-medium lg:table-cell">Created</th>
                          <th className="px-5 py-3.5 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {filteredAccounts.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-16 text-center text-sm text-gray-600">
                              {(subData?.subAccounts?.length ?? 0) === 0 ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Users className="h-8 w-8 text-gray-700" />
                                  <p>No sub-accounts yet</p>
                                  <button
                                    onClick={() => setShowInviteForm(true)}
                                    className="text-xs text-blue-400 hover:underline"
                                  >
                                    Invite your first client
                                  </button>
                                </div>
                              ) : (
                                'No accounts match your filters'
                              )}
                            </td>
                          </tr>
                        ) : (
                          filteredAccounts.map((account, index) => {
                            const id = account._id || account.accountId;
                            return (
                              <motion.tr
                                key={id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.025 }}
                                className="group transition-colors hover:bg-white/[0.02]"
                              >
                                <td className="px-5 py-3.5">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-xs font-bold text-blue-400">
                                      {(account.companyName || account.email)[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium text-white">{account.companyName || '—'}</div>
                                      <div className="text-xs text-gray-600 sm:hidden">{account.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="hidden px-5 py-3.5 sm:table-cell">
                                  <span className="text-sm text-gray-400">{account.email}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PLAN_COLORS[account.plan] ?? PLAN_COLORS.basic}`}
                                  >
                                    {account.plan}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <StatusBadge status={account.status} />
                                </td>
                                <td className="hidden px-5 py-3.5 md:table-cell">
                                  <span className="text-sm text-gray-300">{account.widgetCount ?? 0}</span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <span className="text-sm font-semibold text-green-400">
                                    ${fmt(account.monthlyRevenue)}
                                  </span>
                                </td>
                                <td className="hidden px-5 py-3.5 lg:table-cell">
                                  <span className="text-xs text-gray-500">
                                    {account.createdAt
                                      ? new Date(account.createdAt).toLocaleDateString('en-US', {
                                          month: 'short',
                                          day: 'numeric',
                                          year: 'numeric',
                                        })
                                      : '—'}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5">
                                  <div className="relative">
                                    <button
                                      onClick={() => setOpenMenu(openMenu === id ? null : id)}
                                      className="rounded-lg p-1.5 text-gray-500 transition hover:bg-white/[0.05] hover:text-white"
                                    >
                                      {actionLoading === id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <MoreVertical className="h-4 w-4" />
                                      )}
                                    </button>
                                    <AnimatePresence>
                                      {openMenu === id && (
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                                          className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111118] shadow-2xl"
                                        >
                                          <button
                                            onClick={() => handleToggleSubStatus(account)}
                                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm transition hover:bg-white/[0.05]"
                                          >
                                            {account.status === 'active' ? (
                                              <>
                                                <Pause className="h-3.5 w-3.5 text-red-400" />
                                                <span className="text-red-400">Suspend</span>
                                              </>
                                            ) : (
                                              <>
                                                <Play className="h-3.5 w-3.5 text-green-400" />
                                                <span className="text-green-400">Reactivate</span>
                                              </>
                                            )}
                                          </button>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Summary row */}
              {filteredAccounts.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-5 py-3 text-xs text-gray-500">
                  <span>
                    Showing {filteredAccounts.length} of {subData?.subAccounts?.length ?? 0} accounts
                  </span>
                  <span>
                    Total MRR:{' '}
                    <span className="font-semibold text-green-400">
                      ${fmt(filteredAccounts.reduce((s, a) => s + (a.monthlyRevenue ?? 0), 0))}
                    </span>
                  </span>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ EARNINGS TAB ════════════════════════════════════════════════════ */}
          {tab === 'earnings' && (
            <motion.div
              key="earnings"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              {earningsLoading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                </div>
              ) : earningsData ? (
                <>
                  {/* Overview cards */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      {
                        label: 'Total Lifetime',
                        value: earningsData.overview.totalEarnings,
                        color: 'text-green-400',
                        icon: DollarSign,
                      },
                      {
                        label: 'This Month',
                        value: earningsData.overview.thisMonthEarnings,
                        color: 'text-blue-400',
                        icon: TrendingUp,
                      },
                      {
                        label: 'Last Month',
                        value: earningsData.overview.lastMonthEarnings,
                        color: 'text-gray-300',
                        icon: TrendingDown,
                      },
                      {
                        label: 'Pending',
                        value: earningsData.overview.pendingEarnings,
                        color: 'text-amber-400',
                        icon: Clock,
                      },
                      {
                        label: 'Paid Out',
                        value: earningsData.overview.paidEarnings,
                        color: 'text-emerald-400',
                        icon: CheckCircle,
                      },
                    ].map((s, i) => (
                      <motion.div
                        key={s.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">{s.label}</span>
                          <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
                        </div>
                        <div className={`text-xl font-bold ${s.color}`}>
                          <AnimatedNumber value={s.value} />
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Monthly chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-blue-400" />
                        <span className="text-sm font-semibold text-white">Monthly Earnings (Last 6 Months)</span>
                      </div>
                      <span className="text-xs text-gray-500">{earningsData.commissionRate}% commission rate</span>
                    </div>
                    {earningsData.monthly.every((m) => m.revenue === 0) ? (
                      <div className="py-12 text-center text-sm text-gray-600">
                        No earnings data yet for this period
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {earningsData.monthly.map((month, index) => {
                          const maxRevenue = Math.max(...earningsData.monthly.map((m) => m.revenue), 1);
                          const width = (month.revenue / maxRevenue) * 100;
                          return (
                            <motion.div
                              key={month.month}
                              initial={{ opacity: 0, x: -16 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.35 + index * 0.05 }}
                              className="flex items-center gap-3"
                            >
                              <span className="w-16 shrink-0 text-right text-xs text-gray-500">{month.month}</span>
                              <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-white/[0.03]">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${width}%` }}
                                  transition={{ duration: 0.6, delay: 0.4 + index * 0.05 }}
                                  className="h-full rounded-lg bg-gradient-to-r from-blue-600/50 to-blue-400/30"
                                />
                                {month.revenue > 0 && (
                                  <span className="absolute inset-0 flex items-center pl-2 text-xs font-medium text-blue-300">
                                    ${fmt(month.revenue)}
                                  </span>
                                )}
                              </div>
                              <div className="w-20 shrink-0 text-right">
                                <span className="text-xs text-gray-500">{month.accounts} accts</span>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>

                  {/* Per-account breakdown */}
                  {earningsData.perAccount.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.45 }}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                    >
                      <div className="mb-4 flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-400" />
                        <span className="text-sm font-semibold text-white">Earnings by Account</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-white/[0.05] text-[11px] tracking-wide text-gray-600 uppercase">
                              <th className="pb-3 font-medium">Account</th>
                              <th className="hidden pb-3 font-medium sm:table-cell">Plan</th>
                              <th className="pb-3 font-medium">MRR</th>
                              <th className="pb-3 text-right font-medium">Your Cut</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.03]">
                            {earningsData.perAccount.map((a) => (
                              <tr key={a.accountId} className="transition-colors hover:bg-white/[0.02]">
                                <td className="py-3 pr-4">
                                  <div className="text-sm font-medium text-white">{a.companyName}</div>
                                  <div className="text-xs text-gray-500">{a.email}</div>
                                </td>
                                <td className="hidden py-3 pr-4 sm:table-cell">
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs capitalize ${PLAN_COLORS[a.plan] ?? PLAN_COLORS.basic}`}
                                  >
                                    {a.plan}
                                  </span>
                                </td>
                                <td className="py-3 pr-4">
                                  <span className="text-sm text-white">${fmt(a.monthlyRevenue)}</span>
                                </td>
                                <td className="py-3 text-right">
                                  <span className="text-sm font-semibold text-green-400">${fmt(a.commission)}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  )}

                  {/* Tier comparison */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                  >
                    <div className="mb-5 flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-semibold text-white">Commission Tiers</span>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-3">
                      {(Object.entries(TIER_CONFIG) as [string, typeof TIER_CONFIG.starter][]).map(([key, conf]) => {
                        const Icon = conf.icon;
                        const isCurrent = key === currentTier;
                        return (
                          <div
                            key={key}
                            className={`rounded-xl border p-4 transition ${
                              isCurrent
                                ? `${conf.bg} ring-1 ring-white/10 ring-inset`
                                : 'border-white/[0.06] bg-white/[0.02]'
                            }`}
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Icon className={`h-4 w-4 ${conf.color}`} />
                                <span className={`text-sm font-semibold ${conf.color}`}>{conf.label}</span>
                              </div>
                              {isCurrent && (
                                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white">
                                  Current
                                </span>
                              )}
                            </div>
                            <div className={`mb-3 text-3xl font-bold ${conf.color}`}>{conf.commission}%</div>
                            <ul className="mb-4 space-y-1.5">
                              {conf.features.map((f) => (
                                <li key={f} className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <CheckCircle className={`h-3 w-3 shrink-0 ${conf.color}`} />
                                  {f}
                                </li>
                              ))}
                            </ul>
                            {!isCurrent && key !== 'starter' && (
                              <button
                                onClick={() => handleUpgradeTier(key as 'professional' | 'enterprise')}
                                className={`w-full rounded-lg border px-3 py-1.5 text-xs font-medium transition ${conf.bg} ${conf.color} hover:opacity-80`}
                              >
                                Upgrade
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-24 text-gray-500">
                  <BarChart3 className="h-10 w-10 text-gray-700" />
                  <p className="text-sm">No earnings data available</p>
                  <button onClick={fetchEarnings} className="text-xs text-blue-400 hover:underline">
                    Retry
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {/* ══ SETTINGS TAB ════════════════════════════════════════════════════ */}
          {tab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="max-w-2xl space-y-5"
            >
              {/* Business info */}
              <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Business Info</h3>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Company Name</label>
                    <input
                      value={settingsForm.companyName}
                      onChange={(e) => setSettingsForm((f) => ({ ...f, companyName: e.target.value }))}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition outline-none focus:border-blue-500/50"
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Contact Email</label>
                    <input
                      value={settingsForm.contactEmail}
                      onChange={(e) => setSettingsForm((f) => ({ ...f, contactEmail: e.target.value }))}
                      type="email"
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition outline-none focus:border-blue-500/50"
                      placeholder="contact@yourcompany.com"
                    />
                  </div>
                </div>
              </div>

              {/* White-label */}
              <div className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-white">White-Label Branding</h3>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => setSettingsForm((f) => ({ ...f, whiteLabel: !f.whiteLabel }))}
                    className={`relative h-6 w-11 rounded-full transition-colors ${settingsForm.whiteLabel ? 'bg-purple-500' : 'bg-white/[0.08]'}`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${settingsForm.whiteLabel ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
                <p className="text-xs text-gray-500">
                  Enable white-label to brand the platform with your company identity
                </p>

                <AnimatePresence>
                  {settingsForm.whiteLabel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-400">Brand Name</label>
                        <input
                          value={settingsForm.brandName}
                          onChange={(e) => setSettingsForm((f) => ({ ...f, brandName: e.target.value }))}
                          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition outline-none focus:border-purple-500/50"
                          placeholder="Your Brand Name"
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-400">
                          <Globe className="mr-1 inline h-3 w-3 text-gray-500" />
                          Custom Domain
                        </label>
                        <input
                          value={settingsForm.customDomain}
                          onChange={(e) => setSettingsForm((f) => ({ ...f, customDomain: e.target.value }))}
                          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5 text-sm text-white transition outline-none focus:border-purple-500/50"
                          placeholder="app.yourdomain.com"
                        />
                        <p className="mt-1 text-[11px] text-gray-600">
                          Point your CNAME to our servers and enter it here
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-gray-400">
                          <ImageIcon className="mr-1 inline h-3 w-3 text-gray-500" />
                          Brand Logo
                        </label>
                        <div className="flex items-center gap-4">
                          {logoPreview && (
                            <div className="h-12 w-12 overflow-hidden rounded-xl border border-white/[0.06] bg-white/[0.03]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={logoPreview} alt="Logo preview" className="h-full w-full object-contain" />
                            </div>
                          )}
                          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2 text-xs text-gray-400 transition hover:bg-white/[0.05] hover:text-white">
                            <ImageIcon className="h-3.5 w-3.5" />
                            {logoPreview ? 'Change Logo' : 'Upload Logo'}
                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                          </label>
                          {logoPreview && (
                            <button
                              onClick={() => {
                                setLogoPreview('');
                                setSettingsForm((f) => ({ ...f, brandLogo: '' }));
                              }}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-gray-600">Max 512KB. PNG or SVG recommended.</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Save */}
              <div className="flex gap-3">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/20 px-5 py-2.5 text-sm font-medium text-blue-400 transition hover:bg-blue-500/30 disabled:opacity-50"
                >
                  {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  {savingSettings ? 'Saving...' : 'Save Settings'}
                </button>
                <button
                  onClick={() => {
                    if (!account) return;
                    setSettingsForm({
                      companyName: account.companyName ?? '',
                      contactEmail: account.contactEmail ?? '',
                      whiteLabel: account.settings?.whiteLabel ?? false,
                      customDomain: account.settings?.customDomain ?? '',
                      brandName: account.settings?.brandName ?? '',
                      brandLogo: account.settings?.brandLogo ?? '',
                    });
                    setLogoPreview(account.settings?.brandLogo ?? '');
                  }}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-5 py-2.5 text-sm text-gray-400 transition hover:text-white"
                >
                  Discard
                </button>
              </div>
            </motion.div>
          )}

          {/* ══ PAYOUTS TAB ═════════════════════════════════════════════════════ */}
          {tab === 'payouts' && (
            <motion.div
              key="payouts"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-5"
            >
              {/* Payout request card */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                <div className="mb-4 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-amber-400" />
                  <h3 className="text-sm font-semibold text-white">Request Payout</h3>
                </div>

                <div className="mb-5 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <div className="mb-1 text-xs text-gray-500">Available Balance</div>
                    <div className="text-2xl font-bold text-amber-400">${fmt(pendingEarnings)}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <div className="mb-1 text-xs text-gray-500">Minimum Payout</div>
                    <div className="text-2xl font-bold text-white">${fmt(minPayout)}</div>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                    <div className="mb-1 text-xs text-gray-500">Total Paid Out</div>
                    <div className="text-2xl font-bold text-emerald-400">${fmt(account?.earnings?.paidEarnings)}</div>
                  </div>
                </div>

                {!canRequestPayout && (
                  <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
                    <p className="text-xs text-amber-300">
                      You need <span className="font-semibold">${fmt(minPayout - pendingEarnings)}</span> more to reach
                      the minimum payout threshold.
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <label className="mb-1.5 block text-xs font-medium text-gray-400">Payout Method</label>
                    <div className="relative">
                      <CreditCard className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
                      <select
                        value={payoutMethod}
                        onChange={(e) => setPayoutMethod(e.target.value)}
                        className="w-full appearance-none rounded-xl border border-white/[0.06] bg-white/[0.03] py-2.5 pr-8 pl-9 text-sm text-gray-300 outline-none focus:border-amber-500/50"
                      >
                        <option value="bank_transfer" className="bg-[#0a0a0f]">
                          Bank Transfer (ACH/Wire)
                        </option>
                        <option value="paypal" className="bg-[#0a0a0f]">
                          PayPal
                        </option>
                        <option value="stripe" className="bg-[#0a0a0f]">
                          Stripe Connect
                        </option>
                        <option value="crypto" className="bg-[#0a0a0f]">
                          Cryptocurrency (USDT/BTC)
                        </option>
                      </select>
                      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 h-3 w-3 -translate-y-1/2 text-gray-500" />
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPayoutConfirm(true)}
                    disabled={!canRequestPayout || requestingPayout}
                    className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/20 px-5 py-2.5 text-sm font-medium text-amber-400 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {requestingPayout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Request ${fmt(pendingEarnings)}
                  </button>
                </div>

                {/* Confirm dialog */}
                <AnimatePresence>
                  {showPayoutConfirm && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
                    >
                      <p className="mb-3 text-sm text-white">
                        Confirm payout of <span className="font-bold text-amber-400">${fmt(pendingEarnings)}</span> via{' '}
                        <span className="font-semibold">{payoutMethod.replace('_', ' ')}</span>?
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleRequestPayout}
                          className="flex items-center gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/20 px-4 py-1.5 text-xs font-medium text-amber-400 transition hover:bg-amber-500/30"
                        >
                          <Check className="h-3.5 w-3.5" /> Confirm
                        </button>
                        <button
                          onClick={() => setShowPayoutConfirm(false)}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-xs text-gray-400 transition hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Payout history */}
              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                <div className="mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-white">Payout History</h3>
                </div>
                {earningsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
                  </div>
                ) : (earningsData?.payoutHistory?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-12 text-gray-600">
                    <Wallet className="h-8 w-8 text-gray-700" />
                    <p className="text-sm">No payouts yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-[11px] tracking-wide text-gray-600 uppercase">
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Amount</th>
                          <th className="pb-3 font-medium">Method</th>
                          <th className="pb-3 font-medium">Status</th>
                          <th className="hidden pb-3 font-medium sm:table-cell">Paid On</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {(earningsData?.payoutHistory ?? []).map((payout, i) => (
                          <motion.tr
                            key={payout._id ?? i}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="transition-colors hover:bg-white/[0.02]"
                          >
                            <td className="py-3 pr-4 text-sm text-gray-300">
                              {new Date(payout.requestedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-sm font-semibold text-white">${fmt(payout.amount)}</span>
                            </td>
                            <td className="py-3 pr-4">
                              <span className="text-sm text-gray-400 capitalize">
                                {(payout.method ?? '').replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              <StatusBadge status={payout.status} />
                            </td>
                            <td className="hidden py-3 sm:table-cell">
                              <span className="text-xs text-gray-500">
                                {payout.paidAt
                                  ? new Date(payout.paidAt).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })
                                  : '—'}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Click outside to close menus */}
      {openMenu && <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} />}

      {/* Toasts */}
      <AnimatePresence>
        {toasts.map((t) => (
          <Toast key={t.id} message={t.msg} type={t.type} onClose={() => removeToast(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Mini Earnings Chart (sparkline overview) ─────────────────────────────────

function MiniEarningsChart({ account }: { account: ResellerAccount | null }) {
  const thisMonth = account?.earnings?.thisMonthEarnings ?? 0;
  const lastMonth = account?.earnings?.lastMonthEarnings ?? 0;

  const now = new Date();
  const data = [0, 0, 0, 0, lastMonth, thisMonth].map((v, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      month: d.toLocaleString('en-US', { month: 'short' }),
      value: v,
    };
  });

  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.month} className="flex items-center gap-3">
          <span className="w-8 shrink-0 text-right text-[11px] text-gray-600">{d.month}</span>
          <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-white/[0.03]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(d.value / max) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.06 }}
              className={`h-full rounded-md ${i === data.length - 1 ? 'bg-gradient-to-r from-blue-500/60 to-blue-400/30' : 'bg-white/[0.06]'}`}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs font-medium text-white">${fmt(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status, size = 'sm' }: { status: string; size?: 'xs' | 'sm' }) {
  const conf = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] ?? {
    label: status,
    cls: 'bg-gray-500/10 text-gray-400',
    icon: AlertCircle,
  };
  const Icon = conf.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium capitalize ${conf.cls} ${size === 'xs' ? 'text-[10px]' : 'text-xs'}`}
    >
      <Icon className={size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      {conf.label}
    </span>
  );
}
