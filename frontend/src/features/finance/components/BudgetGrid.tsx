import React from 'react';
import { Wallet, Plus, PiggyBank } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { BudgetCard } from './BudgetCard';
import type { Budget } from '../api/budgets';

interface BudgetGridProps {
  budgets: Budget[];
  statusColors: Record<string, string>;
  defaultCurrency?: string;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
  onViewDetails: (budget: Budget) => void;
  onCreateBudget: () => void;
  getStatusDisplay: (budget: Budget) => string;
  getStatusText: (status: string) => string;
}

export const BudgetGrid: React.FC<BudgetGridProps> = ({
  budgets,
  statusColors,
  defaultCurrency,
  onEdit,
  onDelete,
  onViewDetails,
  onCreateBudget,
  getStatusDisplay,
  getStatusText,
}) => {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center">
        <Wallet className="w-4 h-4 mr-2 text-indigo-600" />
        All Budgets
      </h2>

      {budgets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              statusColors={statusColors}
              defaultCurrency={defaultCurrency}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={onViewDetails}
              getStatusDisplay={getStatusDisplay}
              getStatusText={getStatusText}
            />
          ))}
        </div>
      )}
    </div>
  );
};
