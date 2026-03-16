import { type ReactNode } from 'react';

interface Column {
  key: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  columns: Column[];
  data: T[];
  renderRow: (item: T, index: number) => ReactNode;
  emptyState?: ReactNode;
  onRowClick?: (item: T) => void;
}

export function Table<T>({ columns, data, renderRow, emptyState, onRowClick }: TableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-border border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`text-text-tertiary px-4 py-2.5 text-left text-[11px] font-medium tracking-wider uppercase ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, i) => (
            <tr
              key={i}
              className={`border-border-subtle hover:bg-bg-tertiary border-b transition-colors last:border-0 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick?.(item)}
            >
              {renderRow(item, i)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableCell({
  children,
  className = '',
  align,
}: {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <td
      className={`text-text-primary px-4 py-3 text-sm ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : ''} ${className}`}
    >
      {children}
    </td>
  );
}
