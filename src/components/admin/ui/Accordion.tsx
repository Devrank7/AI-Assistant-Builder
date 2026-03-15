'use client';

import { useState, type ReactNode } from 'react';

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}

export function Accordion({ title, children, defaultOpen = false, badge }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [rendered, setRendered] = useState(defaultOpen);

  const toggle = () => {
    if (!rendered) setRendered(true);
    setOpen((o) => !o);
  };

  return (
    <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-bg-card)]">
      <button onClick={toggle} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-[var(--admin-text-primary)]">{title}</h3>
          {badge !== undefined && (
            <span className="rounded-full bg-[var(--admin-bg-hover)] px-2 py-0.5 text-xs text-[var(--admin-text-secondary)]">
              {badge}
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-[var(--admin-text-muted)] transition-transform duration-250 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {rendered && (
        <div
          className={`overflow-hidden transition-all duration-250 ease-in-out ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="border-t border-[var(--admin-border-subtle)] px-5 py-4">{children}</div>
        </div>
      )}
    </div>
  );
}
