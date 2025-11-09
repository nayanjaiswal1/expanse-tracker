import { useCallback } from 'react';

export interface FilterRemoveConfig {
  defaultValues?: Record<string, any>;
}

/**
 * Create a handler for removing individual filter chips
 */
export function useFilterRemove<T extends Record<string, any>>(
  setFilter: (key: keyof T, value: any) => void,
  config: FilterRemoveConfig = {}
) {
  const { defaultValues = {} } = config;

  return useCallback(
    (key: string) => {
      const defaultValue = defaultValues[key];
      const resetValue = defaultValue !== undefined ? defaultValue : '';
      setFilter(key as keyof T, resetValue);
    },
    [setFilter, defaultValues]
  );
}
