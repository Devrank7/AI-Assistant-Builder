'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { FilterBar, FilterConfig } from '@/components/admin/ui/FilterBar';
import { ClientsTable, ClientRow } from '@/components/admin/clients/ClientsTable';
import { useToast } from '@/components/ui/Toast';
import { generateCsv, downloadCsv } from '@/lib/exportCsv';

const filterConfigs: FilterConfig[] = [
  {
    key: 'clientType',
    label: 'All Types',
    options: [
      { value: 'full', label: 'Full' },
      { value: 'quick', label: 'Quick' },
    ],
  },
  {
    key: 'status',
    label: 'All Statuses',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'trial', label: 'Trial' },
      { value: 'pending', label: 'Pending' },
    ],
  },
];

export default function ClientsPage() {
  const { toastSuccess, toastError } = useToast();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (filterValues.clientType) params.set('clientType', filterValues.clientType);
      if (filterValues.status) params.set('status', filterValues.status);
      const res = await fetch(`/api/admin/clients?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setClients(json.data ?? []);
      } else {
        toastError('Failed to load clients');
      }
    } catch {
      toastError('Failed to load clients');
    } finally {
      setLoading(false);
    }
  }, [search, filterValues, toastError]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleExport = () => {
    const exportData = clients.map((c) => ({
      name: c.name,
      domain: c.domain,
      ownerEmail: c.ownerEmail,
      type: c.type,
      status: c.subscriptionStatus,
      clientId: c.clientId,
      createdAt: c.createdAt,
    }));
    const csv = generateCsv(exportData, ['name', 'domain', 'ownerEmail', 'type', 'status', 'clientId', 'createdAt']);
    downloadCsv(csv, 'clients.csv');
    toastSuccess('CSV exported');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--admin-text-primary)]">Clients</h1>
        <button
          onClick={handleExport}
          className="rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] px-4 py-2 text-sm text-[var(--admin-text-secondary)] transition-colors hover:bg-[var(--admin-bg-hover)]"
        >
          Export CSV
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-72">
          <SearchInput value={search} onChange={setSearch} placeholder="Search clients..." loading={loading} />
        </div>
        <FilterBar filters={filterConfigs} values={filterValues} onChange={setFilterValues} />
        {selectedIds.length > 0 && (
          <span className="text-sm text-[var(--admin-text-muted)]">{selectedIds.length} selected</span>
        )}
      </div>

      <ClientsTable clients={clients} loading={loading} onSelectionChange={setSelectedIds} />
    </div>
  );
}
