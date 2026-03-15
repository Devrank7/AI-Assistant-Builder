'use client';

import { useState, useRef, useEffect } from 'react';

export type MenuItem =
  | { type: 'divider' }
  | {
      label: string;
      onClick?: () => void;
      variant?: 'default' | 'danger';
      submenu?: MenuItem[];
      type?: never;
    };

interface QuickActionMenuProps {
  items: MenuItem[];
}

export function QuickActionMenu({ items }: QuickActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [submenuIndex, setSubmenuIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSubmenuIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleItemClick = (item: MenuItem, index: number) => {
    if ('type' in item && item.type === 'divider') return;
    if (!('label' in item)) return;
    if (item.submenu) {
      setSubmenuIndex(submenuIndex === index ? null : index);
      return;
    }
    item.onClick?.();
    setOpen(false);
    setSubmenuIndex(null);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="Actions"
        className="rounded-md p-1.5 text-[var(--admin-text-muted)] hover:bg-[var(--admin-bg-hover)] hover:text-[var(--admin-text-secondary)]"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-[var(--admin-border-emphasis)] bg-[var(--admin-bg-card)] py-1 shadow-xl">
          {items.map((item, i) => {
            if ('type' in item && item.type === 'divider') {
              return <div key={i} className="my-1 border-t border-[var(--admin-border-subtle)]" />;
            }
            if (!('label' in item)) return null;
            const isDanger = item.variant === 'danger';
            return (
              <div key={i}>
                <button
                  onClick={() => handleItemClick(item, i)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-sm ${isDanger ? 'text-red-400 hover:bg-red-500/10' : 'text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-hover)]'}`}
                >
                  {item.label}
                  {item.submenu && (
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
                {item.submenu && submenuIndex === i && (
                  <div className="border-t border-[var(--admin-border-subtle)] bg-[var(--admin-bg-primary)] py-1">
                    {item.submenu.map((sub, si) => {
                      if ('type' in sub && sub.type === 'divider')
                        return <div key={si} className="my-1 border-t border-[var(--admin-border-subtle)]" />;
                      if (!('label' in sub)) return null;
                      return (
                        <button
                          key={si}
                          onClick={() => {
                            sub.onClick?.();
                            setOpen(false);
                            setSubmenuIndex(null);
                          }}
                          className="w-full px-4 py-1.5 text-left text-sm text-[var(--admin-text-primary)] hover:bg-[var(--admin-bg-hover)]"
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
