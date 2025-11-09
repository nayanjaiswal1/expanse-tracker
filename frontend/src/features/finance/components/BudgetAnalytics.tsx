import React from 'react';
import { BarChart3, TrendingUp, Target, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../../../utils/preferences';
import { ProgressBar } from '../../../components/common/ProgressBar';
import type { Budget, BudgetAnalytics as BudgetAnalyticsType } from '../api/budgets';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

interface BudgetAnalyticsProps {
  budget: Budget;
  analytics: BudgetAnalyticsType;
  defaultCurrency?: string;
}

export const BudgetAnalytics: React.FC<BudgetAnalyticsProps> = ({
  budget,
  analytics,
  defaultCurrency,
}) => {
  // Ensure category breakdown is always an array
  const safeCategoryBreakdown = Array.isArray(analytics.category_breakdown)
    ? analytics.category_breakdown
    : [];

  return (
    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-8 mb-8">
      <FlexBetween className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          <HStack>
            <BarChart3 className="w-6 h-6 mr-2 text-indigo-600" />
            Budget Analytics
          </HStack>
        </h2>
      </FlexBetween>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Category Breakdown
          </h3>
          <div className="space-y-3">
            {safeCategoryBreakdown.map((category, index) => (
              <div key={index} className="bg-gray-50/80 dark:bg-gray-700/50 rounded-lg p-4">
                <FlexBetween className="mb-2">
                  <HStack>
                    <div
                      className="w-3 h-3 rounded-full mr-3"
                      style={{ backgroundColor: category.color || '#6366f1' }}
                    ></div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {category.category}
                    </span>
                  </HStack>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {category.percentage_used?.toFixed(1)}%
                  </span>
                </FlexBetween>
                <div className="space-y-1">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Spent: {formatCurrency(category.spent, defaultCurrency)}</span>
                    <span>Budget: {formatCurrency(category.allocated, defaultCurrency)}</span>
                  </div>
                  <ProgressBar
                    percentage={category.percentage_used || 0}
                    className="h-2"
                    showPercentage={false}
                  />
                  {category.is_over_budget && (
                    <HStack className="text-red-600 dark:text-red-400 text-xs mt-1">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Over budget
                    </HStack>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spending Insights */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Spending Insights
          </h3>
          <div className="space-y-4">
            <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-lg p-4">
              <HStack className="mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
                <span className="font-medium text-blue-700 dark:text-blue-300">Daily Average</span>
              </HStack>
              <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                {formatCurrency(analytics.average_daily_spending || 0, defaultCurrency)}
              </p>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                per day during budget period
              </p>
            </div>

            <div className="bg-purple-50/50 dark:bg-purple-900/20 rounded-lg p-4">
              <HStack className="mb-2">
                <Target className="w-5 h-5 text-purple-600 mr-2" />
                <span className="font-medium text-purple-700 dark:text-purple-300">
                  Budget Progress
                </span>
              </HStack>
              <p className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                {budget.progress_percentage || 0}%
              </p>
              <p className="text-sm text-purple-600 dark:text-purple-400">
                of budget period elapsed
              </p>
            </div>

            <div className="bg-orange-50/50 dark:bg-orange-900/20 rounded-lg p-4">
              <HStack className="mb-2">
                <Clock className="w-5 h-5 text-orange-600 mr-2" />
                <span className="font-medium text-orange-700 dark:text-orange-300">
                  Projected Spending
                </span>
              </HStack>
              <p className="text-2xl font-bold text-orange-800 dark:text-orange-200">
                {formatCurrency(
                  (analytics.average_daily_spending || 0) * (budget.days_remaining || 0),
                  { default_currency: defaultCurrency }
                )}
              </p>
              <p className="text-sm text-orange-600 dark:text-orange-400">
                estimated for remaining days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
