import React from 'react';
import { Calendar, Clock, Edit2, Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { formatCurrency } from '../../../utils/preferences';
import { FlexBetween, HStack } from '../../../components/ui/Layout';
import type { Budget } from '../api/budgets';

interface BudgetCardProps {
  budget: Budget;
  statusColors: Record<string, string>;
  defaultCurrency?: string;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
  onViewDetails: (budget: Budget) => void;
  getStatusDisplay: (budget: Budget) => string;
  getStatusText: (status: string) => string;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({
  budget,
  statusColors,
  defaultCurrency,
  onEdit,
  onDelete,
  onViewDetails,
  getStatusDisplay,
  getStatusText,
}) => {
  const status = getStatusDisplay(budget);
  const spentPercentage = parseFloat(budget.spent_percentage || '0');

  return (
    <div
      className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onViewDetails(budget)}
    >
      {/* Header */}
      <FlexBetween className="items-start mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">{budget.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize mt-0.5">
            {budget.period_type}
          </p>
        </div>
        <HStack gap={1.5} className="ml-3">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[status]}`}>
            {getStatusText(status)}
          </span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(budget);
              }}
              variant="ghost"
              size="sm"
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(budget);
              }}
              variant="ghost"
              size="sm"
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </HStack>
      </FlexBetween>

      {/* Amount */}
      <div className="mb-3">
        <FlexBetween className="items-baseline mb-1.5">
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {formatCurrency(parseFloat(budget.total_spent || '0'), defaultCurrency)}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            / {formatCurrency(parseFloat(budget.total_amount || '0'), defaultCurrency)}
          </span>
        </FlexBetween>
        <ProgressBar percentage={spentPercentage} className="h-1.5 mb-1.5" />
        <div className="text-right text-xs text-gray-600 dark:text-gray-400">
          {spentPercentage.toFixed(0)}% used
        </div>
      </div>

      {/* Footer */}
      <FlexBetween className="text-xs text-gray-500 dark:text-gray-400 pt-2.5 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          <span>
            {new Date(budget.start_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}{' '}
            -{' '}
            {new Date(budget.end_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
        {budget.is_current && (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Clock className="w-3 h-3" />
            <span className="font-medium">{budget.days_remaining || 0}d left</span>
          </div>
        )}
      </FlexBetween>
    </div>
  );
};
