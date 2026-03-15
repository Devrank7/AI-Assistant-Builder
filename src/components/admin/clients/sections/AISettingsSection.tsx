'use client';

import { useState, useEffect } from 'react';

interface AISettingsSectionProps {
  clientId: string;
}

interface AISettings {
  systemPrompt?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export function AISettingsSection({ clientId }: AISettingsSectionProps) {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/ai-settings/${clientId}`);
        if (res.ok) {
          const json = await res.json();
          setSettings(json.data ?? json);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="admin-skeleton h-4 w-24" />
        <div className="admin-skeleton h-32 w-full" />
        <div className="admin-skeleton h-4 w-32" />
      </div>
    );
  }

  if (!settings) {
    return <p className="text-sm text-[var(--admin-text-muted)]">No AI settings configured</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-medium tracking-[0.06em] text-[var(--admin-text-muted)] uppercase">
          System Prompt
        </label>
        <textarea
          readOnly
          value={settings.systemPrompt || ''}
          rows={6}
          className="w-full resize-none rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] px-3 py-2 text-sm text-[var(--admin-text-secondary)] focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <p className="text-xs text-[var(--admin-text-muted)]">Model</p>
          <p className="mt-0.5 text-sm text-[var(--admin-text-primary)]">{settings.model || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--admin-text-muted)]">Temperature</p>
          <p className="mt-0.5 text-sm text-[var(--admin-text-primary)]">{settings.temperature ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[var(--admin-text-muted)]">Max Tokens</p>
          <p className="mt-0.5 text-sm text-[var(--admin-text-primary)]">{settings.maxTokens ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}
