'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showInfo?: boolean;
  totalItems?: number;
  itemsPerPage?: number;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showInfo,
  totalItems,
  itemsPerPage,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const getPages = (): (number | '...')[] => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const btnBase = 'h-9 min-w-[36px] px-2 rounded-lg text-sm font-medium transition-all duration-200';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {showInfo && totalItems !== undefined && itemsPerPage !== undefined && (
        <p className="text-text-secondary text-sm">
          Показано {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)}–
          {Math.min(currentPage * itemsPerPage, totalItems)} из {totalItems}
        </p>
      )}
      <div className="ml-auto flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={`${btnBase} text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {getPages().map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="text-text-tertiary px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`${btnBase} ${
                p === currentPage
                  ? 'bg-accent text-text-primary shadow-accent/20 shadow-lg'
                  : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={`${btnBase} text-text-secondary hover:bg-bg-tertiary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
