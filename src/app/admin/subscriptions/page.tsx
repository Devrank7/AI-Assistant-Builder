'use client';

import { useState, useEffect, useCallback } from 'react';
import { FilterBar, type FilterConfig } from '@/components/admin/ui/FilterBar';
import { StatCard } from '@/components/admin/ui/StatCard';
import { SubscriptionsTable } from '@/components/admin/subscriptions/SubscriptionsTable';
import { useToast } from '@/components/ui/Toast';

interface SubRow {
  _id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  clientsCount: number;
  mrrAmount: number;
  trialEndsAt: string | null;
}

interface SubStats {
  activeCount: number;
  trialsExpiringThisWeek: number;
  pastDueCount: number;
  totalMrr: number;
}

const filterConfigs: FilterConfig[] = [
  {
    key: 'plan',
    label: 'All Plans',
    options: [
      { value: 'none', label: 'None' },
      { value: 'basic', label: 'Basic' },
      { value: 'pro', label: 'Pro' },
    ],
  },
  {
    key: 'status',
    label: 'All Statuses',
    options: [
      { value: 'trial', label: 'Trial' },
      { value: 'active', label: 'Active' },
      { value: 'past_due', label: 'Past Due' },
      { value: 'canceled', label: 'Canceled' },
    ],
  },
  {
    key: 'expiring',
    label: 'Expiring Within',
    options: [
      { value: '7', label: 'Next 7 days' },
      { value: '30', label: 'Next 30 days' },
    ],
  },
];

export default function SubscriptionsPage() {
  const { toastSuccess, toastError } = useToast();
  const [users, setUsers] = useState<SubRow[]>([]);
  const [stats, setStats] = useState<SubStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterValues.plan) params.set('plan', filterValues.plan);
      if (filterValues.status) params.set('status', filterValues.status);
      if (filterValues.expiring) params.set('expiring', filterValues.expiring);
      const res = await fetch(`/api/admin/subscriptions?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data ?? []);
      } else {
        toastError('Failed to load subscriptions');
      }
    } catch {
      toastError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [filterValues, toastError]);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const json = await res.json();
        setStats(json.data ?? null);
      }
    } catch {
      // Stats are non-critical
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleAction = async (userId: string, action: string, value?: string) => {
    if (action === 'extend_trial' && value) {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extendTrialDays: parseInt(value, 10) }),
        });
        if (res.ok) {
          toastSuccess(`Trial extended by ${value} days`);
          fetchUsers();
        } else {
          toastError('Failed to extend trial');
        }
      } catch {
        toastError('Failed to extend trial');
      }
      return;
    }

    if (action === 'change_plan' && value) {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: value }),
        });
        if (res.ok) {
          toastSuccess(`Plan updated to ${value}`);
          fetchUsers();
        } else {
          toastError('Failed to update plan');
        }
      } catch {
        toastError('Failed to update plan');
      }
      return;
    }

    if (action === 'cancel') {
      try {
        const res = await fetch(`/api/admin/users/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscriptionStatus: 'canceled' }),
        });
        if (res.ok) {
          toastSuccess('Subscription canceled');
          fetchUsers();
        } else {
          toastError('Failed to cancel subscription');
        }
      } catch {
        toastError('Failed to cancel subscription');
      }
      return;
    }
  };

  const handleBatchAction = async (action: string, value?: string) => {
    if (selectedIds.length === 0) return;
    setBatchLoading(true);
    try {
      const res = await fetch('/api/admin/subscriptions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIds: selectedIds, action, value }),
      });
      if (res.ok) {
        toastSuccess(`Batch action applied to ${selectedIds.length} users`);
        setSelectedIds([]);
        fetchUsers();
      } else {
        toastError('Batch action failed');
      }
    } catch {
      toastError('Batch action failed');
    } finally {
      setBatchLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Subscriptions</h1>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Subscriptions"
          value={statsLoading ? '...' : String(stats?.activeCount ?? 0)}
          loading={statsLoading}
        />
        <StatCard
          label="Trials Expiring This Week"
          value={statsLoading ? '...' : String(stats?.trialsExpiringThisWeek ?? 0)}
          loading={statsLoading}
        />
        <StatCard
          label="Past Due"
          value={statsLoading ? '...' : String(stats?.pastDueCount ?? 0)}
          loading={statsLoading}
        />
        <StatCard label="Total MRR" value={statsLoading ? '...' : `$${stats?.totalMrr ?? 0}`} loading={statsLoading} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FilterBar filters={filterConfigs} values={filterValues} onChange={setFilterValues} />
      </div>

      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-[var(--admin-border-emphasis)] bg-[var(--admin-bg-card)] px-4 py-2">
          <span className="text-sm text-[var(--admin-text-secondary)]">{selectedIds.length} selected</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => handleBatchAction('extend_trial', '7')}
              disabled={batchLoading}
              className="rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] px-3 py-1.5 text-sm text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-bg-hover)] disabled:opacity-50"
            >
              Extend Trial +7d
            </button>
            <button
              onClick={() => handleBatchAction('change_plan', 'basic')}
              disabled={batchLoading}
              className="rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] px-3 py-1.5 text-sm text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-bg-hover)] disabled:opacity-50"
            >
              Set Basic
            </button>
            <button
              onClick={() => handleBatchAction('change_plan', 'pro')}
              disabled={batchLoading}
              className="rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-sm text-blue-400 transition-colors hover:bg-blue-500/20 disabled:opacity-50"
            >
              Set Pro
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <SubscriptionsTable users={users} loading={loading} onAction={handleAction} onSelectionChange={setSelectedIds} />
    </div>
  );
}
