import { useMemo } from 'react';

/**
 * Merges server data with local optimistic updates
 * Prevents unnecessary recalculations by memoizing the result
 */
export function useMergedData<T extends { id: number }>(
  data: T[],
  localChanges: Map<number, Partial<T>>
): T[] {
  return useMemo(() => {
    // Fast path: no local changes
    if (localChanges.size === 0) return data;

    return data.map((item) => {
      const localChange = localChanges.get(item.id);
      return localChange ? { ...item, ...localChange } : item;
    });
  }, [data, localChanges]);
}
