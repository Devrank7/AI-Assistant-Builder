'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CategoryFilterProps {
  active: string;
  onChange: (category: string) => void;
  counts?: Record<string, number>;
}

const CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'crm', label: 'CRM' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'payment', label: 'Payments' },
  { key: 'notification', label: 'Notifications' },
  { key: 'data', label: 'Data' },
];

export function CategoryFilter({ active, onChange, counts }: CategoryFilterProps) {
  return (
    <div className="scrollbar-none flex gap-2 overflow-x-auto pb-1">
      {CATEGORIES.map((cat) => {
        const isActive = active === cat.key;
        const count = counts?.[cat.key];

        return (
          <button
            key={cat.key}
            onClick={() => onChange(cat.key)}
            className={cn(
              'relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-colors',
              isActive
                ? 'text-white'
                : 'border-border text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border'
            )}
          >
            {isActive && (
              <motion.div
                layoutId="category-pill"
                className="bg-accent absolute inset-0 rounded-full"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
            <span className="relative z-10">{cat.label}</span>
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'relative z-10 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold',
                  isActive ? 'bg-white/20' : 'bg-bg-tertiary'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
