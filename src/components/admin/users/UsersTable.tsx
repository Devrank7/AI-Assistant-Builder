'use client';

import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { QuickActionMenu, MenuItem } from '@/components/admin/ui/QuickActionMenu';

export interface UserRow {
  _id: string;
  email: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  createdAt: string;
  [key: string]: unknown;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface UsersTableProps {
  users: UserRow[];
  loading: boolean;
  onSelectionChange?: (ids: string[]) => void;
  onAction: (action: string, user: UserRow, value?: string) => void;
}

export function UsersTable({ users, loading, onSelectionChange, onAction }: UsersTableProps) {
  const router = useRouter();

  const columns: Column<UserRow>[] = [
    {
      key: 'email',
      header: 'Email',
      sortable: true,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (row) => <StatusBadge status={row.plan} />,
    },
    {
      key: 'subscriptionStatus',
      header: 'Status',
      render: (row) => <StatusBadge status={row.subscriptionStatus} />,
    },
    {
      key: 'createdAt',
      header: 'Registered',
      sortable: true,
      render: (row) => <span className="text-xs text-[var(--admin-text-muted)]">{timeAgo(String(row.createdAt))}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '48px',
      render: (row) => {
        const items: MenuItem[] = [
          {
            label: 'Change Plan',
            submenu: [
              { label: 'None', onClick: () => onAction('change_plan', row, 'none') },
              { label: 'Basic ($29)', onClick: () => onAction('change_plan', row, 'basic') },
              { label: 'Pro ($79)', onClick: () => onAction('change_plan', row, 'pro') },
            ],
          },
          {
            label: 'Extend Trial',
            submenu: [
              { label: '+7 days', onClick: () => onAction('extend_trial', row, '7') },
              { label: '+14 days', onClick: () => onAction('extend_trial', row, '14') },
              { label: '+30 days', onClick: () => onAction('extend_trial', row, '30') },
            ],
          },
          { label: 'Impersonate', onClick: () => onAction('impersonate', row) },
          { type: 'divider' },
          { label: 'Delete', variant: 'danger', onClick: () => onAction('delete', row) },
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
    <DataTable<UserRow>
      columns={columns}
      data={users}
      rowKey="_id"
      onRowClick={(row) => router.push(`/admin/users/${row._id}`)}
      selectable
      onSelectionChange={onSelectionChange}
      pageSize={25}
      loading={loading}
      emptyMessage="No users found"
    />
  );
}
