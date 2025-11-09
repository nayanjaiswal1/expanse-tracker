import { useMemo } from 'react';

/**
 * Simple hook to convert filter state to API parameters
 * Removes empty values and handles special cases
 */
export function useApiFilters<T extends Record<string, any>>(
  filters: T,
  options?: {
    // Fields that should be excluded when they equal these values
    excludeDefaults?: Record<keyof T, any>;
    // Fields that should be transformed before sending to API
    transforms?: Partial<Record<keyof T, (value: any) => any>>;
  }
) {
  return useMemo(() => {
    const params: Record<string, any> = {};
    const excludeDefaults = options?.excludeDefaults || {};
    const transforms = options?.transforms || {};

    Object.entries(filters).forEach(([key, value]) => {
      // Skip if value is empty or matches exclude default
      if (
        value === undefined ||
        value === null ||
        value === '' ||
        (excludeDefaults[key] !== undefined && value === excludeDefaults[key])
      ) {
        return;
      }

      // Apply transformation if defined
      const transform = transforms[key];
      const finalValue = transform ? transform(value) : value;

      // Only add if final value is not empty
      if (finalValue !== undefined && finalValue !== null && finalValue !== '') {
        params[key] = finalValue;
      }
    });

    return params;
  }, [filters, options?.excludeDefaults, options?.transforms]);
}
