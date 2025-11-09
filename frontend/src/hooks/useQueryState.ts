import { useMemo } from 'react';
import { usePagination, type PaginationConfig } from './usePagination';
import { useFilters, type FilterDefinition, type UseFiltersResult } from './useFilters';
import { useSearch, type SearchConfig, type UseSearchResult } from './useSearch';
import { type UrlStateValue } from './useUrlState';

export interface QueryStateConfig<T extends Record<string, UrlStateValue>> {
  pagination?: PaginationConfig;
  search?: SearchConfig;
  filters?: FilterDefinition<T>;
}

export interface QueryState<T extends Record<string, UrlStateValue>> {
  pagination: ReturnType<typeof usePagination>;
  search: UseSearchResult;
  filters: UseFiltersResult<T>;
  apiParams: Record<string, any>;
  hasActiveQuery: boolean;
  resetAll: () => void;
}

/**
 * Unified hook that combines pagination, search, and filters with URL state management
 * This is the main hook you should use for data tables and lists
 */
export function useQueryState<T extends Record<string, UrlStateValue>>(
  config: QueryStateConfig<T> = {},
  totalCount = 0
): QueryState<T> {
  const { pagination: paginationConfig, search: searchConfig, filters: filterDefinition } = config;

  // Initialize individual hooks
  const pagination = usePagination({
    totalCount,
    config: paginationConfig,
  });

  const search = useSearch(searchConfig);

  const filters = useFilters<T>(filterDefinition ?? ({} as FilterDefinition<T>));

  // Combine all parameters for API calls
  const apiParams = useMemo(() => {
    const params: Record<string, any> = {
      // Pagination
      page: pagination.page,
      page_size: pagination.pageSize,

      // Search
      ...(search.debouncedSearch && { search: search.debouncedSearch }),

      // Filters
      ...filters.getApiParams(),
    };

    // Remove undefined/null values
    Object.keys(params).forEach((key) => {
      if (params[key] === undefined || params[key] === null || params[key] === '') {
        delete params[key];
      }
    });

    return params;
  }, [pagination.page, pagination.pageSize, search.debouncedSearch, filters]);

  const hasActiveQuery = useMemo(() => {
    return search.hasSearch || filters.hasActiveFilters || pagination.page > 1;
  }, [search.hasSearch, filters.hasActiveFilters, pagination.page]);

  const resetAll = () => {
    search.clearSearch();
    filters.clearAllFilters();
    pagination.resetPagination();
  };

  return {
    pagination,
    search,
    filters,
    apiParams,
    hasActiveQuery,
    resetAll,
  };
}

/**
 * Pre-configured query state for transactions
 */
export function useTransactionQueryState(totalCount = 0) {
  return useQueryState(
    {
      pagination: {
        defaultPageSize: 20,
        pageSizeOptions: [10, 20, 50, 100],
      },
      search: {
        debounceMs: 500,
        placeholder: 'Search transactions...',
        resetPageOnSearch: true,
      },
      filters: {
        account_ids: {
          defaultValue: [],
          serialize: (value: number[]) => value.join(','),
          deserialize: (value: string) => (value ? value.split(',').map(Number) : []),
        },
        category_ids: {
          defaultValue: [],
          serialize: (value: string[]) => value.join(','),
          deserialize: (value: string) => (value ? value.split(',') : []),
        },
        start_date: {
          defaultValue: undefined,
          serialize: (value: string | undefined) => value || '',
          deserialize: (value: string) => value || undefined,
        },
        end_date: {
          defaultValue: undefined,
          serialize: (value: string | undefined) => value || '',
          deserialize: (value: string) => value || undefined,
        },
        transaction_type: {
          defaultValue: undefined,
          serialize: (value: string | undefined) => value || '',
          deserialize: (value: string) => value || undefined,
        },
        verified: {
          defaultValue: undefined,
          serialize: (value: boolean | undefined) => (value ? 'true' : 'false'),
          deserialize: (value: string) =>
            value === 'true' ? true : value === 'false' ? false : undefined,
        },
        ordering: {
          defaultValue: '-date',
          serialize: (value: string) => value,
          deserialize: (value: string) => value,
        },
      },
    },
    totalCount
  );
}

/**
 * Lightweight hook for simple lists that only need pagination
 */
export function usePaginatedQuery(totalCount = 0, config: PaginationConfig = {}) {
  const pagination = usePagination({ totalCount, config });

  const apiParams = useMemo(
    () => ({
      page: pagination.page,
      page_size: pagination.pageSize,
    }),
    [pagination.page, pagination.pageSize]
  );

  return {
    pagination,
    apiParams,
    hasActiveQuery: pagination.page > 1,
    resetAll: pagination.resetPagination,
  };
}

/**
 * Hook for search-only interfaces
 */
export function useSearchQuery(config: SearchConfig = {}) {
  const search = useSearch(config);

  const apiParams = useMemo(
    () => ({
      ...(search.debouncedSearch && { search: search.debouncedSearch }),
    }),
    [search.debouncedSearch]
  );

  return {
    search,
    apiParams,
    hasActiveQuery: search.hasSearch,
    resetAll: search.clearSearch,
  };
}
