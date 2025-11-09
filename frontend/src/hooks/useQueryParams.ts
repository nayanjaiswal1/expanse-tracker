import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Generic hook for managing API query parameters in URL
 * Handles: pagination, search, sorting, and filters
 */

export interface QueryParamsConfig {
  // Pagination
  page?: number;
  pageSize?: number;

  // Search
  search?: string;

  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';

  // Custom filters (key-value pairs)
  filters?: Record<string, any>;
}

export interface QueryParamsReturn {
  // Current state
  page: number;
  pageSize: number;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  ordering: string; // Combined sort (e.g., "-created_at")
  filters: Record<string, any>;

  // All params as object (for API calls)
  allParams: Record<string, any>;

  // Setters
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setSearch: (search: string) => void;
  setSortBy: (field: string) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setSort: (field: string, order?: 'asc' | 'desc') => void;
  setFilter: (key: string, value: any) => void;
  setFilters: (filters: Record<string, any>) => void;
  updateParams: (updates: Partial<QueryParamsConfig>) => void;

  // Clearers
  clearSearch: () => void;
  clearFilters: () => void;
  clearSort: () => void;
  clearAll: () => void;

  // Utilities
  resetPage: () => void; // Reset to page 1
}

/**
 * Parse value from URL parameter
 */
function parseValue(value: string | null, defaultValue: any): any {
  if (value === null || value === undefined) {
    return defaultValue;
  }

  // Array (comma-separated)
  if (Array.isArray(defaultValue)) {
    return value ? value.split(',').filter(Boolean) : [];
  }

  // Boolean
  if (typeof defaultValue === 'boolean') {
    return value === 'true';
  }

  // Number
  if (typeof defaultValue === 'number') {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }

  // String
  return value;
}

/**
 * Serialize value to URL parameter
 */
function serializeValue(value: any): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(',') : null;
  }

  if (typeof value === 'boolean') {
    return value.toString();
  }

  if (typeof value === 'number') {
    return value.toString();
  }

  if (typeof value === 'string') {
    return value || null;
  }

  return String(value);
}

/**
 * Main hook
 */
