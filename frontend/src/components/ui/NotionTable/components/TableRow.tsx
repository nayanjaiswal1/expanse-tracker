import { memo } from 'react';
import type { Row as TanStackRow } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { HStack } from '../../Layout';

interface TableRowProps<T> {
  row: TanStackRow<T>;
  rowHeight: number;
  hoveredRowId: string | null;
  hasRowActions: boolean;
  onRowClick?: (row: TanStackRow<T>, e: React.MouseEvent) => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
  onPointerCancel?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onMenuToggle?: (rowId: string, button: HTMLButtonElement | null) => void;
  menuButtonRef?: (el: HTMLButtonElement | null, rowId: string) => void;
}

function TableRowComponent<T>({
  row,
  rowHeight,
  hoveredRowId,
  hasRowActions,
  onRowClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
  onPointerCancel,
  onMouseEnter,
  onMouseLeave,
  onMenuToggle,
  menuButtonRef,
}: TableRowProps<T>) {
  const isHovered = hoveredRowId === row.id && !row.getIsSelected();
  const isSelected = row.getIsSelected();

  return (
    <tr
      onClick={(e) => onRowClick?.(row, e)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onPointerCancel={onPointerCancel}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ height: `${rowHeight}px`, contain: 'layout' }}
      className={`group border-b border-gray-100 dark:border-gray-800 transition-colors ${
        onRowClick ? 'cursor-pointer' : ''
      } ${isHovered ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''} ${
        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
      }`}
    >
      {row.getVisibleCells().map((cell) => (
        <td
          key={cell.id}
          className="border-r border-gray-100 dark:border-gray-800 last:border-r-0"
          style={{ width: `${cell.column.getSize()}px` }}
        >
          <div
            className={`${
              cell.column.id === 'select' ? '' : 'px-3 py-2'
            } overflow-hidden text-ellipsis whitespace-nowrap`}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </div>
        </td>
      ))}
      {hasRowActions && (
        <td className="w-12">
          <HStack className="justify-center h-8">
            <button
              ref={(el) => menuButtonRef?.(el, row.id)}
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle?.(row.id, null);
              }}
              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
              aria-label="Row actions menu"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500 dark:text-gray-400 rotate-90" />
            </button>
          </HStack>
        </td>
      )}
    </tr>
  );
}

export const TableRow = memo(TableRowComponent) as typeof TableRowComponent;
