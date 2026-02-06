'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

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
    'h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50 transition-colors appearance-none cursor-pointer';

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      {/* Search input */}
      <div className="relative flex-1">
        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pr-4 pl-10 text-sm text-white placeholder-gray-500 transition-colors focus:border-cyan-500/50 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => handleQueryChange('')}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-300"
          >
            ✕
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
