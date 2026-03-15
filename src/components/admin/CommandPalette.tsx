'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { StatusBadge } from './ui/StatusBadge';

interface SearchResults {
  users: Array<{ _id: string; email: string; name: string; plan: string; status: string }>;
  clients: Array<{ _id: string; name: string; domain: string; status: string; ownerEmail: string }>;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const router = useRouter();

  const allItems = [
    ...(results?.users.map((u) => ({
      type: 'user' as const,
      id: u._id,
      label: u.email,
      sub: u.name,
      status: u.status,
    })) ?? []),
    ...(results?.clients.map((c) => ({
      type: 'client' as const,
      id: c._id,
      label: c.name,
      sub: c.domain,
      status: c.status,
    })) ?? []),
  ];

  const handleOpen = useCallback(() => {
    flushSync(() => {
      setOpen(true);
      setQuery('');
      setResults(null);
      setSelectedIndex(0);
    });
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpen();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    const handleCustom = () => handleOpen();
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('open-command-palette', handleCustom);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('open-command-palette', handleCustom);
    };
  }, [open, handleOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.data ?? data);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleSelect = (item: (typeof allItems)[0]) => {
    setOpen(false);
    if (item.type === 'user') router.push(`/admin/users/${item.id}`);
    else router.push(`/admin/clients/${item.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, allItems.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && allItems[selectedIndex]) {
      handleSelect(allItems[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-[var(--admin-border-emphasis)] bg-[var(--admin-bg-card)] shadow-2xl">
        <div className="flex items-center border-b border-[var(--admin-border-subtle)] px-4">
          <svg className="h-5 w-5 text-[var(--admin-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search users, clients..."
            className="flex-1 bg-transparent px-3 py-4 text-sm text-[var(--admin-text-primary)] placeholder:text-[var(--admin-text-muted)] focus:outline-none"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--admin-accent-blue)] border-t-transparent" />
          )}
        </div>
        {results && (
          <div className="max-h-80 overflow-y-auto py-2">
            {allItems.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">No results found</p>
            ) : (
              <>
                {results.users.length > 0 && (
                  <div className="px-3 py-1.5">
                    <span className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
                      Users
                    </span>
                  </div>
                )}
                {results.users.map((u, i) => (
                  <button
                    key={u._id}
                    onClick={() =>
                      handleSelect({ type: 'user', id: u._id, label: u.email, sub: u.name, status: u.status })
                    }
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left ${selectedIndex === i ? 'bg-[var(--admin-bg-hover)]' : ''}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm text-[var(--admin-text-primary)]">{u.email}</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">{u.name}</p>
                    </div>
                    <StatusBadge status={u.status} />
                  </button>
                ))}
                {results.clients.length > 0 && (
                  <div className="px-3 py-1.5">
                    <span className="text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
                      Clients
                    </span>
                  </div>
                )}
                {results.clients.map((c, ci) => (
                  <button
                    key={c._id}
                    onClick={() =>
                      handleSelect({ type: 'client', id: c._id, label: c.name, sub: c.domain, status: c.status })
                    }
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left ${selectedIndex === results.users.length + ci ? 'bg-[var(--admin-bg-hover)]' : ''}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm text-[var(--admin-text-primary)]">{c.name}</p>
                      <p className="text-xs text-[var(--admin-text-muted)]">{c.domain}</p>
                    </div>
                    <StatusBadge status={c.status} />
                  </button>
                ))}
              </>
            )}
          </div>
        )}
        <div className="border-t border-[var(--admin-border-subtle)] px-4 py-2">
          <div className="flex items-center gap-4 text-[11px] text-[var(--admin-text-muted)]">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