export function useQueryParams(defaults: QueryParamsConfig = {}): QueryParamsReturn {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse core params
  const page = parseValue(searchParams.get('page'), defaults.page ?? 1);
  const pageSize = parseValue(searchParams.get('pageSize'), defaults.pageSize ?? 20);
  const search = parseValue(searchParams.get('search'), defaults.search ?? '');
  const sortBy = parseValue(searchParams.get('sortBy'), defaults.sortBy ?? '');
  const sortOrder = parseValue(searchParams.get('sortOrder'), defaults.sortOrder ?? 'desc');

  // Parse filter params (everything except core params)
  const filters = useMemo(() => {
    const coreParams = ['page', 'pageSize', 'search', 'sortBy', 'sortOrder'];
    const filterObj: Record<string, any> = {};

    for (const [key, value] of searchParams.entries()) {
      if (!coreParams.includes(key)) {
        // Check if it's a comma-separated array
        if (value.includes(',')) {
          filterObj[key] = value.split(',').filter(Boolean);
        } else {
          filterObj[key] = value;
        }
      }
    }

    return { ...defaults.filters, ...filterObj };
  }, [searchParams, defaults.filters]);

  // Build ordering string for API (e.g., "-created_at" or "name")
  const ordering = useMemo(() => {
    if (!sortBy) return '';
    return sortOrder === 'desc' ? `-${sortBy}` : sortBy;
  }, [sortBy, sortOrder]);

  // Build all params object for API calls
  const allParams = useMemo(() => {
    const params: Record<string, any> = {
      page,
      pageSize,
    };

    if (search) params.search = search;
    if (ordering) params.ordering = ordering;

    // Add all filters
    Object.entries(filters).forEach(([key, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        value !== '' &&
        (!Array.isArray(value) || value.length > 0)
      ) {
        params[key] = value;
      }
    });

    return params;
  }, [page, pageSize, search, ordering, filters]);

  // Update URL params helper
  const updateURL = useCallback(
    (updates: Record<string, any>) => {
      const newParams = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        const serialized = serializeValue(value);
        if (serialized === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, serialized);
        }
      });

      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Setters
  const setPage = useCallback((newPage: number) => updateURL({ page: newPage }), [updateURL]);

  const setPageSize = useCallback(
    (size: number) => updateURL({ pageSize: size, page: 1 }),
    [updateURL]
  );

  const setSearch = useCallback(
    (newSearch: string) => updateURL({ search: newSearch, page: 1 }),
    [updateURL]
  );

  const setSortBy = useCallback(
    (field: string) => updateURL({ sortBy: field, page: 1 }),
    [updateURL]
  );

  const setSortOrder = useCallback(
    (order: 'asc' | 'desc') => updateURL({ sortOrder: order, page: 1 }),
    [updateURL]
  );

  const setSort = useCallback(
    (field: string, order: 'asc' | 'desc' = 'desc') =>
      updateURL({ sortBy: field, sortOrder: order, page: 1 }),
    [updateURL]
  );

  const setFilter = useCallback(
    (key: string, value: any) => {
      updateURL({ [key]: value, page: 1 });
    },
    [updateURL]
  );

  const setFilters = useCallback(
    (newFilters: Record<string, any>) => {
      const coreParams = { page, pageSize, search, sortBy, sortOrder };

      const newParams = new URLSearchParams();

      // Add core params
      Object.entries(coreParams).forEach(([key, value]) => {
        const serialized = serializeValue(value);
        if (serialized !== null) {
          newParams.set(key, serialized);
        }
      });

      // Add new filters
      Object.entries(newFilters).forEach(([key, value]) => {
        const serialized = serializeValue(value);
        if (serialized !== null) {
          newParams.set(key, serialized);
        }
      });

      newParams.set('page', '1');
      setSearchParams(newParams, { replace: true });
    },
    [page, pageSize, search, sortBy, sortOrder, setSearchParams]
  );

  const updateParams = useCallback(
    (updates: Partial<QueryParamsConfig>) => {
      const urlUpdates: Record<string, any> = {};

      if (updates.page !== undefined) urlUpdates.page = updates.page;
      if (updates.pageSize !== undefined) urlUpdates.pageSize = updates.pageSize;
      if (updates.search !== undefined) urlUpdates.search = updates.search;
      if (updates.sortBy !== undefined) urlUpdates.sortBy = updates.sortBy;
      if (updates.sortOrder !== undefined) urlUpdates.sortOrder = updates.sortOrder;
      if (updates.filters) {
        Object.assign(urlUpdates, updates.filters);
      }

      updateURL(urlUpdates);
    },
    [updateURL]
  );

  // Clearers
  const clearSearch = useCallback(() => updateURL({ search: null }), [updateURL]);

  const clearSort = useCallback(() => updateURL({ sortBy: null, sortOrder: null }), [updateURL]);

  const clearFilters = useCallback(() => {
    const newParams = new URLSearchParams();

    // Keep core params only
    if (page !== defaults.page) newParams.set('page', String(page));
    if (pageSize !== defaults.pageSize) newParams.set('pageSize', String(pageSize));
    if (search) newParams.set('search', search);
    if (sortBy) newParams.set('sortBy', sortBy);
    if (sortOrder && sortOrder !== defaults.sortOrder) newParams.set('sortOrder', sortOrder);

    setSearchParams(newParams, { replace: true });
  }, [page, pageSize, search, sortBy, sortOrder, defaults, setSearchParams]);

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const resetPage = useCallback(() => updateURL({ page: 1 }), [updateURL]);

  return {
    // State
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    ordering,
    filters,
    allParams,

    // Setters
    setPage,
    setPageSize,
    setSearch,
    setSortBy,
    setSortOrder,
    setSort,
    setFilter,
    setFilters,
    updateParams,

    // Clearers
    clearSearch,
    clearFilters,
    clearSort,
    clearAll,

    // Utilities
    resetPage,
  };
}

/**
 * Example usage:
 *
 * const {
 *   page,
 *   search,
 *   filters,
 *   allParams,
 *   setPage,
 *   setSearch,
 *   setFilter,
 *   clearFilters
 * } = useQueryParams({
 *   page: 1,
 *   pageSize: 20,
 *   sortBy: 'created_at',
 *   sortOrder: 'desc'
 * });
 *
 * // Use in API call
 * const { data } = useQuery(['items', allParams], () => api.getItems(allParams));
 *
 * // Update filters
 * setFilter('status', 'active');
 * setFilter('categories', ['food', 'transport']);
 */
