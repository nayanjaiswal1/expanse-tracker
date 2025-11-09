import { ReactNode } from 'react';

export interface TableColumnConfig<T = unknown> {
  id?: string;
  accessorKey: keyof T;
  header: string;
  size?: number;
  type?: 'text' | 'number' | 'date' | 'select' | 'boolean' | 'custom';
  editable?: boolean;

  enableSorting?: boolean;
  options?: Array<{ value: string; label: string; color?: string; icon?: string }>;
  renderCell?: (
    value: unknown,
    row: T,
    index?: number,
    helpers?: { update: (id: number, value: unknown) => void }
  ) => ReactNode;
  onChange?: (id: number, value: unknown) => void;
  placeholder?: string;
}

export interface TableConfig<T = unknown> {
  columns: TableColumnConfig<T>[];
  enableSearch?: boolean;
  enableRowSelection?: boolean;
  enableUndo?: boolean;
  enableAutoSave?: boolean;
  autoSaveDelay?: number;
  onBulkUpdate?: (updates: Array<{ id: number } & Partial<T>>) => Promise<void>;
  rowActions?: Array<{ label: string; action: string; icon?: ReactNode }>;
  emptyMessage?: string;
  searchPlaceholder?: string;
  title?: string;
  subtitle?: string;
  renderFilters?: () => ReactNode;
  initialColumnSizing?: Record<string, number>;
  onColumnSizeChange?: (sizing: Record<string, number>) => void;
}

export interface TableFilterConfig {
  field: string;
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'between';
  value: unknown;
}
