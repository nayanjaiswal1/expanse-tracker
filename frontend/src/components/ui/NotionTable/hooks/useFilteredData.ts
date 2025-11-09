import { useMemo } from 'react';

interface SearchConfig {
  enabled?: boolean;
  searchTerm: string;
  searchableFields?: string[]; // Optional: limit search to specific fields
}

/**
 * Filters data based on search term
 * Optimized with memoization to prevent unnecessary filtering
 */
export function useFilteredData<T extends Record<string, any>>(
  data: T[],
  config: SearchConfig
): T[] {
  const { enabled, searchTerm, searchableFields } = config;

  return useMemo(() => {
    if (!enabled || !searchTerm) return data;

    const lowercasedTerm = searchTerm.toLowerCase();

    return data.filter((item) => {
      const values = searchableFields
        ? searchableFields.map((field) => item[field])
        : Object.values(item);

      return values.some((val) => String(val).toLowerCase().includes(lowercasedTerm));
    });
  }, [data, searchTerm, enabled, searchableFields]);
}
