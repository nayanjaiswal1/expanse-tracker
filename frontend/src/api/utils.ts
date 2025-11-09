/**
 * Utility functions for API parameter handling
 */

/**
 * Converts an object to URLSearchParams, handling arrays and nested objects
 */
export function buildUrlParams(params: Record<string, any>): URLSearchParams {
  const urlParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        // Handle arrays by joining with commas for backend compatibility
        if (value.length > 0) {
          const filtered = value.filter((v) => v !== undefined && v !== null && v !== '');
          if (filtered.length > 0) {
            urlParams.append(key, filtered.join(','));
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested objects by flattening
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          if (nestedValue !== undefined && nestedValue !== null && nestedValue !== '') {
            urlParams.append(`${key}.${nestedKey}`, nestedValue.toString());
          }
        });
      } else {
        urlParams.append(key, value.toString());
      }
    }
  });

  return urlParams;
}

/**
 * Builds query string from parameters object
 */
export function buildQueryString(params: Record<string, any>): string {
  const urlParams = buildUrlParams(params);
  const queryString = urlParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Sanitizes parameters by removing empty values
 */
export function sanitizeParams(params: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        const filteredArray = value.filter((v) => v !== undefined && v !== null && v !== '');
        if (filteredArray.length > 0) {
          sanitized[key] = filteredArray;
        }
      } else if (typeof value === 'object' && value !== null) {
        const nestedSanitized = sanitizeParams(value);
        if (Object.keys(nestedSanitized).length > 0) {
          sanitized[key] = nestedSanitized;
        }
      } else {
        sanitized[key] = value;
      }
    }
  });

  return sanitized;
}

/**
 * Enhanced API parameter builder that combines pagination, search, and filters
 */
export function buildApiParams(queryState: {
  pagination?: { page: number; pageSize: number };
  search?: { debouncedSearch: string };
  filters?: Record<string, any>;
  additionalParams?: Record<string, any>;
}): Record<string, any> {
  const { pagination, search, filters, additionalParams } = queryState;

  const params: Record<string, any> = {
    // Add pagination
    ...(pagination && {
      page: pagination.page,
      page_size: pagination.pageSize,
    }),

    // Add search
    ...(search?.debouncedSearch && {
      search: search.debouncedSearch,
    }),

    // Add filters
    ...(filters && sanitizeParams(filters)),

    // Add any additional parameters
    ...(additionalParams && sanitizeParams(additionalParams)),
  };

  return sanitizeParams(params);
}

/**
 * Type-safe parameter builder for specific API endpoints
 */
export interface PaginatedApiParams {
  page?: number;
  page_size?: number;
  ordering?: string;
}

export interface SearchableApiParams extends PaginatedApiParams {
  search?: string;
}

export interface FilterableApiParams extends SearchableApiParams {
  [key: string]: any;
}

/**
 * Builds parameters for list endpoints with common patterns
 */
export function buildListParams<T extends FilterableApiParams>(
  params: T,
  defaults: Partial<T> = {}
): T {
  const mergedParams = {
    page: 1,
    page_size: 20,
    ...defaults,
    ...params,
  } as T;

  return sanitizeParams(mergedParams) as T;
}

/**
 * Builds parameters specifically for transaction endpoints
 */
export interface TransactionApiParams extends FilterableApiParams {
  account_ids?: number[];
  category_ids?: string[];
  start_date?: string;
  end_date?: string;
  min_amount?: string;
  max_amount?: string;
  transaction_type?:
    | 'income'
    | 'expense'
    | 'transfer'
    | 'buy'
    | 'sell'
    | 'dividend'
    | 'lend'
    | 'borrow'
    | 'repayment';
  verified?: boolean;
  tags?: string[];
  upload_session?: number;
}

export function buildTransactionParams(params: TransactionApiParams): TransactionApiParams {
  return buildListParams(params, {
    ordering: '-date',
  });
}

/**
 * URL state synchronization utilities
 */
export function getParamsFromUrl(searchParams: URLSearchParams): Record<string, any> {
  const params: Record<string, any> = {};

  for (const [key, value] of searchParams.entries()) {
    if (params[key]) {
      // Handle multiple values for the same key
      if (Array.isArray(params[key])) {
        params[key].push(value);
      } else {
        params[key] = [params[key], value];
      }
    } else {
      params[key] = value;
    }
  }

  return params;
}

export function setParamsToUrl(
  params: Record<string, any>,
  setSearchParams: (params: URLSearchParams) => void
): void {
  const urlParams = buildUrlParams(params);
  setSearchParams(urlParams);
}

/**
 * Debounced parameter updates for performance
 */
let debounceTimeout: ReturnType<typeof setTimeout> | undefined;

export function debouncedParamUpdate(
  params: Record<string, any>,
  setSearchParams: (params: URLSearchParams) => void,
  delay = 500
): void {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }
  debounceTimeout = setTimeout(() => {
    setParamsToUrl(params, setSearchParams);
  }, delay);
}
