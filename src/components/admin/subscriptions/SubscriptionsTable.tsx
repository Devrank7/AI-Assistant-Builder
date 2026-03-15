'use client';

import { DataTable, type Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { QuickActionMenu, type MenuItem } from '@/components/admin/ui/QuickActionMenu';

export interface SubRow extends Record<string, unknown> {
  _id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  clientsCount: number;
  mrrAmount: number;
  trialEndsAt: string | null;
}

interface SubscriptionsTableProps {
  users: SubRow[];
  loading: boolean;
  onAction: (userId: string, action: string, value?: string) => void;
  onSelectionChange?: (ids: string[]) => void;
}

export function SubscriptionsTable({ users, loading, onAction, onSelectionChange }: SubscriptionsTableProps) {
  const columns: Column<SubRow>[] = [
    { key: 'email', header: 'Email', sortable: true },
    { key: 'name', header: 'Name', sortable: true },
    { key: 'plan', header: 'Plan', render: (row) => <StatusBadge status={row.plan} /> },
    { key: 'subscriptionStatus', header: 'Status', render: (row) => <StatusBadge status={row.subscriptionStatus} /> },
    { key: 'clientsCount', header: 'Clients', sortable: true },
    {
      key: 'trialEndsAt',
      header: 'Expires / Next Payment',
      render: (row) => {
        if (!row.trialEndsAt) return <span className="text-xs text-[var(--admin-text-muted)]">—</span>;
        const d = new Date(row.trialEndsAt);
        const isPast = d < new Date();
        return (
          <span className={`text-xs ${isPast ? 'text-red-400' : 'text-[var(--admin-text-secondary)]'}`}>
            {d.toLocaleDateString()}
          </span>
        );
      },
    },
    {
      key: 'mrrAmount',
      header: 'MRR',
      render: (row) => <span className="text-sm">${row.mrrAmount}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: '48px',
      render: (row) => {
        const items: MenuItem[] = [
          {
            label: 'Extend Trial',
            submenu: [
              { label: '+7 days', onClick: () => onAction(row._id, 'extend_trial', '7') },
              { label: '+14 days', onClick: () => onAction(row._id, 'extend_trial', '14') },
              { label: '+30 days', onClick: () => onAction(row._id, 'extend_trial', '30') },
            ],
          },
          {
            label: 'Change Plan',
            submenu: [
              { label: 'None', onClick: () => onAction(row._id, 'change_plan', 'none') },
              { label: 'Basic', onClick: () => onAction(row._id, 'change_plan', 'basic') },
              { label: 'Pro', onClick: () => onAction(row._id, 'change_plan', 'pro') },
            ],
          },
          { type: 'divider' },
          { label: 'Cancel', onClick: () => onAction(row._id, 'cancel'), variant: 'danger' },
        ];
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <QuickActionMenu items={items} />
          </div>
        );
      },
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      rowKey="_id"
      selectable
      onSelectionChange={onSelectionChange}
      pageSize={20}
      loading={loading}
      emptyMessage="No subscriptions found"
    />
  );
}
