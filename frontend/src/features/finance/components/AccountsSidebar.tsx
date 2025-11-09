import React from 'react';
import { Button } from '../../../components/ui/Button';
import { SummaryCards } from '../../../components/ui/SummaryCards';
import { AccountFiltersPanel, type FilterOption } from './AccountFiltersBar';
import type { AccountFilters } from '../hooks/useAccountFilters';
import { FlexBetween } from '../../../components/ui/Layout';

interface AccountsSidebarProps {
  activeSidePanel: 'filters' | 'overview' | null;
  filters: AccountFilters;
  hasActiveFilters: boolean;
  overviewSummaryCards: Parameters<typeof SummaryCards>[0]['cards'];
  overviewActions: Array<{
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    variant: 'ghost' | 'primary';
  }>;
  filterOptions: {
    accountTypes: FilterOption[];
    statuses: FilterOption[];
    currencies: FilterOption[];
    institutions: FilterOption[];
  };
  filterPanelRef: React.RefObject<HTMLDivElement | null>;
  overviewPanelRef: React.RefObject<HTMLDivElement | null>;
  onTogglePanel: (panel: 'filters' | 'overview') => void;
  onFilterChange: <K extends keyof AccountFilters>(key: K, value: AccountFilters[K]) => void;
  onClearFilters: () => void;
}

export const AccountsSidebar: React.FC<AccountsSidebarProps> = ({
  activeSidePanel,
  filters,
  hasActiveFilters,
  overviewSummaryCards,
  overviewActions,
  filterOptions,
  filterPanelRef,
  overviewPanelRef,
  onTogglePanel,
  onFilterChange,
  onClearFilters,
}) => {
  return (
    <aside className="space-y-4" aria-label="Account insights">
      <div
        ref={filterPanelRef}
        className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20"
      >
        <FlexBetween>
          <div>
            <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Account filters
            </h2>
            <p className="text-xs text-blue-600/80 dark:text-blue-200/70">
              Backend filters keep this list fresh.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-900/40"
            onClick={() => onTogglePanel('filters')}
          >
            {activeSidePanel === 'filters' ? 'Hide' : 'Show'}
          </Button>
        </FlexBetween>
        {activeSidePanel === 'filters' && (
          <div className="mt-4">
            <AccountFiltersPanel
              filters={filters}
              onFilterChange={onFilterChange}
              onClear={onClearFilters}
              hasActiveFilters={hasActiveFilters}
              options={filterOptions}
            />
          </div>
        )}
      </div>

      <div
        ref={overviewPanelRef}
        className="rounded-2xl border border-blue-100 bg-white/90 p-4 shadow-sm dark:border-blue-900/40 dark:bg-blue-950/20"
      >
        <FlexBetween>
          <div>
            <h2 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Accounts overview
            </h2>
            <p className="text-xs text-blue-600/80 dark:text-blue-200/70">
              Quick metrics for your accounts.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-900/40"
            onClick={() => onTogglePanel('overview')}
          >
            {activeSidePanel === 'overview' ? 'Hide' : 'Show'}
          </Button>
        </FlexBetween>
        {activeSidePanel === 'overview' && (
          <div className="mt-4 space-y-4">
            <SummaryCards cards={overviewSummaryCards} gridClassName="grid grid-cols-1 gap-3" />
            <div className="flex flex-col gap-2">
              {overviewActions.map((action) => (
                <Button
                  key={action.id}
                  onClick={action.onClick}
                  variant={action.variant}
                  className={action.variant === 'ghost' ? 'justify-start' : ''}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
