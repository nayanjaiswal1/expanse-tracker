import React from 'react';
import { CheckCircle } from 'lucide-react';
import { formatCurrency } from '../../../utils/preferences';
import type { Goal } from '../../../types';
import { getGoalTypeLabel } from '../constants/goalConstants';

interface GoalCardCompletedProps {
  goal: Goal;
  showAmounts: boolean;
  user: any;
}

export const GoalCardCompleted: React.FC<GoalCardCompletedProps> = ({
  goal,
  showAmounts,
  user,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-green-200 dark:border-green-800 p-4 shadow-md opacity-95">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-xl bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400">
          <CheckCircle className="h-5 w-5" />
        </div>
        <span className="text-xs font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded-md">
          Completed
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-base text-gray-900 dark:text-white">{goal.name}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {getGoalTypeLabel(goal.goal_type)}
          </p>
        </div>

        {showAmounts && (
          <div className="text-center bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
            <p className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(parseFloat(goal.target_amount), user)}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-300 font-medium">
              Goal Achieved! 🎉
            </p>
          </div>
        )}

        {goal.completed_date && (
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Completed on {new Date(goal.completed_date).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
