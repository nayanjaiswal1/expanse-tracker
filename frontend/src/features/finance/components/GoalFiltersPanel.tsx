import React from 'react';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';

interface GoalFiltersPanelProps {
  selectedGoalType?: string;
  selectedStatus?: string;
  goalTypeOptions: Array<{ value: string; label: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  onGoalTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onClear: () => void;
  hasActiveFilters: boolean;
}

export const GoalFiltersPanel: React.FC<GoalFiltersPanelProps> = ({
  selectedGoalType,
  selectedStatus,
  goalTypeOptions,
  statusOptions,
  onGoalTypeChange,
  onStatusChange,
  onClear,
  hasActiveFilters,
}) => {
  return (
    <div className="space-y-4">
      <Select
        label="Goal type"
        options={goalTypeOptions}
        value={selectedGoalType ?? ''}
        onChange={(value) => onGoalTypeChange((value as string) || '')}
        placeholder="All goal types"
      />

      <Select
        label="Status"
        options={statusOptions}
        value={selectedStatus ?? 'all'}
        onChange={(value) => onStatusChange((value as string) || 'all')}
        placeholder="All statuses"
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

export default GoalFiltersPanel;
