'use client';

import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';

interface BillingSectionProps {
  client: {
    ownerId?: string;
    ownerEmail?: string;
    ownerPlan?: string;
    subscriptionStatus: string;
    extraCredits?: number;
  };
}

export function BillingSection({ client }: BillingSectionProps) {
  const router = useRouter();

  return (
    <dl className="space-y-3">
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Owner Plan</dt>
        <dd>
          {client.ownerPlan ? (
            <StatusBadge status={client.ownerPlan} />
          ) : (
            <span className="text-sm text-[var(--admin-text-muted)]">—</span>
          )}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Subscription Status</dt>
        <dd>
          <StatusBadge status={client.subscriptionStatus} />
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Owner</dt>
        <dd>
          {client.ownerId ? (
            <button
              onClick={() => router.push(`/admin/users/${client.ownerId}`)}
              className="text-sm text-[var(--admin-accent-blue)] hover:underline"
            >
              {client.ownerEmail || client.ownerId}
            </button>
          ) : (
            <span className="text-sm text-[var(--admin-text-muted)]">—</span>
          )}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Extra Credits</dt>
        <dd className="text-sm text-[var(--admin-text-primary)]">{(client.extraCredits ?? 0).toLocaleString()}</dd>
      </div>
    </dl>
  );
}
