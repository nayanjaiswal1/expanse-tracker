import React from 'react';
import { Coins, TrendingUp, Target, Clock } from 'lucide-react';
import { formatCurrency } from '../../../utils/preferences';
import { ProgressBar } from '../../../components/common/ProgressBar';
import type { Budget } from '../api/budgets';

interface BudgetOverviewProps {
  budget: Budget;
  defaultCurrency?: string;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({ budget, defaultCurrency }) => {
  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-full -translate-y-16 translate-x-16"></div>

      <div className="relative">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-xl p-6 text-center">
            <Coins className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Budget</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(parseFloat(budget.total_amount || '0'), defaultCurrency)}
            </p>
          </div>
          <div className="bg-green-50/50 dark:bg-green-900/20 rounded-xl p-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-600 mx-auto mb-3" />
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Total Spent</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">
              {formatCurrency(parseFloat(budget.total_spent || '0'), defaultCurrency)}
            </p>
          </div>
          <div className="bg-purple-50/50 dark:bg-purple-900/20 rounded-xl p-6 text-center">
            <Target className="w-8 h-8 text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Remaining</p>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              {formatCurrency(parseFloat(budget.total_remaining || '0'), defaultCurrency)}
            </p>
          </div>
          <div className="bg-orange-50/50 dark:bg-orange-900/20 rounded-xl p-6 text-center">
            <Clock className="w-8 h-8 text-orange-600 mx-auto mb-3" />
            <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">
              Days Remaining
            </p>
            <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">
              {budget.days_remaining || 0}
            </p>
          </div>
        </div>

        <div className="bg-gray-50/50 dark:bg-gray-700/30 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
              Overall Progress
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {parseFloat(budget.spent_percentage || '0').toFixed(1)}%
            </span>
          </div>
          <ProgressBar
            percentage={parseFloat(budget.spent_percentage || '0')}
            className="h-4"
            showPercentage={false}
          />
        </div>
      </div>
    </div>
  );
};
