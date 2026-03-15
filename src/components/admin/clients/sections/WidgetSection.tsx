'use client';

interface WidgetSectionProps {
  client: {
    widgetPosition?: string;
    primaryColor?: string;
    widgetType?: string;
  };
}

export function WidgetSection({ client }: WidgetSectionProps) {
  return (
    <dl className="space-y-3">
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Widget Type</dt>
        <dd className="text-sm text-[var(--admin-text-primary)]">{client.widgetType || '—'}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Position</dt>
        <dd className="text-sm text-[var(--admin-text-primary)]">{client.widgetPosition || '—'}</dd>
      </div>
      <div className="flex items-center justify-between">
        <dt className="text-sm text-[var(--admin-text-muted)]">Primary Color</dt>
        <dd className="flex items-center gap-2">
          {client.primaryColor ? (
            <>
              <span
                className="inline-block h-5 w-5 rounded-full border border-[var(--admin-border-subtle)]"
                style={{ backgroundColor: client.primaryColor }}
              />
              <span className="font-mono text-sm text-[var(--admin-text-primary)]">{client.primaryColor}</span>
            </>
          ) : (
            <span className="text-sm text-[var(--admin-text-muted)]">—</span>
          )}
        </dd>
      </div>
    </dl>
  );
}
