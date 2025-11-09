import { useMemo, useCallback } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterChip {
  key: string;
  label: string;
}

export interface FilterManagerConfig<T> {
  // Values to exclude from API params (e.g., { status: 'all' })
  excludeDefaults?: Partial<Record<keyof T, any>>;
  // Search key name (default: 'search')
  searchKey?: keyof T;
  // Options for select filters
  optionMaps?: Partial<Record<keyof T, FilterOption[]>>;
  // Transform values before sending to API
  transforms?: Partial<Record<keyof T, (value: any) => any>>;
}

export interface FilterManagerResult<T> {
  // Clean API parameters ready for backend
  apiParams: Record<string, any>;
  // Filter chips for UI display
  filterChips: FilterChip[];
  // Handler to remove a single filter chip
  removeFilter: (key: string) => void;
  // Check if any filters are active
  hasActiveFilters: boolean;
}

/**
 * All-in-one filter management hook
 * Handles API params, filter chips, and removal logic
 */
export function useFilterManager<T extends Record<string, any>>(
  filters: T,
  setFilter: (key: keyof T, value: any) => void,
  config: FilterManagerConfig<T> = {}
): FilterManagerResult<T> {
  const {
    excludeDefaults = {},
    searchKey = 'search' as keyof T,
    optionMaps = {},
    transforms = {},
  } = config;

  // Generate API parameters
  const apiParams = useMemo(() => {
    const params: Record<string, any> = {};

    Object.entries(filters).forEach(([key, value]) => {
      // Skip empty values
      if (value === undefined || value === null || value === '') {
        return;
      }

      // Skip if matches exclude default
      if (
        excludeDefaults[key as keyof T] !== undefined &&
        value === excludeDefaults[key as keyof T]
      ) {
        return;
      }

      // Apply transformation if defined
      const transform = transforms[key as keyof T];
      const finalValue = transform ? transform(value) : value;

      // Only add if final value is not empty
      if (finalValue !== undefined && finalValue !== null && finalValue !== '') {
        params[key] = finalValue;
      }
    });

    return params;
  }, [filters, excludeDefaults, transforms]);

  // Generate filter chips
  const filterChips = useMemo(() => {
    const chips: FilterChip[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      // Skip empty values
      if (value === undefined || value === null || value === '') {
        return;
      }

      // Skip if matches exclude default
      if (
        excludeDefaults[key as keyof T] !== undefined &&
        value === excludeDefaults[key as keyof T]
      ) {
        return;
      }

      // Handle search field
      if (key === String(searchKey) && typeof value === 'string' && value.trim()) {
        // Skip search chips - search is already visible in the search bar
        return;
      }

      // Handle fields with option maps
      const options = optionMaps[key as keyof T];
      if (options) {
        const match = options.find((option) => option.value === value);
        chips.push({ key, label: match?.label || String(value) });
        return;
      }

      // Default: use value as label
      if (value) {
        chips.push({ key, label: String(value) });
      }
    });

    return chips;
  }, [filters, excludeDefaults, searchKey, optionMaps]);

  // Filter removal handler
  const removeFilter = useCallback(
    (key: string) => {
      const defaultValue = excludeDefaults[key as keyof T];
      const resetValue = defaultValue !== undefined ? defaultValue : '';
      setFilter(key as keyof T, resetValue);
    },
    [setFilter, excludeDefaults]
  );

  // Check if any filters are active
  const hasActiveFilters = filterChips.length > 0;

  return {
    apiParams,
    filterChips,
    removeFilter,
    hasActiveFilters,
  };
}
