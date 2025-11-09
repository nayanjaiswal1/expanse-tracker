import React from 'react';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { PageToolbar } from '../../../components/layout/PageToolbar';
import { Button } from '../../../components/ui/Button';
import { FilterChips } from './FilterChips';
import type { AccountFilters } from '../hooks/useAccountFilters';

interface AccountManagementHeaderProps {
  searchValue: string;
  showBalances: boolean;
  appliedFilterChips: Array<{ key: keyof AccountFilters; label: string }>;
  onSearchChange: (value: string) => void;
  onFilterClick: () => void;
  onOverviewClick: () => void;
  onToggleBalances: () => void;
  onAddAccount: () => void;
  onRemoveFilterChip: (key: keyof AccountFilters) => void;
  onClearAllFilters: () => void;
}

export const AccountManagementHeader: React.FC<AccountManagementHeaderProps> = ({
  searchValue,
  showBalances,
  appliedFilterChips,
  onSearchChange,
  onFilterClick,
  onOverviewClick,
  onToggleBalances,
  onAddAccount,
  onRemoveFilterChip,
  onClearAllFilters,
}) => {
  return (
    <>
      <PageToolbar
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        onFilterClick={onFilterClick}
        onOverviewClick={onOverviewClick}
        searchPlaceholder="Search accounts"
        actions={
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-900/30 h-10 w-10 !p-0"
              onClick={onToggleBalances}
              title={showBalances ? 'Hide amounts' : 'Show amounts'}
            >
              {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
              onClick={onAddAccount}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add account
            </Button>
          </>
        }
      />

      <FilterChips
        chips={appliedFilterChips}
        onRemoveChip={onRemoveFilterChip}
        onClearAll={onClearAllFilters}
      />
    </>
  );
};
