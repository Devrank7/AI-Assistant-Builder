'use client';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  filters: FilterConfig[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}

export function FilterBar({ filters, values, onChange }: FilterBarProps) {
  const hasActive = Object.keys(values).length > 0;

  const handleChange = (key: string, value: string) => {
    const next = { ...values };
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
    onChange(next);
  };

  return (
    <div className="flex items-center gap-3">
      {filters.map((f) => (
        <select
          key={f.key}
          value={values[f.key] ?? ''}
          onChange={(e) => handleChange(f.key, e.target.value)}
          className="rounded-lg border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] px-3 py-2 text-sm text-[var(--admin-text-primary)] focus:border-[var(--admin-accent-blue)] focus:outline-none"
        >
          <option value="">{f.label}</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {hasActive && (
        <button onClick={() => onChange({})} className="text-sm text-[var(--admin-accent-blue)] hover:underline">
          Clear all
        </button>
      )}
    </div>
  );
}
