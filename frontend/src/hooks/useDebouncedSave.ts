import { useRef, useCallback, useState, useEffect } from 'react';

interface PendingChange<T> {
  id: number;
  changes: Partial<T>;
  timestamp: number;
}

interface UseDebouncedSaveOptions<T> {
  onSave: (id: number, changes: Partial<T>) => Promise<void>;
  onBulkSave?: (updates: Array<{ id: number } & Partial<T>>) => Promise<void>;
  delay?: number; // milliseconds
}

export function useDebouncedSave<T>({
  onSave,
  onBulkSave,
  delay = 2000,
}: UseDebouncedSaveOptions<T>) {
  const [pendingChanges, setPendingChanges] = useState<Map<number, PendingChange<T>>>(new Map());
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveAllPending = useCallback(async () => {
    if (pendingChanges.size === 0) return;

    const updates = Array.from(pendingChanges.values()).map((change) => ({
      id: change.id,
      ...change.changes,
    }));

    try {
      // Use bulk save if available, otherwise fall back to individual saves
      if (onBulkSave) {
        await onBulkSave(updates);
      } else {
        // Fallback: save each change individually
        await Promise.all(
          updates.map((update) => {
            const { id, ...changes } = update;
            return onSave(id, changes as Partial<T>);
          })
        );
      }

      // Clear all pending changes after successful save
      setPendingChanges(new Map());

      // Clear timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    } catch (error) {
      console.error('Failed to save changes:', error);
      // Keep in pending on error
    }
  }, [pendingChanges, onSave, onBulkSave]);

  const queueChange = useCallback(
    (id: number, field: keyof T, value: any) => {
      setPendingChanges((prev) => {
        const newMap = new Map(prev);
        const existing = newMap.get(id);

        if (existing) {
          // Merge with existing changes for this item
          newMap.set(id, {
            ...existing,
            changes: { ...existing.changes, [field]: value },
            timestamp: Date.now(),
          });
        } else {
          // New pending change
          newMap.set(id, {
            id,
            changes: { [field]: value } as Partial<T>,
            timestamp: Date.now(),
          });
        }

        return newMap;
      });

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout to save all changes after delay
      timeoutRef.current = setTimeout(() => {
        saveAllPending();
      }, delay);
    },
    [delay, saveAllPending]
  );

  const saveAll = useCallback(async () => {
    await saveAllPending();
  }, [saveAllPending]);

  const hasPendingChanges = useCallback(
    (id?: number) => {
      if (id !== undefined) {
        return pendingChanges.has(id);
      }
      return pendingChanges.size > 0;
    },
    [pendingChanges]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    queueChange,
    saveAll,
    hasPendingChanges,
    pendingCount: pendingChanges.size,
  };
}
