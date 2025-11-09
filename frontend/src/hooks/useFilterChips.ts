import { useMemo } from 'react';

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterChip {
  key: string;
  label: string;
}

export interface FilterChipConfig {
  excludeDefaults?: Record<string, any>;
  searchKey?: string;
  optionMaps?: Record<string, FilterOption[]>;
}

/**
 * Generate filter chips from filter state and options
 */
export function useFilterChips<T extends Record<string, any>>(
  filters: T,
  config: FilterChipConfig = {}
): FilterChip[] {
  const { excludeDefaults = {}, searchKey = 'search', optionMaps = {} } = config;

  return useMemo(() => {
    const chips: FilterChip[] = [];

    Object.entries(filters).forEach(([key, value]) => {
      // Skip empty values
      if (value === undefined || value === null || value === '') {
        return;
      }

      // Skip if matches exclude default
      if (excludeDefaults[key] !== undefined && value === excludeDefaults[key]) {
        return;
      }

      // Handle search field
      if (key === searchKey && typeof value === 'string' && value.trim()) {
        // Skip search chips - search is already visible in the search bar
        return;
      }

      // Handle fields with option maps
      if (optionMaps[key]) {
        const match = optionMaps[key].find((option) => option.value === value);
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
}
