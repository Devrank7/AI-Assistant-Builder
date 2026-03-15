'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action' | 'widget';
  action: () => void;
}

const SearchIcon = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const NAV_ICONS = {
  overview: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
      />
    </svg>
  ),
  analytics: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
      />
    </svg>
  ),
  builder: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  ),
  widgets: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
      />
    </svg>
  ),
  integrations: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
      />
    </svg>
  ),
  billing: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
      />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  action: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
      />
    </svg>
  ),
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [widgets, setWidgets] = useState<{ clientId: string; widgetName: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Fetch widgets once
  useEffect(() => {
    fetch('/api/user/widgets')
      .then((r) => r.json())
      .then((d) => {
        if (d.success)
          setWidgets(
            d.data.map((w: { clientId: string; widgetName: string }) => ({
              clientId: w.clientId,
              widgetName: w.widgetName || 'Untitled',
            }))
          );
      })
      .catch(() => {});
  }, []);

  const handleOpen = useCallback(() => {
    flushSync(() => {
      setOpen(true);
      setQuery('');
      setSelectedIndex(0);
    });
    inputRef.current?.focus();
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleOpen();
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleOpen]);

  const allItems = useMemo<CommandItem[]>(() => {
    const nav: CommandItem[] = [
      {
        id: 'nav-overview',
        label: 'Overview',
        description: 'Dashboard home',
        icon: NAV_ICONS.overview,
        category: 'navigation',
        action: () => router.push('/dashboard'),
      },
      {
        id: 'nav-widgets',
        label: 'My Widgets',
        description: 'View all widgets',
        icon: NAV_ICONS.widgets,
        category: 'navigation',
        action: () => router.push('/dashboard/widgets'),
      },
      {
        id: 'nav-builder',
        label: 'AI Builder',
        description: 'Create new widget',
        icon: NAV_ICONS.builder,
        category: 'navigation',
        action: () => router.push('/dashboard/builder'),
      },
      {
        id: 'nav-analytics',
        label: 'Analytics',
        description: 'Widget performance',
        icon: NAV_ICONS.analytics,
        category: 'navigation',
        action: () => router.push('/dashboard/analytics'),
      },
      {
        id: 'nav-integrations',
        label: 'Integrations',
        description: 'Channels & CRM',
        icon: NAV_ICONS.integrations,
        category: 'navigation',
        action: () => router.push('/dashboard/integrations'),
      },
      {
        id: 'nav-billing',
        label: 'Billing',
        description: 'Plans & payments',
        icon: NAV_ICONS.billing,
        category: 'navigation',
        action: () => router.push('/dashboard/billing'),
      },
      {
        id: 'nav-settings',
        label: 'Settings',
        description: 'Account settings',
        icon: NAV_ICONS.settings,
        category: 'navigation',
        action: () => router.push('/dashboard/settings'),
      },
    ];

    const actions: CommandItem[] = [
      {
        id: 'act-new-widget',
        label: 'Create New Widget',
        description: 'Start the AI builder',
        icon: NAV_ICONS.action,
        category: 'action',
        action: () => router.push('/dashboard/builder'),
      },
      {
        id: 'act-billing',
        label: 'Manage Billing',
        description: 'Open Stripe portal',
        icon: NAV_ICONS.billing,
        category: 'action',
        action: () => {
          fetch('/api/stripe/portal', { method: 'POST' })
            .then((r) => r.json())
            .then((d) => {
              if (d.success && d.data?.url) window.location.href = d.data.url;
            });
        },
      },
    ];

    const widgetItems: CommandItem[] = widgets.flatMap((w) => [
      {
        id: `widget-${w.clientId}`,
        label: w.widgetName,
        description: w.clientId,
        icon: NAV_ICONS.widgets,
        category: 'widget',
        action: () => router.push(`/dashboard/widgets?selected=${w.clientId}`),
      },
      {
        id: `customize-${w.clientId}`,
        label: `Customize ${w.widgetName}`,
        description: 'Open in playground',
        icon: NAV_ICONS.action,
        category: 'widget',
        action: () => router.push(`/dashboard/playground/${w.clientId}`),
      },
    ]);

    return [...nav, ...actions, ...widgetItems];
  }, [widgets, router]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allItems;
    const q = query.toLowerCase();
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q)
    );
  }, [query, allItems]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, CommandItem[]>();
    for (const item of filtered) {
      const group = map.get(item.category) || [];
      group.push(item);
      map.set(item.category, group);
    }
    return map;
  }, [filtered]);

  const flatFiltered = useMemo(() => filtered, [filtered]);

  const handleSelect = (item: CommandItem) => {
    setOpen(false);
    item.action();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === 'Enter' && flatFiltered[selectedIndex]) {
      handleSelect(flatFiltered[selectedIndex]);
    }
  };

  // Scroll selected into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!open) return null;

  const categoryLabels: Record<string, string> = {
    navigation: 'Pages',
    action: 'Quick Actions',
    widget: 'Widgets',
  };

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-[#12121a] shadow-2xl shadow-black/50">
        {/* Search input */}
        <div className="flex items-center border-b border-white/10 px-4">
          <span className="text-gray-500">{SearchIcon}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, widgets, actions..."
            className="flex-1 bg-transparent px-3 py-4 text-sm text-white placeholder-gray-500 outline-none"
          />
          <kbd className="hidden rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500 sm:inline">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {flatFiltered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">No results found</p>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category}>
                <div className="px-4 pt-2 pb-1">
                  <span className="text-[10px] font-medium tracking-wider text-gray-600 uppercase">
                    {categoryLabels[category] || category}
                  </span>
                </div>
                {items.map((item) => {
                  const idx = flatIndex++;
                  return (
                    <button
                      key={item.id}
                      data-index={idx}
                      onClick={() => handleSelect(item)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        selectedIndex === idx ? 'bg-cyan-500/10 text-cyan-300' : 'text-gray-300 hover:bg-white/5'
                      }`}
                    >
                      <span className={selectedIndex === idx ? 'text-cyan-400' : 'text-gray-500'}>{item.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{item.label}</p>
                        {item.description && <p className="truncate text-xs text-gray-500">{item.description}</p>}
                      </div>
                      {selectedIndex === idx && <span className="text-[10px] text-gray-500">↵</span>}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-4 py-2">
          <div className="flex items-center gap-4 text-[10px] text-gray-600">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    </div>
  );
}
