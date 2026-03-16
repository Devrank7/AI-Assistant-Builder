'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface FilterOption {
  label: string;
  value: string;
}

interface SortOption {
  label: string;
  value: string;
}

interface SearchFilterProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  filters?: { label: string; key: string; options: FilterOption[] }[];
  onFilterChange?: (filters: Record<string, string>) => void;
  sortOptions?: SortOption[];
  onSortChange?: (sort: string) => void;
  debounceMs?: number;
}

export default function SearchFilter({
  placeholder = 'Поиск...',
  onSearch,
  filters,
  onFilterChange,
  sortOptions,
  onSortChange,
  debounceMs = 300,
}: SearchFilterProps) {
  const [query, setQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const debouncedSearch = useCallback(
    (value: string) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(value), debounceMs);
    },
    [onSearch, debounceMs]
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedSearch(value);
  };

  const handleFilterChange = (key: string, value: string) => {
    const updated = { ...activeFilters, [key]: value };
    if (!value) delete updated[key];
    setActiveFilters(updated);
    onFilterChange?.(updated);
  };

  const selectBase =
    'h-10 px-3 bg-bg-tertiary border border-border rounded-lg text-sm text-text-secondary focus:outline-none focus:border-accent/50 transition-colors appearance-none cursor-pointer';

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* Search input */}
      <div className="relative flex-1">
        <Search className="text-text-secondary absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={placeholder}
          className="border-border bg-bg-tertiary text-text-primary placeholder-text-secondary focus:border-accent/50 h-10 w-full rounded-lg border pr-4 pl-10 text-sm transition-colors focus:outline-none"
        />
        {query && (
          <button
            onClick={() => handleQueryChange('')}
            className="text-text-secondary hover:text-text-primary absolute top-1/2 right-3 -translate-y-1/2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters */}
      {filters?.map((filter) => (
        <select
          key={filter.key}
          value={activeFilters[filter.key] || ''}
          onChange={(e) => handleFilterChange(filter.key, e.target.value)}
          className={selectBase}
        >
          <option value="">{filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {/* Sort */}
      {sortOptions && sortOptions.length > 0 && (
        <select onChange={(e) => onSortChange?.(e.target.value)} className={selectBase}>
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
