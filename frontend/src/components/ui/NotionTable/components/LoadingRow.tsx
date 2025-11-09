import { memo } from 'react';

interface LoadingRowProps {
  index: number;
  columnCount: number;
  hasRowActions: boolean;
  rowHeight: number;
}

function LoadingRowComponent({ index, columnCount, hasRowActions, rowHeight }: LoadingRowProps) {
  return (
    <tr
      style={{ height: `${rowHeight}px` }}
      className="border-b border-gray-100 dark:border-gray-800"
    >
      {Array.from({ length: columnCount }).map((_, j) => (
        <td key={`skeleton-${index}-${j}`} className="px-3 py-2">
          <div
            className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
            style={{ width: `${Math.random() * 40 + 60}%` }}
          />
        </td>
      ))}
      {hasRowActions && (
        <td className="w-12">
          <div className="flex items-center justify-center">
            <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
        </td>
      )}
    </tr>
  );
}

export const LoadingRow = memo(LoadingRowComponent);
