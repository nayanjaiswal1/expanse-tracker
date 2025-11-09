import { ChevronUp, ChevronDown } from 'lucide-react';
import type { Header } from '@tanstack/react-table';
import { flexRender } from '@tanstack/react-table';

interface ColumnHeaderProps<T> {
  header: Header<T, unknown>;
}

export function ColumnHeader<T>({ header }: ColumnHeaderProps<T>) {
  const canSort = header.column.getCanSort();
  const isSorted = header.column.getIsSorted();
  const canResize = header.column.getCanResize();
  const isResizing = header.column.getIsResizing();
  const rawHeader = header.column.columnDef.header;
  const isStringHeader = typeof rawHeader === 'string';

  return (
    <div className={`relative flex items-center h-full group ${isResizing ? 'select-none' : ''}`}>
      {isStringHeader ? (
        <button
          onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
          className={`flex-1 flex items-center gap-1.5 px-3 py-2 text-left text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest min-w-0 ${
            canSort ? 'cursor-pointer hover:text-gray-600 dark:hover:text-gray-300' : ''
          }`}
        >
          <span className="truncate min-w-0 block">{rawHeader as string}</span>
          {canSort && (
            <span className="flex-shrink-0">
              {isSorted === 'asc' ? (
                <ChevronUp className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              ) : isSorted === 'desc' ? (
                <ChevronDown className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              ) : (
                <ChevronUp className="w-3 h-3 opacity-0 group-hover:opacity-30 transition-opacity" />
              )}
            </span>
          )}
        </button>
      ) : (
        <div className="flex-1 px-3 py-2 text-[10px] font-medium text-gray-400 dark:text-gray-500">
          {flexRender(rawHeader, header.getContext())}
        </div>
      )}

      {/* Resize handle */}
      {canResize && (
        <div
          onMouseDown={header.getResizeHandler()}
          onTouchStart={header.getResizeHandler()}
          className={`absolute right-0 top-0 bottom-0 w-[1px] cursor-col-resize z-20 select-none transition-colors ${
            isResizing
              ? 'bg-blue-500 dark:bg-blue-400'
              : 'bg-transparent hover:bg-gray-300 dark:hover:bg-gray-600'
          }`}
          style={{
            touchAction: 'none',
          }}
          title="Drag to resize"
        />
      )}
    </div>
  );
}
