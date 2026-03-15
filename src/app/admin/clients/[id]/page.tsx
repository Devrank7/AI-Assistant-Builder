'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Accordion } from '@/components/admin/ui/Accordion';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { OverviewSection } from '@/components/admin/clients/sections/OverviewSection';
import { AISettingsSection } from '@/components/admin/clients/sections/AISettingsSection';
import { KnowledgeSection } from '@/components/admin/clients/sections/KnowledgeSection';
import { ChannelsSection } from '@/components/admin/clients/sections/ChannelsSection';
import { ChatLogsSection } from '@/components/admin/clients/sections/ChatLogsSection';
import { BillingSection } from '@/components/admin/clients/sections/BillingSection';
import { WidgetSection } from '@/components/admin/clients/sections/WidgetSection';
import { TriggersSection } from '@/components/admin/clients/sections/TriggersSection';
import { useToast } from '@/components/ui/Toast';

interface ClientData {
  _id: string;
  clientId: string;
  name: string;
  domain?: string;
  type: string;
  subscriptionStatus: string;
  ownerId?: string;
  ownerEmail?: string;
  ownerPlan?: string;
  totalSessions?: number;
  extraCredits?: number;
  createdAt: string;
  // Channel fields
  telegramBotToken?: string;
  whatsappPhoneNumber?: string;
  instagramToken?: string;
  // Widget fields
  widgetPosition?: string;
  primaryColor?: string;
  widgetType?: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClientProfilePage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { toastError } = useToast();
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/admin/clients/${id}`);
        if (res.ok) {
          const json = await res.json();
          setClient(json.data);
        } else {
          toastError('Failed to load client');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id, toastError]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="admin-skeleton h-8 w-40" />
        <div className="admin-skeleton h-24 w-full rounded-xl" />
        <div className="admin-skeleton h-48 w-full rounded-xl" />
        <div className="admin-skeleton h-48 w-full rounded-xl" />
      </div>
    );
  }

  if (!client) {
    return <div className="py-20 text-center text-[var(--admin-text-muted)]">Client not found</div>;
  }

  return (
    <div className="space-y-4">
      <button
        onClick={() => router.push('/admin/clients')}
        className="flex items-center gap-2 text-sm text-[var(--admin-text-muted)] transition-colors hover:text-[var(--admin-text-secondary)]"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Clients
      </button>

      {/* Header */}
      <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-[var(--admin-text-primary)]">{client.name}</h1>
            {client.domain && <p className="mt-0.5 text-sm text-[var(--admin-text-muted)]">{client.domain}</p>}
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={client.type} />
            <StatusBadge status={client.subscriptionStatus} />
          </div>
        </div>
      </div>

      {/* Accordion sections */}
      <Accordion title="Overview" defaultOpen>
        <OverviewSection client={client} />
      </Accordion>

      <Accordion title="AI Settings">
        <AISettingsSection clientId={client.clientId} />
      </Accordion>

      <Accordion title="Knowledge Base">
        <KnowledgeSection clientId={client.clientId} />
      </Accordion>

      <Accordion title="Channels">
        <ChannelsSection client={client} />
      </Accordion>

      <Accordion title="Chat Logs">
        <ChatLogsSection clientId={client.clientId} />
      </Accordion>

      <Accordion title="Widget Config">
        <WidgetSection client={client} />
      </Accordion>

      <Accordion title="Billing">
        <BillingSection client={client} />
      </Accordion>

      <Accordion title="Proactive Triggers">
        <TriggersSection clientId={client.clientId} />
      </Accordion>
    </div>
  );
}
