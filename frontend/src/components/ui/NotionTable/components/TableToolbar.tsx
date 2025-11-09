import type React from 'react';
import type { Table } from '@tanstack/react-table';
import { HStack } from '../../Layout';
import { ColumnVisibilityMenu } from '../ColumnVisibilityMenu';

interface TableToolbarProps<T> {
  table: Table<T>;
  toolbar?: React.ReactNode;
}

export function TableToolbar<T>({ table, toolbar }: TableToolbarProps<T>) {
  return (
    <div className="sticky top-0 z-20 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 bg-white dark:bg-gray-900">
      <HStack className="justify-between">
        <HStack gap={3} className="w-full">
          {toolbar}
        </HStack>
        <ColumnVisibilityMenu table={table} />
      </HStack>
    </div>
  );
}
