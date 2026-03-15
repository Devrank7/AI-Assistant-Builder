'use client';

import { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';

interface TriggersSectionProps {
  clientId: string;
}

interface ProactiveTrigger {
  _id: string;
  type?: string;
  message?: string;
  active?: boolean;
}

export function TriggersSection({ clientId }: TriggersSectionProps) {
  const [triggers, setTriggers] = useState<ProactiveTrigger[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/proactive-triggers?clientId=${clientId}`);
        if (res.ok) {
          const json = await res.json();
          setTriggers(json.data ?? json ?? []);
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
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="admin-skeleton h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (triggers.length === 0) {
    return <p className="text-sm text-[var(--admin-text-muted)]">No proactive triggers configured</p>;
  }

  return (
    <div className="space-y-2">
      {triggers.map((trigger) => (
        <div
          key={trigger._id}
          className="flex items-center justify-between rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] px-4 py-3"
        >
          <div>
            <p className="text-sm font-medium text-[var(--admin-text-primary)]">{trigger.type || 'Trigger'}</p>
            {trigger.message && (
              <p className="mt-0.5 line-clamp-1 text-xs text-[var(--admin-text-muted)]">{trigger.message}</p>
            )}
          </div>
          <StatusBadge status={trigger.active ? 'active' : 'none'} label={trigger.active ? 'Active' : 'Disabled'} />
        </div>
      ))}
    </div>
  );
}
