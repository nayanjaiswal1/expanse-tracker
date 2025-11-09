import { useMemo, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { computeDateRange, formatDateString } from '../utils/dateUtils';
import type { DateFilterMode } from '../utils/dateUtils';

export const useTransactionFiltersWithURL = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse array parameters from URL
  const parseArrayParam = (param: string | null): string[] => {
    if (!param) return [];
    return param.split(',').filter(Boolean);
  };

  // Read current filters from URL
  const dateFilterMode = (searchParams.get('dateMode') as DateFilterMode) || 'this-month';
  const customDateRange = {
    start: searchParams.get('startDate') || '',
    end: searchParams.get('endDate') || '',
  };
  const accountFilter = parseArrayParam(searchParams.get('accounts'));
  const categoryFilter = parseArrayParam(searchParams.get('categories'));
  const statusFilter = parseArrayParam(searchParams.get('statuses'));
  const searchQuery = searchParams.get('search') || '';
  const sortBy = searchParams.get('sortBy') || '';
  const sortDesc = searchParams.get('sortDesc') === 'true';

  const sorting = useMemo(
    () => (sortBy ? [{ id: sortBy, desc: sortDesc }] : []),
    [sortBy, sortDesc]
  );

  // Compute date range
  const computedDateRange = useMemo(
    () => computeDateRange(dateFilterMode, customDateRange),
    [dateFilterMode, customDateRange.start, customDateRange.end]
  );

  // Initialize custom date range if needed
  useEffect(() => {
    if (dateFilterMode === 'custom' && !customDateRange.start && !customDateRange.end) {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      updateFilters({
        customDateStart: formatDateString(startOfMonth),
        customDateEnd: formatDateString(today),
      });
    }
  }, [dateFilterMode]);

  // Build API query parameters
  const apiParams = useMemo(() => {
    const params: any = {};

    // Add date filters
    if (computedDateRange.startDate) {
      params.start_date = computedDateRange.startDate;
    }
    if (computedDateRange.endDate) {
      params.end_date = computedDateRange.endDate;
    }

    // Add multi-select filters
    if (accountFilter.length > 0) {
      params.account_ids = accountFilter.join(',');
    }
    if (categoryFilter.length > 0) {
      params.category_ids = categoryFilter.join(',');
    }
    if (statusFilter.length > 0) {
      params.statuses = statusFilter.join(',');
    }

    // Add search query
    if (searchQuery) {
      params.search = searchQuery;
    }

    if (sortBy) {
      params.ordering = `${sortDesc ? '-' : ''}${sortBy}`;
    }

    return params;
  }, [
    computedDateRange,
    accountFilter,
    categoryFilter,
    statusFilter,
    searchQuery,
    sortBy,
    sortDesc,
  ]);

  // Update filters in URL
  const updateFilters = useCallback(
    (updates: {
      dateFilterMode?: DateFilterMode;
      customDateStart?: string;
      customDateEnd?: string;
      accountIds?: string[];
      categoryIds?: string[];
      statuses?: string[];
      search?: string;
      sortBy?: string;
      sortDesc?: boolean;
    }) => {
      setSearchParams(
        (current) => {
          const newParams = new URLSearchParams(current);

          // Reset to page 1 when filters change (including search)
          if (Object.keys(updates).length > 0 && newParams.has('page')) {
            newParams.set('page', '1');
          }

          if (updates.dateFilterMode !== undefined) {
            if (updates.dateFilterMode) {
              newParams.set('dateMode', updates.dateFilterMode);
            } else {
              newParams.delete('dateMode');
            }
          }

          if (updates.customDateStart !== undefined) {
            if (updates.customDateStart) {
              newParams.set('startDate', updates.customDateStart);
            } else {
              newParams.delete('startDate');
            }
          }

          if (updates.customDateEnd !== undefined) {
            if (updates.customDateEnd) {
              newParams.set('endDate', updates.customDateEnd);
            } else {
              newParams.delete('endDate');
            }
          }

          if (updates.accountIds !== undefined) {
            if (updates.accountIds.length > 0) {
              newParams.set('accounts', updates.accountIds.join(','));
            } else {
              newParams.delete('accounts');
            }
          }

          if (updates.categoryIds !== undefined) {
            if (updates.categoryIds.length > 0) {
              newParams.set('categories', updates.categoryIds.join(','));
            } else {
              newParams.delete('categories');
            }
          }

          if (updates.statuses !== undefined) {
            if (updates.statuses.length > 0) {
              newParams.set('statuses', updates.statuses.join(','));
            } else {
              newParams.delete('statuses');
            }
          }

          if (updates.search !== undefined) {
            if (updates.search) {
              newParams.set('search', updates.search);
            } else {
              newParams.delete('search');
            }
          }

          if (updates.sortBy !== undefined) {
            if (updates.sortBy) {
              newParams.set('sortBy', updates.sortBy);
            } else {
              newParams.delete('sortBy');
            }
          }

          if (updates.sortDesc !== undefined) {
            if (updates.sortDesc) {
              newParams.set('sortDesc', 'true');
            } else {
              newParams.delete('sortDesc');
            }
          }

          return newParams;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  // Date filter display text
  const dateFilterDisplay = useMemo(() => {
    switch (dateFilterMode) {
      case 'this-month':
        return 'This Month';
      case 'last-month':
        return 'Last Month';
      case 'last-90-days':
        return 'Last 90 Days';
      case 'this-year':
        return 'This Year';
      case 'custom': {
        const { startDate, endDate } = computedDateRange;
        if (startDate && endDate) {
          return `${startDate} – ${endDate}`;
        }
        if (startDate) {
          return `From ${startDate}`;
        }
        if (endDate) {
          return `Through ${endDate}`;
        }
        return 'Custom Range';
      }
      case 'all-time':
        return 'All Time';
      default:
        return 'This Month';
    }
  }, [dateFilterMode, computedDateRange]);

  // Memoize setter functions
  const setDateFilterMode = useCallback(
    (mode: DateFilterMode) => updateFilters({ dateFilterMode: mode }),
    [updateFilters]
  );
  const setCustomDateRange = useCallback(
    (range: { start: string; end: string }) =>
      updateFilters({ customDateStart: range.start, customDateEnd: range.end }),
    [updateFilters]
  );
  const setAccountFilter = useCallback(
    (ids: string[]) => updateFilters({ accountIds: ids }),
    [updateFilters]
  );
  const setCategoryFilter = useCallback(
    (ids: string[]) => updateFilters({ categoryIds: ids }),
    [updateFilters]
  );
  const setStatusFilter = useCallback(
    (statuses: string[]) => updateFilters({ statuses }),
    [updateFilters]
  );
  const setSearchQuery = useCallback(
    (search: string) => updateFilters({ search }),
    [updateFilters]
  );
  const setSorting = useCallback(
    (sorting: any[]) => {
      if (sorting.length > 0) {
        updateFilters({ sortBy: sorting[0].id, sortDesc: sorting[0].desc });
      } else {
        updateFilters({ sortBy: '', sortDesc: false });
      }
    },
    [updateFilters]
  );

  return {
    // Current filter state
    dateFilterMode,
    customDateRange,
    accountFilter,
    categoryFilter,
    statusFilter,
    searchQuery,
    sorting,

    // Computed values
    dateFilterDisplay,
    computedDateRange,
    apiParams,

    // Actions
    setDateFilterMode,
    setCustomDateRange,
    setAccountFilter,
    setCategoryFilter,
    setStatusFilter,
    setSearchQuery,
    setSorting,
    clearAllFilters,
  };
};
