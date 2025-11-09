import React from 'react';
import { useAccountFilters, type AccountFilters } from '../hooks/useAccountFilters';
import type { Account } from '../../../types';
import { accountTypeOptions, accountStatusOptions } from '../constants/accountConstants';
import { type FilterOption as FilterSelectOption } from './AccountFiltersBar';

interface AccountFiltersManagerProps {
  accounts: Account[];
  currencies: Array<{ code: string; name: string }>;
  children: (props: {
    filters: AccountFilters;
    setFilter: <K extends keyof AccountFilters>(key: K, value: AccountFilters[K]) => void;
    clearAllFilters: () => void;
    hasActiveFilters: boolean;
    apiFilters: Record<string, string>;
    appliedFilterChips: Array<{ key: keyof AccountFilters; label: string }>;
    filterOptions: {
      accountTypes: FilterSelectOption[];
      statuses: FilterSelectOption[];
      currencies: FilterSelectOption[];
      institutions: FilterSelectOption[];
    };
    updateFilter: <K extends keyof AccountFilters>(key: K, value: AccountFilters[K]) => void;
    handleFilterChipRemove: (key: keyof AccountFilters) => void;
  }) => React.ReactNode;
}

export const AccountFiltersManager: React.FC<AccountFiltersManagerProps> = ({
  accounts,
  currencies,
  children,
}) => {
  const { filters, setFilter, clearAllFilters, hasActiveFilters } = useAccountFilters();

  // Build API filters from URL params
  const apiFilters = React.useMemo(() => {
    const params: Record<string, string> = {};
    if (filters.search) params.search = filters.search;
    if (filters.status && filters.status !== 'all') params.status = filters.status;
    if (filters.account_type) params.account_type = filters.account_type;
    if (filters.currency) params.currency = filters.currency;
    if (filters.institution) params.institution = filters.institution;
    return params;
  }, [filters]);

  const currencyOptions = React.useMemo<FilterSelectOption[]>(
    () =>
      currencies.map((currency) => ({
        value: currency.code,
        label: `${currency.code} · ${currency.name}`,
      })),
    [currencies]
  );

  const institutionOptions = React.useMemo<FilterSelectOption[]>(() => {
    const unique = new Set(
      accounts
        .map((account) => account.institution?.trim())
        .filter((institution): institution is string => Boolean(institution))
    );

    const options = Array.from(unique)
      .sort((a, b) => a.localeCompare(b))
      .map((institution) => ({
        value: institution,
        label: institution,
      }));

    return options;
  }, [accounts]);

  const updateFilter = React.useCallback(
    <K extends keyof AccountFilters>(key: K, value: AccountFilters[K]) => {
      const normalized =
        typeof value === 'string' && value.trim() === '' ? (undefined as AccountFilters[K]) : value;
      setFilter(key, normalized);
    },
    [setFilter]
  );

  const appliedFilterChips = React.useMemo(() => {
    const chips: Array<{ key: keyof AccountFilters; label: string }> = [];

    if (filters.search && filters.search.trim()) {
      chips.push({ key: 'search', label: `Search: ${filters.search.trim()}` });
    }

    if (filters.account_type) {
      const match = accountTypeOptions.find((option) => option.value === filters.account_type);
      chips.push({ key: 'account_type', label: match?.label || `Type: ${filters.account_type}` });
    }

    if (filters.status && filters.status !== 'all') {
      const match = accountStatusOptions.find((option) => option.value === filters.status);
      chips.push({ key: 'status', label: match?.label || `Status: ${filters.status}` });
    }

    if (filters.currency) {
      const match = currencyOptions.find((option) => option.value === filters.currency);
      chips.push({ key: 'currency', label: match?.label || `Currency: ${filters.currency}` });
    }

    if (filters.institution) {
      chips.push({ key: 'institution', label: filters.institution });
    }

    return chips;
  }, [currencyOptions, filters]);

  const handleFilterChipRemove = React.useCallback(
    (key: keyof AccountFilters) => {
      if (key === 'status') {
        setFilter('status', 'all');
      } else if (key === 'search') {
        setFilter('search', '');
      } else {
        setFilter(key, undefined as AccountFilters[typeof key]);
      }
    },
    [setFilter]
  );

  const filterOptions = React.useMemo(
    () => ({
      accountTypes: accountTypeOptions,
      statuses: accountStatusOptions,
      currencies: currencyOptions,
      institutions: institutionOptions,
    }),
    [currencyOptions, institutionOptions]
  );

  return (
    <>
      {children({
        filters,
        setFilter,
        clearAllFilters,
        hasActiveFilters,
        apiFilters,
        appliedFilterChips,
        filterOptions,
        updateFilter,
        handleFilterChipRemove,
      })}
    </>
  );
};
