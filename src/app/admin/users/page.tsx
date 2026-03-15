'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { FilterBar, FilterConfig } from '@/components/admin/ui/FilterBar';
import { Modal } from '@/components/admin/ui/Modal';
import { UsersTable, UserRow } from '@/components/admin/users/UsersTable';
import { useToast } from '@/components/ui/Toast';
import { generateCsv, downloadCsv } from '@/lib/exportCsv';

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
];

export default function UsersPage() {
  const { toastSuccess, toastError } = useToast();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterValues.plan) params.set('plan', filterValues.plan);
      if (filterValues.status) params.set('status', filterValues.status);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setUsers(json.data ?? []);
      } else {
        toastError('Failed to load users');
      }
    } catch {
      toastError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, filterValues, toastError]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = async (action: string, user: UserRow, value?: string) => {
    if (action === 'delete') {
      setDeleteTarget(user);
      return;
    }

    if (action === 'impersonate') {
      try {
        const res = await fetch(`/api/admin/users/${user._id}/impersonate`, { method: 'POST' });
        if (res.ok) {
          const json = await res.json();
          const url = json.data?.url ?? '/';
          window.open(url, '_blank');
          toastSuccess(`Impersonating ${user.email}`);
        } else {
          toastError('Impersonation failed');
        }
      } catch {
        toastError('Impersonation failed');
      }
      return;
    }

    if (action === 'change_plan' && value) {
      try {
        const res = await fetch(`/api/admin/users/${user._id}`, {
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

    if (action === 'extend_trial' && value) {
      try {
        const res = await fetch(`/api/admin/users/${user._id}`, {
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
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteTarget._id}`, { method: 'DELETE' });
      if (res.ok) {
        toastSuccess(`User ${deleteTarget.email} deleted`);
        setDeleteTarget(null);
        fetchUsers();
      } else {
        toastError('Failed to delete user');
      }
    } catch {
      toastError('Failed to delete user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleExport = () => {
    const exportData = users.map((u) => ({
      email: u.email,
      name: u.name,
      plan: u.plan,
      status: u.subscriptionStatus,
      createdAt: u.createdAt,
    }));
    const csv = generateCsv(exportData, ['email', 'name', 'plan', 'status', 'createdAt']);
    downloadCsv(csv, 'users.csv');
    toastSuccess('CSV exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Users</h1>
        <button
          onClick={handleExport}
          className="rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-bg-hover)]"
        >
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search users..." loading={loading} />
        </div>
        <FilterBar filters={filterConfigs} values={filterValues} onChange={setFilterValues} />
        {selectedIds.length > 0 && (
          <span className="text-sm text-[var(--admin-text-muted)]">{selectedIds.length} selected</span>
        )}
      </div>

      <UsersTable users={users} loading={loading} onSelectionChange={setSelectedIds} onAction={handleAction} />

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
        onConfirm={handleDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleteLoading}
      >
        <p>
          Are you sure you want to delete <strong>{deleteTarget?.email}</strong>? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
