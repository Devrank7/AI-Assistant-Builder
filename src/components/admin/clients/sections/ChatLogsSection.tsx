'use client';

import { useState, useEffect } from 'react';

interface ChatLogsSectionProps {
  clientId: string;
}

interface ChatSession {
  _id: string;
  sessionId?: string;
  messageCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function ChatLogsSection({ clientId }: ChatLogsSectionProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/chatlogs?clientId=${clientId}&limit=50`);
        if (res.ok) {
          const json = await res.json();
          setSessions(json.data ?? json ?? []);
        }
      } catch {
        // Endpoint may not exist — silently handle
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-[var(--admin-text-muted)]">No chat sessions found</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-[var(--admin-text-muted)]">{sessions.length} sessions</p>
      <div className="overflow-hidden rounded-lg border border-[var(--admin-border-subtle)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)]">
              <th className="px-4 py-2 text-left text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
                Session ID
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
                Messages
              </th>
              <th className="px-4 py-2 text-left text-[11px] font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
                Date
              </th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session._id} className="border-b border-[var(--admin-border-subtle)] last:border-0">
                <td className="px-4 py-2 font-mono text-xs text-[var(--admin-text-muted)]">
                  {(session.sessionId || session._id).substring(0, 12)}…
                </td>
                <td className="px-4 py-2 text-[var(--admin-text-primary)]">{session.messageCount ?? '—'}</td>
                <td className="px-4 py-2 text-xs text-[var(--admin-text-muted)]">
                  {formatDate(session.updatedAt || session.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
