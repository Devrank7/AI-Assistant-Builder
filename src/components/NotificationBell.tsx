'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Bell } from 'lucide-react';

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/user/notifications');
      const json = await res.json();
      if (json.success) setNotifications(json.data || []);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markAllRead = async () => {
    await fetch('/api/user/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark_all_read' }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-text-secondary hover:bg-bg-tertiary hover:text-text-primary relative rounded-lg p-2 transition-colors"
      >
        <Bell size={18} strokeWidth={1.5} />
        {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />}
      </button>

      {open && (
        <div className="border-border bg-bg-primary absolute top-full right-0 z-50 mt-2 w-80 rounded-xl border shadow-lg">
          <div className="border-border flex items-center justify-between border-b px-4 py-3">
            <span className="text-text-primary text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-accent hover:text-accent-hover text-xs">
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-text-tertiary p-6 text-center text-sm">No notifications</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n._id}
                  className={`border-border border-b px-4 py-3 last:border-0 ${!n.isRead ? 'bg-accent-subtle' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <p className="text-text-primary text-sm font-medium">{n.title}</p>
                    {!n.isRead && <span className="bg-accent mt-1 h-2 w-2 flex-shrink-0 rounded-full" />}
                  </div>
                  <p className="text-text-secondary mt-0.5 text-xs">{n.message}</p>
                  <p className="text-text-tertiary mt-1 text-[10px]">{timeAgo(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
