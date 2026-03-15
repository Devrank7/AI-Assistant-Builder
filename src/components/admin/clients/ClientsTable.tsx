'use client';

import { useRouter } from 'next/navigation';
import { DataTable, Column } from '@/components/admin/ui/DataTable';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';

export interface ClientRow {
  _id: string;
  clientId: string;
  name: string;
  domain: string;
  ownerEmail?: string;
  ownerId?: string;
  type: string;
  subscriptionStatus: string;
  createdAt: string;
  [key: string]: unknown;
}

interface ClientsTableProps {
  clients: ClientRow[];
  loading: boolean;
  onSelectionChange?: (ids: string[]) => void;
}

export function ClientsTable({ clients, loading, onSelectionChange }: ClientsTableProps) {
  const router = useRouter();

  const columns: Column<ClientRow>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
    },
    {
      key: 'domain',
      header: 'Domain',
      sortable: true,
      render: (row) => <span className="text-sm text-[var(--admin-text-muted)]">{String(row.domain || '—')}</span>,
    },
    {
      key: 'ownerEmail',
      header: 'Owner',
      sortable: true,
      render: (row) =>
        row.ownerId ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/users/${row.ownerId}`);
            }}
            className="text-sm text-[var(--admin-accent-blue)] hover:underline"
          >
            {String(row.ownerEmail || '—')}
          </button>
        ) : (
          <span className="text-sm text-[var(--admin-text-muted)]">{String(row.ownerEmail || '—')}</span>
        ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <StatusBadge status={String(row.type)} />,
    },
    {
      key: 'subscriptionStatus',
      header: 'Status',
      render: (row) => <StatusBadge status={String(row.subscriptionStatus)} />,
    },
  ];

  return (
    <DataTable<ClientRow>
      columns={columns}
      data={clients}
      rowKey="_id"
      onRowClick={(row) => router.push(`/admin/clients/${row._id}`)}
      selectable
      onSelectionChange={onSelectionChange}
      pageSize={25}
      loading={loading}
      emptyMessage="No clients found"
    />
  );
}
