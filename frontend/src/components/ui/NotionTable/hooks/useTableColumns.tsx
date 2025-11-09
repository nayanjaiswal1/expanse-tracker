import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { EditableCell, SelectCell } from '../index';
import { Check } from 'lucide-react';

interface ColumnConfig<T> {
  id?: string;
  accessorKey: keyof T;
  header: string;
  size?: number;
  type?: 'text' | 'number' | 'date' | 'select' | 'boolean';
  editable?: boolean;
  enableSorting?: boolean;
  options?: Array<{ value: string; label: string }>;
  placeholder?: string;
  onChange?: (id: number, value: unknown) => void;
  renderCell?: (
    value: unknown,
    row: T,
    index: number,
    helpers: { update: (id: number, v: unknown) => void }
  ) => React.ReactNode;
}

interface ColumnBuilderConfig<T> {
  localChanges: Map<number, Partial<T>>;
  onUpdate: (id: number, field: keyof T, value: unknown) => void;
}

/**
 * Hook to build table columns from configuration
 * Memoizes column definitions to prevent unnecessary re-renders
 */
export function useTableColumns<T extends { id: number }>(
  columns: Array<ColumnConfig<T>>,
  config: ColumnBuilderConfig<T>
) {
  const { localChanges, onUpdate } = config;

  return useMemo<ColumnDef<T, unknown>[]>(() => {
    return columns.map((col) => {
      const baseColumn: ColumnDef<T, unknown> = {
        accessorKey: col.accessorKey as string,
        header: col.header,
        size: col.size || 150,
        enableSorting: col.enableSorting,
      };

      if (col.id) {
        (baseColumn as { id?: string }).id = col.id;
      }

      // Custom cell renderer
      if (col.renderCell) {
        baseColumn.cell = ({ row }) => {
          const pending = localChanges.get(row.original.id);
          const value =
            pending && pending[col.accessorKey] !== undefined
              ? pending[col.accessorKey]
              : row.original[col.accessorKey];
          const helpers = {
            update: (id: number, v: unknown) => onUpdate(id, col.accessorKey, v),
          } as const;
          return col.renderCell!(value, row.original, row.index, helpers);
        };
      }
      // Select cell
      else if (col.type === 'select' && col.options) {
        baseColumn.cell = ({ row }) => {
          const hasPending =
            localChanges.has(row.original.id) &&
            localChanges.get(row.original.id)?.[col.accessorKey] !== undefined;
          const currentValue = hasPending
            ? localChanges.get(row.original.id)?.[col.accessorKey]
            : row.original[col.accessorKey];

          return (
            <div
              className={hasPending ? 'relative bg-yellow-50/50 dark:bg-yellow-900/10' : 'relative'}
            >
              <SelectCell
                key={`${String(col.accessorKey)}-${row.original.id}-${String(currentValue ?? '')}`}
                value={String(currentValue ?? '')}
                options={col.options!}
                onChange={(value) => {
                  if (col.onChange) {
                    col.onChange(row.original.id, value);
                  } else {
                    onUpdate(row.original.id, col.accessorKey, value);
                  }
                }}
                placeholder={col.placeholder || 'Select...'}
              />
            </div>
          );
        };
      }
      // Boolean cell
      else if (col.type === 'boolean') {
        baseColumn.cell = ({ row }) => {
          const hasPending =
            localChanges.has(row.original.id) &&
            localChanges.get(row.original.id)?.[col.accessorKey] !== undefined;
          const currentValue = hasPending
            ? localChanges.get(row.original.id)?.[col.accessorKey]
            : row.original[col.accessorKey];

          return (
            <div
              className={
                hasPending
                  ? 'flex items-center justify-center px-2 py-1.5 h-8 bg-yellow-50/50 dark:bg-yellow-900/10'
                  : 'flex items-center justify-center px-2 py-1.5 h-8'
              }
            >
              <button
                key={`${String(col.accessorKey)}-${row.original.id}-${currentValue}`}
                onClick={(e) => {
                  e.stopPropagation();
                  const newValue = !currentValue;
                  if (col.onChange) {
                    col.onChange(row.original.id, newValue);
                  } else {
                    onUpdate(row.original.id, col.accessorKey, newValue);
                  }
                }}
                className={
                  currentValue
                    ? 'p-0.5 rounded transition-colors text-green-600 bg-green-50 dark:bg-green-900/20'
                    : 'p-0.5 rounded transition-colors text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                }
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          );
        };
      }
      // Editable cell
      else if (col.editable !== false) {
        baseColumn.cell = ({ row }) => (
          <EditableCell
            value={String(row.original[col.accessorKey] || '')}
            type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
            onChange={(value) => {
              if (col.onChange) {
                col.onChange(row.original.id, value);
              } else {
                onUpdate(row.original.id, col.accessorKey, value);
              }
            }}
          />
        );
      }
      // Read-only cell
      else {
        baseColumn.cell = ({ row }) => (
          <div className="px-2 py-1.5 h-8 flex items-center">
            <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
              {String(row.original[col.accessorKey] || '')}
            </span>
          </div>
        );
      }

      return baseColumn;
    });
  }, [columns, localChanges, onUpdate]);
}
