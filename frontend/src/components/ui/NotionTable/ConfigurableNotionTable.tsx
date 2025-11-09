import { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { ColumnDef, RowSelectionState } from '@tanstack/react-table';
import type { SortingState, OnChangeFn } from '@tanstack/react-table';
import { Undo, Redo, Save, Check } from 'lucide-react';
import { NotionTable, EditableCell, SelectCell } from './index';
import { useToast } from '../Toast';
import { Input } from '../Input';
import { ConfirmDialog } from '../ConfirmDialog';
import { useUndoRedo } from '../../../hooks/useUndoRedo';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';
import { useDebouncedSave } from '../../../hooks/useDebouncedSave';
import type { TableConfig } from '../../../types/table';

interface ConfigurableNotionTableProps<T extends { id: number }> {
  data: T[];
  config: TableConfig<T>;
  onUpdate?: (id: number, field: keyof T, value: unknown) => Promise<void>;
  onDelete?: (row: T) => Promise<void>;
  onDuplicate?: (row: T) => Promise<void>;
  onRowAction?: (action: string, row: T) => void;
  isLoading?: boolean;
  selectedRows: number[];
  setSelectedRows: (ids: number[]) => void;
  showLoadOlder?: boolean;
  onLoadOlder?: () => void;
  virtualize?: boolean;
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  manualSorting?: boolean;
}

export function ConfigurableNotionTable<T extends { id: number }>({
  data,
  config,
  onUpdate,
  onDelete,
  onDuplicate,
  onRowAction,
  isLoading = false,
  selectedRows,
  setSelectedRows,
  showLoadOlder = false,
  onLoadOlder,
  virtualize,
  sorting,
  onSortingChange,
  manualSorting,
}: ConfigurableNotionTableProps<T>) {
  const { showSuccess, showError } = useToast();

  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [localChanges, setLocalChanges] = useState<Map<number, Partial<T>>>(new Map());
  const [itemToDelete, setItemToDelete] = useState<T | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut for search (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && showSearch) {
        setShowSearch(false);
        setSearchTerm('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearch]);

  const rowSelection: RowSelectionState = useMemo(() => {
    return selectedRows.reduce((acc, id) => {
      const index = data.findIndex((item) => item.id === id);
      if (index !== -1) {
        acc[index] = true;
      }
      return acc;
    }, {} as RowSelectionState);
  }, [selectedRows, data]);

  const handleSelectionChange = (newRowSelection: RowSelectionState) => {
    const selectedIds = Object.keys(newRowSelection).map((index) => data[parseInt(index)].id);
    setSelectedRows(selectedIds);
  };

  // Auto-save functionality with bulk update support
  const debouncedSave = useDebouncedSave<T>({
    onSave: async (id, changes) => {
      // Fallback for individual saves
      try {
        for (const [field, value] of Object.entries(changes)) {
          if (onUpdate) {
            await onUpdate(id, field as keyof T, value);
          }
        }

        setLocalChanges((prev) => {
          const newMap = new Map(prev);
          newMap.delete(id);
          return newMap;
        });
      } catch (error) {
        showError('Failed to save changes');
        throw error;
      }
    },
    onBulkSave: config.onBulkUpdate
      ? async (updates) => {
          try {
            await config.onBulkUpdate?.(updates);

            // Clear all local changes after successful bulk save
            setLocalChanges(new Map());
          } catch (error) {
            showError('Failed to save changes');
            throw error;
          }
        }
      : undefined,
    delay: config.autoSaveDelay ?? 2000,
  });

  // Undo/Redo
  const undoRedo = useUndoRedo<{
    id: number;
    field: keyof T;
    oldValue: unknown;
    newValue: unknown;
  }>({
    maxHistorySize: 50,
  });

  useKeyboardShortcuts({
    onUndo: undoRedo.undo,
    onRedo: undoRedo.redo,
    enabled: config.enableUndo ?? true,
  });

  // Merge data with local changes
  const mergedData = useMemo(() => {
    return data.map((item) => {
      const localChange = localChanges.get(item.id);
      return localChange ? { ...item, ...localChange } : item;
    });
  }, [data, localChanges]);

  // Handle update
  const handleUpdate = useCallback(
    (id: number, field: keyof T, value: unknown) => {
      const item = mergedData.find((t) => t.id === id);
      if (!item) return;

      const oldValue = item[field];
      if (oldValue === value) return;

      // Optimistic update
      setLocalChanges((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(id) || {};
        newMap.set(id, { ...existing, [field]: value } as Partial<T>);
        return newMap;
      });

      // Queue for save
      if (config.enableAutoSave !== false) {
        debouncedSave.queueChange(id, field, value);
      }

      // Add to undo stack
      if (config.enableUndo !== false) {
        undoRedo.addAction({
          type: 'update',
          data: { id, field, oldValue, newValue: value },
          undo: async () => {
            setLocalChanges((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(id) || {};
              newMap.set(id, { ...existing, [field]: oldValue } as Partial<T>);
              return newMap;
            });
            debouncedSave.queueChange(id, field, oldValue);
          },
          redo: async () => {
            setLocalChanges((prev) => {
              const newMap = new Map(prev);
              const existing = newMap.get(id) || {};
              newMap.set(id, { ...existing, [field]: value } as Partial<T>);
              return newMap;
            });
            debouncedSave.queueChange(id, field, value);
          },
        });
      }
    },
    [mergedData, config, debouncedSave, undoRedo]
  );

  // Build columns from config
  const columns: ColumnDef<T, unknown>[] = useMemo(
    () =>
      config.columns.map((col) => {
        const baseColumn: ColumnDef<T, unknown> = {
          accessorKey: col.accessorKey as string,
          header: col.header,
          size: col.size || 150,
          enableSorting: col.enableSorting,
        };
        // Preserve provided column id for sizing/state keys
        if (col.id) {
          (baseColumn as { id?: string }).id = col.id;
        }
        // If a custom cell renderer is provided, prefer it
        if (col.renderCell) {
          // Pass the possibly-updated value (considering localChanges) to custom renderers
          baseColumn.cell = ({ row }) => {
            const pending = localChanges.get(row.original.id);
            const value =
              pending && pending[col.accessorKey] !== undefined
                ? pending[col.accessorKey]
                : row.original[col.accessorKey];
            const helpers = {
              update: (id: number, v: unknown) => handleUpdate(id, col.accessorKey, v),
            } as const;
            return col.renderCell!(value, row.original, row.index, helpers);
          };
        } else if (col.type === 'select' && col.options) {
          baseColumn.cell = ({ row }) => {
            const hasPending =
              localChanges.has(row.original.id) &&
              localChanges.get(row.original.id)?.[col.accessorKey] !== undefined;
            // Determine current value including local optimistic changes
            const currentValue =
              localChanges.has(row.original.id) &&
              localChanges.get(row.original.id)?.[col.accessorKey] !== undefined
                ? localChanges.get(row.original.id)?.[col.accessorKey]
                : row.original[col.accessorKey];
            return (
              <div
                className={`relative ${hasPending ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
              >
                <SelectCell
                  key={`${String(col.accessorKey)}-${row.original.id}-${String(currentValue ?? '')}`}
                  value={String(currentValue ?? '')}
                  options={col.options!}
                  onChange={(value) => {
                    if (col.onChange) {
                      col.onChange(row.original.id, value);
                    } else {
                      handleUpdate(row.original.id, col.accessorKey, value);
                    }
                  }}
                  placeholder={col.placeholder || 'Select...'}
                />
              </div>
            );
          };
        } else if (col.type === 'boolean') {
          baseColumn.cell = ({ row }) => {
            const hasPending =
              localChanges.has(row.original.id) &&
              localChanges.get(row.original.id)?.[col.accessorKey] !== undefined;

            // Get the current value considering local changes
            const currentValue =
              localChanges.has(row.original.id) &&
              localChanges.get(row.original.id)?.[col.accessorKey] !== undefined
                ? localChanges.get(row.original.id)?.[col.accessorKey]
                : row.original[col.accessorKey];

            return (
              <div
                className={`flex items-center justify-center px-2 py-1.5 h-8 ${hasPending ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
              >
                <button
                  key={`${String(col.accessorKey)}-${row.original.id}-${currentValue}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newValue = !currentValue;
                    if (col.onChange) {
                      col.onChange(row.original.id, newValue);
                    } else {
                      handleUpdate(row.original.id, col.accessorKey, newValue);
                    }
                  }}
                  className={`p-0.5 rounded transition-colors ${
                    currentValue
                      ? 'text-green-600 bg-green-50 dark:bg-green-900/20'
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                  }`}
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            );
          };
        } else if (col.editable !== false) {
          baseColumn.cell = ({ row }) => (
            <EditableCell
              value={String(row.original[col.accessorKey] || '')}
              type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
              onChange={(value) => {
                if (col.onChange) {
                  col.onChange(row.original.id, value);
                } else {
                  handleUpdate(row.original.id, col.accessorKey, value);
                }
              }}
            />
          );
        } else {
          baseColumn.cell = ({ row }) => (
            <div className="px-2 py-1.5 h-8 flex items-center">
              <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                {String(row.original[col.accessorKey] || '')}
              </span>
            </div>
          );
        }

        return baseColumn;
      }),
    [config.columns, localChanges, handleUpdate]
  );

  // Handle row actions
  const handleRowAction = useCallback(
    async (action: string, row: T) => {
      if (action === 'delete' && onDelete) {
        setItemToDelete(row);
      } else if (action === 'duplicate' && onDuplicate) {
        try {
          await onDuplicate(row);
          showSuccess('Item duplicated');
        } catch {
          showError('Failed to duplicate item');
        }
      } else if (onRowAction) {
        onRowAction(action, row);
      }
    },
    [onDelete, onDuplicate, onRowAction, showSuccess, showError]
  );

  const confirmDelete = async () => {
    if (!itemToDelete || !onDelete) return;

    try {
      await onDelete(itemToDelete);
      showSuccess('Item deleted');
      setItemToDelete(null);
    } catch {
      showError('Failed to delete item');
      setItemToDelete(null);
    }
  };

  // Filter data
  const filteredData = useMemo(() => {
    if (!config.enableSearch || !searchTerm) return mergedData;
    return mergedData.filter((item) =>
      Object.values(item).some((val) =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [mergedData, searchTerm, config.enableSearch]);

  // Toolbar
  const canUndo = undoRedo.canUndo();
  const canRedo = undoRedo.canRedo();

  const toolbar = (
    <div className="flex w-full flex-wrap items-center gap-3">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {/* Undo/Redo - Only show when there are changes */}
        {config.enableUndo !== false && (canUndo || canRedo) && (
          <div className="flex items-center gap-1 border-r border-gray-200 dark:border-gray-700 pr-3">
            <button
              onClick={undoRedo.undo}
              disabled={!canUndo}
              className={`p-1.5 rounded transition-colors ${
                canUndo
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={undoRedo.redo}
              disabled={!canRedo}
              className={`p-1.5 rounded transition-colors ${
                canRedo
                  ? 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                  : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Auto-save indicator */}
        {config.enableAutoSave !== false && debouncedSave.hasPendingChanges() && (
          <div className="flex items-center gap-2 border-r border-gray-200 dark:border-gray-700 pr-3">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {debouncedSave.pendingCount} unsaved
              </span>
            </div>
            <button
              onClick={debouncedSave.saveAll}
              className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center gap-1.5 shadow-sm"
              title="Save all changes now"
            >
              <Save className="w-3.5 h-3.5" />
              Save All
            </button>
          </div>
        )}

        {/* Search */}
        {config.enableSearch !== false && (
          <>
            {!showSearch ? (
              <button
                onClick={() => {
                  setShowSearch(true);
                  setTimeout(() => searchInputRef.current?.focus(), 100);
                }}
                className="p-1.5 rounded transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                title="Search (Ctrl+K)"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>
            ) : (
              <div className="flex items-center gap-2 relative">
                <Input
                  inputRef={searchInputRef}
                  type="text"
                  placeholder={config.searchPlaceholder || 'Search...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-xs pr-16"
                />
                <kbd className="absolute right-2 px-2 py-0.5 text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
                  ESC
                </kbd>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setShowSearch(false);
                    }}
                    className="absolute right-12 p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {config.renderFilters && (
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
          {config.renderFilters()}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {(config.title || config.subtitle) && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {config.title && (
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{config.title}</h1>
          )}
          {config.subtitle && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{config.subtitle}</p>
          )}
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        <NotionTable
          data={filteredData}
          columns={columns}
          enableRowSelection={config.enableRowSelection}
          onSelectionChange={handleSelectionChange}
          rowActions={config.rowActions}
          onRowAction={handleRowAction}
          toolbar={toolbar}
          emptyMessage={config.emptyMessage || 'No data available'}
          rowSelection={rowSelection}
          showLoadOlder={showLoadOlder}
          onLoadOlder={onLoadOlder}
          initialColumnSizing={config.initialColumnSizing}
          onColumnSizingChange={config.onColumnSizeChange}
          virtualize={virtualize}
          sorting={sorting}
          onSortingChange={onSortingChange}
          manualSorting={manualSorting}
        />
      </div>

      <ConfirmDialog
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={confirmDelete}
        title="Delete Item"
        message="Are you sure you want to delete this item?"
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
