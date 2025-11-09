import React from 'react';
import { Button } from '../../../components/ui/Button';

type ExpenseView = 'individual' | 'groups';

interface ExpenseFiltersPanelProps {
  activeView: ExpenseView;
  onViewChange: (view: ExpenseView) => void;
  showBalances: boolean;
  onToggleBalances: () => void;
}

export const ExpenseFiltersPanel: React.FC<ExpenseFiltersPanelProps> = ({
  activeView,
  onViewChange,
  showBalances,
  onToggleBalances,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">View</p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={activeView === 'individual' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onViewChange('individual')}
          >
            Individual lending
          </Button>
          <Button
            type="button"
            variant={activeView === 'groups' ? 'primary' : 'outline'}
            size="sm"
            onClick={() => onViewChange('groups')}
          >
            Money groups
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Balances</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onToggleBalances}
          className="justify-start"
        >
          {showBalances ? 'Hide balances' : 'Show balances'}
        </Button>
      </div>
    </div>
  );
};

export default ExpenseFiltersPanel;
