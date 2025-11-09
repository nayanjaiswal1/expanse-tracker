import { useState, useRef, useEffect } from 'react';
import { Eye, EyeOff, Settings2 } from 'lucide-react';
import type { Table } from '@tanstack/react-table';
import { checkboxClassName } from '../Checkbox';

interface ColumnVisibilityMenuProps<T> {
  table: Table<T>;
}

export function ColumnVisibilityMenu<T>({ table }: ColumnVisibilityMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const columns = table.getAllLeafColumns().filter((column) => column.id !== 'select');

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
      >
        <Settings2 className="w-4 h-4" />
        <span>Columns</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Show Columns
            </div>
          </div>
          <div className="p-2 space-y-1">
            {columns.map((column) => (
              <label
                key={column.id}
                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md cursor-pointer group transition-colors"
              >
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  className={checkboxClassName}
                />
                <span className="flex-1 text-sm text-gray-900 dark:text-gray-100 capitalize">
                  {typeof column.columnDef.header === 'string'
                    ? column.columnDef.header
                    : column.id}
                </span>
                {column.getIsVisible() ? (
                  <Eye className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </label>
            ))}
          </div>
          <div className="p-2 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => {
                table.toggleAllColumnsVisible(true);
              }}
              className="w-full px-3 py-2 text-sm text-left text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              Show all columns
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
