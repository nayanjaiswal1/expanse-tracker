import React from 'react';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import type { AccountFilters } from '../hooks/useAccountFilters';

export interface FilterOption {
  value: string;
  label: string;
}

interface AccountFiltersPanelProps {
  filters: AccountFilters;
  onFilterChange: <K extends keyof AccountFilters>(key: K, value: AccountFilters[K]) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
  options: {
    accountTypes: FilterOption[];
    statuses: FilterOption[];
    currencies: FilterOption[];
    institutions: FilterOption[];
  };
}

export const AccountFiltersPanel: React.FC<AccountFiltersPanelProps> = ({
  filters,
  onFilterChange,
  onClear,
  hasActiveFilters,
  options,
}) => {
  const { accountTypes, statuses, currencies, institutions } = options;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4">
        <Select
          label="Account type"
          options={accountTypes}
          value={filters.account_type ?? ''}
          onChange={(value) =>
            onFilterChange('account_type', (value || undefined) as AccountFilters['account_type'])
          }
          placeholder="All account types"
        />

        <Select
          label="Status"
          options={[{ value: 'all', label: 'All statuses' }, ...statuses]}
          value={filters.status ?? 'all'}
          onChange={(value) =>
            onFilterChange('status', ((value as string) || 'all') as AccountFilters['status'])
          }
          placeholder="All statuses"
        />

        <Select
          label="Currency"
          options={currencies}
          value={filters.currency ?? ''}
          onChange={(value) =>
            onFilterChange('currency', (value || undefined) as AccountFilters['currency'])
          }
          placeholder="All currencies"
        />

        <Select
          label="Institution"
          options={institutions}
          value={filters.institution ?? ''}
          onChange={(value) =>
            onFilterChange('institution', (value || undefined) as AccountFilters['institution'])
          }
          placeholder="All institutions"
        />
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-center"
          onClick={onClear}
          disabled={!hasActiveFilters}
        >
          Clear filters
        </Button>
      </div>
    </div>
  );
};

export default AccountFiltersPanel;
