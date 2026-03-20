'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Trash2,
  Loader2,
  UserPlus,
  Crown,
  BarChart3,
  CheckCircle,
  XCircle,
  Search,
  Calendar,
} from 'lucide-react';

interface SubAccount {
  _id: string;
  name: string;
  email: string;
  plan: string;
  status: 'active' | 'suspended' | 'pending';
  createdAt: string;
  monthlyRevenue: number;
}

interface ResellerData {
  totalSubAccounts: number;
  monthlyEarnings: number;
  activeAccounts: number;
  subAccounts: SubAccount[];
}

interface EarningsData {
  monthly: Array<{
    month: string;
    revenue: number;
    accounts: number;
  }>;
  totalLifetime: number;
  currentMonth: number;
  pendingPayout: number;
}

export default function ResellerPage() {
  const [data, setData] = useState<ResellerData | null>(null);
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState<'accounts' | 'earnings'>('accounts');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPlan, setFormPlan] = useState('starter');

  const PLANS = [
    { value: 'starter', label: 'Starter', price: '$29/mo' },
    { value: 'professional', label: 'Professional', price: '$79/mo' },
    { value: 'enterprise', label: 'Enterprise', price: '$199/mo' },
  ];

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/reseller');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load reseller data');
      }
    } catch {
      setError('Failed to load reseller data');
    }
    setLoading(false);
  }, []);

  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true);
    try {
      const res = await fetch('/api/reseller/earnings');
      const json = await res.json();
      if (json.success) setEarnings(json.data);
    } catch {
      /* empty */
    }
    setEarningsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (tab === 'earnings') fetchEarnings();
  }, [tab, fetchEarnings]);

  const handleCreate = async () => {
    if (!formName || !formEmail) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/reseller/sub-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, email: formEmail, plan: formPlan }),
      });
      const json = await res.json();
      if (json.success) {
        setFormName('');
        setFormEmail('');
        setFormPlan('starter');
        setShowCreate(false);
        setSuccess('Sub-account created successfully');
        setTimeout(() => setSuccess(''), 3000);
        fetchData();
      } else {
        setError(json.error || 'Failed to create sub-account');
      }
    } catch {
      setError('Failed to create sub-account');
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sub-account?')) return;
    setDeleting(id);
    setError('');
    try {
      const res = await fetch(`/api/reseller/sub-accounts/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setSuccess('Sub-account deleted');
        setTimeout(() => setSuccess(''), 3000);
        fetchData();
      } else {
        setError(json.error || 'Failed to delete');
      }
    } catch {
      setError('Failed to delete sub-account');
    }
    setDeleting(null);
  };

  const filteredAccounts =
    data?.subAccounts.filter(
      (a) => a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
    ) || [];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-1 flex items-center gap-3">
            <Crown className="h-6 w-6 text-blue-400" />
            <h1 className="text-2xl font-bold text-white">Reseller Portal</h1>
          </div>
          <p className="text-sm text-gray-400">Manage sub-accounts and track your reseller earnings</p>
        </motion.div>

        {/* Stats */}
        {data && (
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                label: 'Total Sub-Accounts',
                value: String(data.totalSubAccounts),
                icon: Users,
                color: 'text-blue-400',
              },
              {
                label: 'Monthly Earnings',
                value: `$${data.monthlyEarnings.toFixed(2)}`,
                icon: DollarSign,
                color: 'text-green-400',
              },
              {
                label: 'Active Accounts',
                value: String(data.activeAccounts),
                icon: CheckCircle,
                color: 'text-emerald-400',
              },
            ].map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-gray-400">{stat.label}</span>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="text-3xl font-bold text-white">{stat.value}</div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Messages */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-400"
          >
            {success}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-2">
          {(['accounts', 'earnings'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                tab === t ? 'bg-blue-500/20 text-blue-400' : 'bg-white/[0.03] text-gray-400 hover:bg-white/[0.06]'
              }`}
            >
              {t === 'accounts' ? 'Sub-Accounts' : 'Earnings'}
            </button>
          ))}
        </div>

        {/* Accounts Tab */}
        {tab === 'accounts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {/* Actions Bar */}
            <div className="flex items-center gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] py-2 pr-4 pl-10 text-sm text-white outline-none placeholder:text-gray-500 focus:border-blue-500/50"
                />
              </div>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
              >
                <UserPlus className="h-4 w-4" />
                Create Sub-Account
              </button>
            </div>

            {/* Create Form */}
            {showCreate && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
              >
                <h3 className="flex items-center gap-2 font-semibold text-white">
                  <UserPlus className="h-4 w-4 text-blue-400" /> New Sub-Account
                </h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Name</label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                      placeholder="Client Name"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Email</label>
                    <input
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      type="email"
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-blue-500/50"
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">Plan</label>
                    <select
                      value={formPlan}
                      onChange={(e) => setFormPlan(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-white outline-none"
                    >
                      {PLANS.map((p) => (
                        <option key={p.value} value={p.value} className="bg-[#0a0a0f]">
                          {p.label} - {p.price}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={creating || !formName || !formEmail}
                    className="flex items-center gap-2 rounded-xl bg-blue-500/20 px-4 py-2 text-sm font-medium text-blue-400 transition-colors hover:bg-blue-500/30 disabled:opacity-50"
                  >
                    {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    {creating ? 'Creating...' : 'Create'}
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="rounded-xl bg-white/[0.03] px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            )}

            {/* Accounts Table */}
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-xs text-gray-500">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Email</th>
                      <th className="px-5 py-3 font-medium">Plan</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Revenue</th>
                      <th className="px-5 py-3 font-medium">Created</th>
                      <th className="px-5 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-600">
                          {data?.subAccounts.length === 0 ? 'No sub-accounts yet' : 'No matching accounts'}
                        </td>
                      </tr>
                    ) : (
                      filteredAccounts.map((account, index) => (
                        <motion.tr
                          key={account._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-5 py-3 text-sm font-medium text-white">{account.name}</td>
                          <td className="px-5 py-3 text-sm text-gray-400">{account.email}</td>
                          <td className="px-5 py-3">
                            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400 capitalize">
                              {account.plan}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                                account.status === 'active'
                                  ? 'bg-green-500/10 text-green-400'
                                  : account.status === 'pending'
                                    ? 'bg-yellow-500/10 text-yellow-400'
                                    : 'bg-red-500/10 text-red-400'
                              }`}
                            >
                              {account.status === 'active' ? (
                                <CheckCircle className="h-3 w-3" />
                              ) : (
                                <XCircle className="h-3 w-3" />
                              )}
                              {account.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm font-medium text-green-400">
                            ${account.monthlyRevenue.toFixed(2)}
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-500">
                            {new Date(account.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="px-5 py-3">
                            <button
                              onClick={() => handleDelete(account._id)}
                              disabled={deleting === account._id}
                              className="text-red-400/60 transition-colors hover:text-red-400 disabled:opacity-50"
                            >
                              {deleting === account._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Earnings Tab */}
        {tab === 'earnings' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {earningsLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
              </div>
            ) : earnings ? (
              <>
                {/* Earnings Stats */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    {
                      label: 'Lifetime Earnings',
                      value: `$${earnings.totalLifetime.toFixed(2)}`,
                      icon: DollarSign,
                      color: 'text-green-400',
                    },
                    {
                      label: 'Current Month',
                      value: `$${earnings.currentMonth.toFixed(2)}`,
                      icon: TrendingUp,
                      color: 'text-blue-400',
                    },
                    {
                      label: 'Pending Payout',
                      value: `$${earnings.pendingPayout.toFixed(2)}`,
                      icon: Calendar,
                      color: 'text-yellow-400',
                    },
                  ].map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-gray-400">{stat.label}</span>
                        <stat.icon className={`h-4 w-4 ${stat.color}`} />
                      </div>
                      <div className="text-3xl font-bold text-white">{stat.value}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Earnings Chart (Bar representation) */}
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-5 backdrop-blur">
                  <div className="mb-4 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-400" />
                    <h3 className="text-sm font-semibold text-white">Monthly Earnings</h3>
                  </div>
                  {earnings.monthly.length === 0 ? (
                    <div className="py-12 text-center text-sm text-gray-600">No earnings data yet</div>
                  ) : (
                    <div className="space-y-3">
                      {earnings.monthly.map((month, index) => {
                        const maxRevenue = Math.max(...earnings.monthly.map((m) => m.revenue), 1);
                        const width = (month.revenue / maxRevenue) * 100;
                        return (
                          <motion.div
                            key={month.month}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center gap-3"
                          >
                            <span className="w-16 shrink-0 text-xs text-gray-500">{month.month}</span>
                            <div className="h-6 flex-1 overflow-hidden rounded-lg bg-white/[0.03]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${width}%` }}
                                transition={{ duration: 0.5, delay: index * 0.05 }}
                                className="h-full rounded-lg bg-gradient-to-r from-blue-500/40 to-blue-400/40"
                              />
                            </div>
                            <div className="w-24 shrink-0 text-right">
                              <span className="text-sm font-medium text-white">${month.revenue.toFixed(0)}</span>
                              <span className="ml-1 text-[10px] text-gray-600">({month.accounts} accts)</span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="py-20 text-center text-gray-500">No earnings data available</div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
