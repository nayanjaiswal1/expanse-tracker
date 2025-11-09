import { useMemo, useCallback } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';

/**
 * Converts array of IDs to TanStack Table row selection state
 * and provides handlers for selection changes
 */
export function useRowSelectionMapping<T extends { id: number }>(
  data: T[],
  selectedIds: number[],
  setSelectedIds: (ids: number[]) => void
) {
  // Convert selected IDs to row indices
  const rowSelection: RowSelectionState = useMemo(() => {
    return selectedIds.reduce((acc, id) => {
      const index = data.findIndex((item) => item.id === id);
      if (index !== -1) {
        acc[index] = true;
      }
      return acc;
    }, {} as RowSelectionState);
  }, [selectedIds, data]);

  // Convert row indices back to IDs
  const handleSelectionChange = useCallback(
    (newRowSelection: RowSelectionState) => {
      const ids = Object.keys(newRowSelection)
        .map((index) => data[parseInt(index)]?.id)
        .filter((id): id is number => id !== undefined);
      setSelectedIds(ids);
    },
    [data, setSelectedIds]
  );

  return {
    rowSelection,
    onSelectionChange: handleSelectionChange,
  };
}
