import { useCallback, useMemo } from 'react';
import {
  useUrlStateObject,
  urlStateSerializers,
  type UrlStateValue,
  type UrlStateOptions,
} from './useUrlState';

export interface FilterConfig<T extends UrlStateValue = UrlStateValue> {
  defaultValue?: T;
  serialize?: (value: T) => string;
  deserialize?: (value: string) => T;
  transform?: (value: T) => UrlStateValue; // Transform for API
}

export type FilterDefinition<T extends Record<string, UrlStateValue>> = {
  [K in keyof T]: FilterConfig<T[K]>;
};

export interface UseFiltersResult<T> {
  filters: T;
  setFilter: <K extends keyof T>(key: K, value: T[K]) => void;
  setFilters: (updates: Partial<T>) => void;
  clearFilter: <K extends keyof T>(key: K) => void;
  clearAllFilters: () => void;
  resetFilters: () => void;
  hasActiveFilters: boolean;
  activeFilterCount: number;
  getApiParams: () => Record<string, any>;
}

/**
 * Hook for managing filter state with URL synchronization
 */
export function useFilters<T extends Record<string, UrlStateValue>>(
  definition: FilterDefinition<T>
): UseFiltersResult<T> {
  // Convert definition to URL state config
  const stateConfig = useMemo(() => {
    const config: Record<keyof T, UrlStateOptions> = {} as Record<keyof T, UrlStateOptions>;

    (Object.keys(definition) as Array<keyof T>).forEach((key) => {
      const filterConfig = definition[key];
      config[key] = {
        defaultValue: filterConfig?.defaultValue,
        serialize: filterConfig?.serialize as ((value: UrlStateValue) => string) | undefined,
        deserialize: filterConfig?.deserialize as ((value: string) => UrlStateValue) | undefined,
      };
    });

    return config;
  }, [definition]);

  const [filters, setFiltersState] = useUrlStateObject<T>(stateConfig);

  const setFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      const update = { [key]: value } as unknown as Partial<Record<keyof T, UrlStateValue>>;
      setFiltersState(update as Partial<T>);
    },
    [setFiltersState]
  );

  const setFilters = useCallback(
    (updates: Partial<T>) => {
      setFiltersState(updates);
    },
    [setFiltersState]
  );

  const clearFilter = useCallback(
    <K extends keyof T>(key: K) => {
      const defaultValue = definition[key]?.defaultValue;
      const update = { [key]: defaultValue } as unknown as Partial<Record<keyof T, UrlStateValue>>;
      setFiltersState(update as Partial<T>);
    },
    [definition, setFiltersState]
  );

  const clearAllFilters = useCallback(() => {
    const resetValues: Partial<Record<keyof T, UrlStateValue>> = {};

    (Object.keys(definition) as Array<keyof T>).forEach((key) => {
      const config = definition[key];
      resetValues[key] = config?.defaultValue ?? undefined;
    });

    setFiltersState(resetValues as Partial<T>);
  }, [definition, setFiltersState]);

  const resetFilters = clearAllFilters;

  const hasActiveFilters = useMemo(() => {
    return (Object.keys(filters) as Array<keyof T>).some((key) => {
      const value = filters[key];
      const defaultValue = definition[key]?.defaultValue;
      return value !== defaultValue && value !== undefined && value !== null && value !== '';
    });
  }, [filters, definition]);

  const activeFilterCount = useMemo(() => {
    return (Object.keys(filters) as Array<keyof T>).filter((key) => {
      const value = filters[key];
      const defaultValue = definition[key]?.defaultValue;
      return value !== defaultValue && value !== undefined && value !== null && value !== '';
    }).length;
  }, [filters, definition]);

  const getApiParams = useCallback(() => {
    const params: Record<string, any> = {};

    (Object.keys(filters) as Array<keyof T>).forEach((key) => {
      const value = filters[key];
      if (value !== undefined && value !== null && value !== '') {
        const config = definition[key];
        if (config?.transform) {
          const transformed = config.transform(value as T[keyof T]);
          if (transformed !== undefined && transformed !== null) {
            params[String(key)] = transformed;
          }
        } else {
          params[String(key)] = value;
        }
      }
    });

    return params;
  }, [filters, definition]);

  return {
    filters,
    setFilter,
    setFilters,
    clearFilter,
    clearAllFilters,
    resetFilters,
    hasActiveFilters,
    activeFilterCount,
    getApiParams,
  };
}

/**
 * Pre-configured filter definitions for common use cases
 */
export const commonFilters = {
  search: {
    defaultValue: '',
    serialize: (value: UrlStateValue) => String(value || ''),
    deserialize: (value: string) => value,
  },

  dateRange: {
    start_date: {
      defaultValue: undefined,
      ...urlStateSerializers.date,
    },
    end_date: {
      defaultValue: undefined,
      ...urlStateSerializers.date,
    },
  },

  amount: {
    min_amount: {
      defaultValue: undefined,
      serialize: (value: UrlStateValue) => String(value || ''),
      deserialize: (value: string) => {
        const num = Number(value);
        return isNaN(num) ? undefined : num;
      },
      transform: (value: number | undefined) =>
        typeof value === 'number' && value > 0 ? value : undefined,
    },
    max_amount: {
      defaultValue: undefined,
      serialize: (value: UrlStateValue) => String(value || ''),
      deserialize: (value: string) => {
        const num = Number(value);
        return isNaN(num) ? undefined : num;
      },
      transform: (value: number | undefined) =>
        typeof value === 'number' && value > 0 ? value : undefined,
    },
  },

  multiSelect: (defaultValue: string[] = []) => ({
    defaultValue,
    ...urlStateSerializers.array,
  }),

  multiSelectNumbers: (defaultValue: number[] = []) => ({
    defaultValue,
    ...urlStateSerializers.numberArray,
  }),

  boolean: (defaultValue?: boolean) => ({
    defaultValue,
    ...urlStateSerializers.boolean,
  }),

  select: (defaultValue?: string) => ({
    defaultValue,
    serialize: (value: UrlStateValue) => String(value || ''),
    deserialize: (value: string) => value || undefined,
  }),
};

/**
 * Specialized hook for transaction filters
 */
export function useTransactionFilters() {
  return useFilters({
    search: commonFilters.search,
    account_ids: commonFilters.multiSelectNumbers(),
    category_ids: commonFilters.multiSelect(),
    start_date: commonFilters.dateRange.start_date,
    end_date: commonFilters.dateRange.end_date,
    min_amount: commonFilters.amount.min_amount,
    max_amount: commonFilters.amount.max_amount,
    transaction_type: commonFilters.select(),
    verified: commonFilters.boolean(),
    tags: commonFilters.multiSelect(),
    ordering: {
      defaultValue: '-date',
      serialize: (value: string) => value,
      deserialize: (value: string) => value,
    },
  });
}
