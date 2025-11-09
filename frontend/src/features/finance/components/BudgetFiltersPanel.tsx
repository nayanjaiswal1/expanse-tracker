import React from 'react';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

interface BudgetFiltersPanelProps {
  selectedStatus: string;
  selectedPeriodType: string;
  statusOptions: Array<{ value: string; label: string }>;
  periodTypeOptions: Array<{ value: string; label: string }>;
  onStatusChange: (value: string) => void;
  onPeriodTypeChange: (value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export const BudgetFiltersPanel: React.FC<BudgetFiltersPanelProps> = ({
  selectedStatus,
  selectedPeriodType,
  statusOptions,
  periodTypeOptions,
  onStatusChange,
  onPeriodTypeChange,
  onClear,
  hasActiveFilters,
}) => {
  return (
    <div className="space-y-4">
      <Select
        label="Status"
        options={statusOptions}
        value={selectedStatus}
        onChange={(value) => onStatusChange((value as string) || 'all')}
        placeholder="All statuses"
      />

      <Select
        label="Period"
        options={periodTypeOptions}
        value={selectedPeriodType}
        onChange={(value) => onPeriodTypeChange((value as string) || 'all')}
        placeholder="All periods"
      />

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

export default BudgetFiltersPanel;
