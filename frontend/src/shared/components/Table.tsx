/**
 * Reusable Table Component
 */

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

interface Column<T> {
  key: keyof T | string;
  label: string;
  render?: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
}

export function Table<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  isLoading,
}: TableProps<T>) {
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={clsx(
                  'px-4 py-3 text-xs font-medium text-gray-500 uppercase',
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center',
                  (!column.align || column.align === 'left') && 'text-left'
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.map((item) => (
            <motion.tr
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => onRowClick?.(item)}
              className={clsx(
                'hover:bg-gray-50 transition-colors',
                onRowClick && 'cursor-pointer'
              )}
            >
              {columns.map((column) => (
                <td
                  key={String(column.key)}
                  className={clsx(
                    'px-4 py-3 text-sm',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    (!column.align || column.align === 'left') && 'text-left'
                  )}
                >
                  {column.render
                    ? column.render(item)
                    : String(item[column.key as keyof T])}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
