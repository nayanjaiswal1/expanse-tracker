import { useState, useEffect, useRef, useCallback } from 'react';
import type { RowSelectionState } from '@tanstack/react-table';

interface UseRowSelectionConfig {
  enabled: boolean;
  initialSelection?: RowSelectionState;
  onSelectionChange?: (state: RowSelectionState) => void;
  debounceMs?: number;
}

export function useRowSelection({
  enabled,
  initialSelection = {},
  onSelectionChange,
  debounceMs = 0,
}: UseRowSelectionConfig) {
  const [internalSelection, setInternalSelection] = useState<RowSelectionState>(
    initialSelection || {}
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with external state
  useEffect(() => {
    setInternalSelection(initialSelection || {});
  }, [initialSelection]);

  const handleSelectionChange = useCallback(
    (updater: RowSelectionState | ((prev: RowSelectionState) => RowSelectionState)) => {
      const base = debounceMs > 0 ? internalSelection : initialSelection;
      const next = typeof updater === 'function' ? updater(base) : updater;

      if (debounceMs > 0) {
        setInternalSelection(next);
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        if (onSelectionChange) {
          debounceRef.current = setTimeout(() => {
            onSelectionChange(next);
          }, debounceMs);
        }
      } else {
        onSelectionChange?.(next);
      }
    },
    [internalSelection, initialSelection, onSelectionChange, debounceMs]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const currentSelection = debounceMs > 0 ? internalSelection : initialSelection;
  const hasSelection = Object.keys(currentSelection).length > 0;

  return {
    rowSelection: currentSelection,
    onRowSelectionChange: enabled ? handleSelectionChange : undefined,
    hasSelection,
  };
}
