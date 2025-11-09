import React from 'react';
import { Edit2, Trash2, Play } from 'lucide-react';
import type { Goal } from '../../../types';
import {
  getGoalTypeIcon,
  getGoalTypeLabel,
  goalTypeColorMap,
  goalStatusColorMap,
} from '../constants/goalConstants';

interface GoalCardOtherProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onToggleStatus: (goal: Goal, newStatus: 'active' | 'paused' | 'cancelled') => void;
}

export const GoalCardOther: React.FC<GoalCardOtherProps> = ({
  goal,
  onEdit,
  onDelete,
  onToggleStatus,
}) => {
  const IconComponent = getGoalTypeIcon(goal.goal_type);
  const colorClass =
    goalTypeColorMap[goal.goal_type as keyof typeof goalTypeColorMap] || goalTypeColorMap.other;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-lg opacity-70">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex space-x-2">
          {goal.status === 'paused' && (
            <button
              onClick={() => onToggleStatus(goal, 'active')}
              className="p-1 text-secondary-500 dark:text-secondary-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition-colors"
              title="Resume goal"
            >
              <Play className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onEdit(goal)}
            className="p-1 text-secondary-500 dark:text-secondary-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="Edit goal"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(goal)}
            className="p-1 text-secondary-500 dark:text-secondary-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
            title="Delete goal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-lg text-secondary-900 dark:text-secondary-100">
            {goal.name}
          </h3>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            {getGoalTypeLabel(goal.goal_type)}
          </p>
        </div>

        <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
          <span
            className={`inline-flex px-2 py-1 text-xs rounded-full ${
              goalStatusColorMap[goal.status as keyof typeof goalStatusColorMap] ||
              goalStatusColorMap.active
            }`}
          >
            {goal.status?.charAt(0).toUpperCase() + (goal.status?.slice(1) || '') || 'Unknown'}
          </span>
        </div>
      </div>
    </div>
  );
};
