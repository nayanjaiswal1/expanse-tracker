import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useURLQueryParams } from './useURLQueryParams';

/**
 * Generic hook for paginated API requests with URL-based state
 * Handles pagination, filtering, searching, and sorting from URL params
 *
 * @example
 * const { data, isLoading, error, pageInfo } = usePaginatedAPI({
 *   url: '/api/transactions',
 *   filters: { search: 'coffee', status: 'active' },
 *   pageKey: 'page',
 *   pageSizeKey: 'page_size'
 * });
 */

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  results: T[];
}

export interface PaginationInfo {
  currentPage: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface UsePaginatedAPIConfig<T = any> {
  url: string;
  filters?: Record<string, string | number | boolean | null | undefined>;
  pageKey?: string;
  pageSizeKey?: string;
  orderingKey?: string;
  enabled?: boolean;
  queryOptions?: Omit<UseQueryOptions<PaginatedResponse<T>>, 'queryKey' | 'queryFn'>;
}

/**
 * Builds query string from filters and pagination params
 */
function buildQueryString(
  filters: Record<string, any> = {},
  page: number = 1,
  pageSize: number = 50,
  pageKey: string = 'page',
  pageSizeKey: string = 'page_size'
): string {
  const params = new URLSearchParams();

  // Add page and page_size
  params.append(pageKey, String(page));
  params.append(pageSizeKey, String(pageSize));

  // Add filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, String(value));
    }
  });

  return params.toString();
}

export function usePaginatedAPI<T = any>({
  url,
  filters = {},
  pageKey = 'page',
  pageSizeKey = 'page_size',
  orderingKey = 'ordering',
  enabled = true,
  queryOptions = {},
}: UsePaginatedAPIConfig<T>) {
  // Get page and page_size from URL
  const { getParam } = useURLQueryParams({
    defaults: { [pageKey]: '1', [pageSizeKey]: '50' },
  });

  const currentPage = parseInt(getParam(pageKey, '1') || '1', 10);
  const pageSize = parseInt(getParam(pageSizeKey, '50') || '50', 10);

  // Combine URL filters with provided filters
  const allFilters = {
    ...filters,
  };

  // Add ordering if present in URL
  const ordering = getParam(orderingKey);
  if (ordering) {
    allFilters[orderingKey] = ordering;
  }

  // Build query string
  const queryString = buildQueryString(allFilters, currentPage, pageSize, pageKey, pageSizeKey);

  const fullUrl = `${url}?${queryString}`;

  // Fetch data using react-query
  const { data, isLoading, error, refetch } = useQuery<PaginatedResponse<T>>({
    queryKey: [url, currentPage, pageSize, allFilters],
    queryFn: async () => {
      const response = await fetch(fullUrl, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      return response.json();
    },
    enabled: enabled && !!url,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...queryOptions,
  });

  // Extract pagination info
  const pageInfo: PaginationInfo = {
    currentPage: data?.page || currentPage,
    pageSize: data?.page_size || pageSize,
    totalPages: data?.total_pages || 0,
    totalCount: data?.count || 0,
    hasNext: data?.has_next || false,
    hasPrevious: data?.has_previous || false,
  };

  // Refetch with new parameters
  const goToPage = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    data: data?.results || [],
    isLoading,
    error,
    pageInfo,
    rawData: data,
    refetch,
    goToPage,
    currentPage,
    pageSize,
  };
}

export default usePaginatedAPI;
