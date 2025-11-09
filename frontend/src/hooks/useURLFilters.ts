import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

interface URLFiltersState {
  dateFilterMode: string;
  customDateStart: string;
  customDateEnd: string;
  accountIds: string[];
  categoryIds: string[];
  statuses: string[];
  search: string;
}

export const useURLFilters = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const parseArrayParam = (param: string | null): string[] => {
    if (!param) return [];
    return param.split(',').filter(Boolean);
  };

  // Read filters from URL
  const filters: URLFiltersState = {
    dateFilterMode: searchParams.get('dateMode') || 'this-month',
    customDateStart: searchParams.get('startDate') || '',
    customDateEnd: searchParams.get('endDate') || '',
    accountIds: parseArrayParam(searchParams.get('accounts')),
    categoryIds: parseArrayParam(searchParams.get('categories')),
    statuses: parseArrayParam(searchParams.get('statuses')),
    search: searchParams.get('search') || '',
  };

  // Update URL params
  const updateFilters = useCallback(
    (updates: Partial<URLFiltersState>) => {
      const newParams = new URLSearchParams(searchParams);

      // Update each filter
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

      setSearchParams(newParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  return {
    filters,
    updateFilters,
    clearAllFilters,
  };
};
