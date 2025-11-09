import { useMemo } from 'react';
import { useQueryParams } from '../../../hooks/useQueryParams';
import { computeDateRange, getDateFilterDisplay, formatDateString } from '../utils/dateUtils';
import type { DateFilterMode } from '../utils/dateUtils';
import { useEffect } from 'react';

/**
 * Specialized hook for transaction filtering with URL state management
 * Extends the generic useQueryParams with transaction-specific logic
 */
export function useTransactionQueryParams() {
  const { filters, setFilter, setFilters, clearFilters, allParams, ...queryParams } =
    useQueryParams({
      page: 1,
      pageSize: 50,
      sortBy: 'date',
      sortOrder: 'desc',
    });

  // Parse transaction-specific filters from URL
  const dateFilterMode = (filters.dateMode as DateFilterMode) || 'this-month';
  const customDateRange = {
    start: (filters.startDate as string) || '',
    end: (filters.endDate as string) || '',
  };
  const accountIds = Array.isArray(filters.accounts)
    ? filters.accounts
    : filters.accounts
      ? [filters.accounts]
      : [];
  const categoryIds = Array.isArray(filters.categories)
    ? filters.categories
    : filters.categories
      ? [filters.categories]
      : [];
  const statuses = Array.isArray(filters.statuses)
    ? filters.statuses
    : filters.statuses
      ? [filters.statuses]
      : [];

  // Compute date range based on mode
  const computedDateRange = useMemo(
    () => computeDateRange(dateFilterMode, customDateRange),
    [dateFilterMode, customDateRange.start, customDateRange.end]
  );

  // Initialize custom date range if needed
  useEffect(() => {
    if (dateFilterMode === 'custom' && !customDateRange.start && !customDateRange.end) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setFilters({
        dateMode: 'custom',
        startDate: formatDateString(startOfMonth),
        endDate: formatDateString(today),
      });
    }
  }, [dateFilterMode]);

  // Build API parameters with transaction-specific filters
  const apiParams = useMemo(() => {
    const params: Record<string, any> = {
      ...allParams,
    };

    // Remove UI-only params
    delete params.dateMode;

    // Add computed date filters
    if (computedDateRange.startDate) {
      params.start_date = computedDateRange.startDate;
      delete params.startDate;
    }
    if (computedDateRange.endDate) {
      params.end_date = computedDateRange.endDate;
      delete params.endDate;
    }

    // Transform filter keys for backend
    if (accountIds.length > 0) {
      params.account_ids = accountIds.join(',');
      delete params.accounts;
    }
    if (categoryIds.length > 0) {
      params.category_ids = categoryIds.join(',');
      delete params.categories;
    }
    if (statuses.length > 0) {
      params.statuses = statuses.join(',');
    }

    // Remove limit in favor of backend pagination
    delete params.pageSize;
    params.limit = allParams.pageSize || 50;

    return params;
  }, [allParams, computedDateRange, accountIds, categoryIds, statuses]);

  // Date filter display text
  const dateFilterDisplay = useMemo(
    () => getDateFilterDisplay(dateFilterMode, computedDateRange),
    [dateFilterMode, computedDateRange]
  );

  // Transaction-specific setters
  const setDateFilterMode = (mode: DateFilterMode) => {
    if (mode === 'custom') {
      // Keep existing custom dates if switching to custom
      setFilter('dateMode', mode);
    } else {
      // Clear custom dates when switching away from custom
      setFilters({
        dateMode: mode,
        startDate: null,
        endDate: null,
      });
    }
  };

  const setCustomDateRange = (range: { start: string; end: string }) => {
    setFilters({
      dateMode: 'custom',
      startDate: range.start,
      endDate: range.end,
    });
  };

  const setAccountFilter = (ids: string[]) => {
    setFilter('accounts', ids.length > 0 ? ids : null);
  };

  const setCategoryFilter = (ids: string[]) => {
    setFilter('categories', ids.length > 0 ? ids : null);
  };

  const setStatusFilter = (statuses: string[]) => {
    setFilter('statuses', statuses.length > 0 ? statuses : null);
  };

  return {
    // Generic query params
    ...queryParams,

    // Transaction-specific state
    dateFilterMode,
    customDateRange,
    accountIds,
    categoryIds,
    statuses,

    // Computed values
    dateFilterDisplay,
    computedDateRange,

    // API params (ready to send to backend)
    apiParams,

    // Transaction-specific setters
    setDateFilterMode,
    setCustomDateRange,
    setAccountFilter,
    setCategoryFilter,
    setStatusFilter,

    // Generic setters (re-exported for convenience)
    setFilter,
    setFilters,
    clearFilters,
  };
}

/**
 * Example usage:
 *
 * const {
 *   // Query state
 *   page,
 *   search,
 *   accountIds,
 *   dateFilterMode,
 *   apiParams,
 *
 *   // Setters
 *   setPage,
 *   setSearch,
 *   setAccountFilter,
 *   setDateFilterMode,
 *
 *   // Clearers
 *   clearFilters
 * } = useTransactionQueryParams();
 *
 * // Use in API call
 * const { data } = useTransactions(apiParams);
 *
 * // Update filters
 * setAccountFilter(['1', '2', '3']);
 * setDateFilterMode('last-month');
 */
