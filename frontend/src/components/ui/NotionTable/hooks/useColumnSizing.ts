import { useState, useEffect, useRef, useCallback } from 'react';

export function useColumnSizing(
  initialSizing?: Record<string, number>,
  onSizingChange?: (sizing: Record<string, number>) => void
) {
  const [columnSizing, setColumnSizing] = useState<Record<string, number>>(initialSizing || {});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!initialSizing) return;
    setColumnSizing((prev) => {
      const currentKeys = Object.keys(prev);
      const nextKeys = Object.keys(initialSizing);
      const hasChanges =
        currentKeys.length !== nextKeys.length ||
        nextKeys.some((key) => prev[key] !== initialSizing[key]);
      return hasChanges ? { ...initialSizing } : prev;
    });
  }, [initialSizing]);

  const handleColumnSizingChange = useCallback(
    (
      updater: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)
    ) => {
      const newState = typeof updater === 'function' ? updater(columnSizing) : updater;
      setColumnSizing(newState);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (onSizingChange) {
        timeoutRef.current = setTimeout(() => {
          onSizingChange(newState);
        }, 50);
      }
    },
    [columnSizing, onSizingChange]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    columnSizing,
    onColumnSizingChange: handleColumnSizingChange,
  };
}
