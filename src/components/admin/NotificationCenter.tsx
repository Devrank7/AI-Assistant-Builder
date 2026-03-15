'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string;
  severity: 'danger' | 'warning' | 'info';
}

const severityColors: Record<string, string> = {
  danger: 'border-l-red-500',
  warning: 'border-l-amber-500',
  info: 'border-l-blue-500',
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/admin/notifications');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.data ?? []);
      }
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-secondary)]"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {alerts.length > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {alerts.length}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-[var(--admin-border-emphasis)] bg-[var(--admin-bg-card)] shadow-xl">
          <div className="border-b border-[var(--admin-border-subtle)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[var(--admin-text-primary)]">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--admin-text-muted)]">All clear</p>
            ) : (
              alerts.map((alert) => (
                <button
                  key={alert.id}
                  onClick={() => {
                    router.push(alert.link);
                    setOpen(false);
                  }}
                  className={`w-full border-l-2 px-4 py-3 text-left hover:bg-[var(--admin-bg-hover)] ${severityColors[alert.severity] ?? ''}`}
                >
                  <p className="text-sm font-medium text-[var(--admin-text-primary)]">{alert.title}</p>
                  <p className="mt-0.5 text-xs text-[var(--admin-text-muted)]">{alert.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
