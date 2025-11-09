import React from 'react';
import { Target, Calendar, Eye, BarChart3, AlertTriangle, Clock, TrendingUp } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { ProgressBar } from '../../../components/common/ProgressBar';
import { formatCurrency } from '../../../utils/preferences';
import type { Budget } from '../api/budgets';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface CurrentBudgetDisplayProps {
  budget: Budget;
  statusColors: Record<string, string>;
  defaultCurrency?: string;
  onViewDetails: (budget: Budget) => void;
  getStatusDisplay: (budget: Budget) => string;
  getStatusText: (status: string) => string;
}

export const CurrentBudgetDisplay: React.FC<CurrentBudgetDisplayProps> = ({
  budget,
  statusColors,
  defaultCurrency,
  onViewDetails,
  getStatusDisplay,
  getStatusText,
}) => {
  const status = getStatusDisplay(budget);

  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
        <HStack>
          <Target className="w-4 h-4 mr-2 text-purple-600" />
          Current Budget
        </HStack>
      </h2>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-3 relative overflow-hidden">
        <div className="relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-1">
                {budget.name}
              </h3>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                <HStack>
                  <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {budget.start_date} - {budget.end_date}
                  </span>
                </HStack>
              </p>
            </div>
            <HStack gap={1} className="flex-shrink-0">
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors[status]}`}
              >
                {getStatusText(status)}
              </span>
              <Button
                onClick={() => onViewDetails(budget)}
                variant="ghost"
                size="sm"
                className="bg-white/50 hover:bg-white/80 p-1"
              >
                <Eye className="w-3 h-3" />
              </Button>
            </HStack>
          </div>

          <div className="space-y-3">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <FlexBetween className="mb-2">
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  Spending Progress
                </span>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-900 dark:text-white block">
                    {formatCurrency(parseFloat(budget.total_spent || '0'), defaultCurrency)}
                  </span>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                    of {formatCurrency(parseFloat(budget.total_amount || '0'), defaultCurrency)}
                  </span>
                </div>
              </FlexBetween>
              <div className="relative">
                <ProgressBar
                  percentage={parseFloat(budget.spent_percentage || '0')}
                  className="h-2"
                  showPercentage={true}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 text-center border border-blue-200 dark:border-blue-800">
                <BarChart3 className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                  Categories
                </p>
                <p className="text-sm font-bold text-blue-700 dark:text-blue-300">
                  {budget.categories_count || 0}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 text-center border border-red-200 dark:border-red-800">
                <AlertTriangle className="w-4 h-4 text-red-600 mx-auto mb-1" />
                <p className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
                  Over Budget
                </p>
                <p className="text-sm font-bold text-red-700 dark:text-red-300">
                  {budget.over_budget_categories || 0}
                </p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 text-center border border-green-200 dark:border-green-800">
                <Clock className="w-4 h-4 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                  Days Left
                </p>
                <p className="text-sm font-bold text-green-700 dark:text-green-300">
                  {budget.days_remaining || 0}
                </p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 text-center border border-purple-200 dark:border-purple-800">
                <TrendingUp className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">
                  Time Progress
                </p>
                <p className="text-sm font-bold text-purple-700 dark:text-purple-300">
                  {budget.progress_percentage || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
