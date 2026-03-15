'use client';

import { useState, useMemo, type ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: keyof T;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  onSelectionChange?: (selectedKeys: string[]) => void;
  pageSize?: number;
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  onRowClick,
  selectable,
  onSelectionChange,
  pageSize,
  loading,
  emptyMessage = 'No data',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      const cmp = av.localeCompare(bv);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = pageSize ? Math.ceil(sorted.length / pageSize) : 1;
  const paginated = pageSize ? sorted.slice(page * pageSize, (page + 1) * pageSize) : sorted;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelect = (key: string) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
    onSelectionChange?.([...next]);
  };

  const toggleAll = () => {
    if (selected.size === data.length) {
      setSelected(new Set());
      onSelectionChange?.([]);
    } else {
      const all = data.map((r) => String(r[rowKey]));
      setSelected(new Set(all));
      onSelectionChange?.(all);
    }
  };

  if (loading) {
    return (
      <div className="overflow-hidden rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)]">
              {columns.map((c) => (
                <th key={c.key} className="px-4 py-3 text-left">
                  <div className="admin-skeleton h-3 w-16" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-[var(--admin-border-subtle)]">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    <div className="admin-skeleton h-4 w-24" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)]">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.size === data.length && data.length > 0}
                    onChange={toggleAll}
                    className="rounded border-[var(--admin-border-emphasis)]"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={`px-4 py-3 text-left text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase ${col.sortable ? 'cursor-pointer select-none hover:text-[var(--admin-text-secondary)]' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && <span>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-sm text-[var(--admin-text-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginated.map((row) => {
                const key = String(row[rowKey]);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-[var(--admin-border-subtle)] transition-colors duration-150 ${onRowClick ? 'cursor-pointer hover:bg-[var(--admin-bg-hover)]' : ''}`}
                  >
                    {selectable && (
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggleSelect(key)}
                          className="rounded border-[var(--admin-border-emphasis)]"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-[var(--admin-text-primary)]" role="cell">
                        {col.render ? col.render(row) : String(row[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[var(--admin-border-subtle)] px-4 py-3">
          <span className="text-xs text-[var(--admin-text-muted)]">
            Page {page + 1} of {totalPages} ({data.length} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              aria-label="Previous page"
              className="rounded-md px-3 py-1 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)] disabled:opacity-30"
            >
              ← Prev
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              aria-label="Next page"
              className="rounded-md px-3 py-1 text-sm text-[var(--admin-text-secondary)] hover:bg-[var(--admin-bg-hover)] disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
