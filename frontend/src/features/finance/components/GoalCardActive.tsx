import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit2, Plus, Pause, Play, Calendar } from 'lucide-react';
import { formatCurrency } from '../../../utils/preferences';
import type { Goal } from '../../../types';
import { QuickEditInput } from './QuickEditInput';
import { getGoalTypeIcon, getGoalTypeLabel } from '../constants/goalConstants';

interface GoalCardActiveProps {
  goal: Goal;
  showAmounts: boolean;
  user: any;
  inlineEditGoal: number | null;
  quickAmount: string;
  onEdit: (goal: Goal) => void;
  onToggleStatus: (goal: Goal, newStatus: 'active' | 'paused' | 'cancelled') => void;
  onQuickEdit: (goalId: number) => void;
  onQuickUpdate: (goalId: number, amount: string) => void;
  onQuickCancel: () => void;
  onQuickAmountChange: (amount: string) => void;
}

export const GoalCardActive: React.FC<GoalCardActiveProps> = ({
  goal,
  showAmounts,
  user,
  inlineEditGoal,
  quickAmount,
  onEdit,
  onToggleStatus,
  onQuickEdit,
  onQuickUpdate,
  onQuickCancel,
  onQuickAmountChange,
}) => {
  const navigate = useNavigate();

  const IconComponent = getGoalTypeIcon(goal.goal_type);
  const progressPercent = Math.min(goal.progress_percentage, 100);

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-md dark:shadow-gray-900/50 group overflow-visible hover:shadow-xl hover:shadow-blue-500/20 dark:hover:shadow-gray-900/90 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 ease-out cursor-pointer flex flex-col h-full transform-gpu origin-center hover:z-10 relative min-h-[240px]"
      onClick={() => navigate(`/goals/${goal.id}`)}
    >
      {/* Thumbnail Header */}
      <div className="relative h-20 overflow-hidden rounded-t-xl flex-shrink-0">
        {goal.images && goal.images.length > 0 ? (
          <>
            <img
              src={goal.images[0].image_url}
              alt={goal.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </>
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${
              goal.goal_type === 'savings'
                ? 'from-emerald-500 to-emerald-600'
                : goal.goal_type === 'investment'
                  ? 'from-purple-500 to-purple-600'
                  : goal.goal_type === 'debt_payoff'
                    ? 'from-red-500 to-red-600'
                    : 'from-blue-500 to-blue-600'
            } flex items-center justify-center transition-transform duration-300 group-hover:scale-105`}
          >
            <IconComponent className="h-4 w-4 text-white/80" />
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="absolute top-1 right-1 flex space-x-0.5 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onQuickEdit(goal.id);
            }}
            className="p-1 bg-black/20 dark:bg-white/20 backdrop-blur-sm text-white hover:bg-green-500 hover:scale-110 rounded-md transition-all duration-200"
            title="Add funds"
          >
            <Plus className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(goal);
            }}
            className="p-1 bg-black/20 dark:bg-white/20 backdrop-blur-sm text-white hover:bg-blue-500 hover:scale-110 rounded-md transition-all duration-200"
            title="Edit goal"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(goal, goal.status === 'active' ? 'paused' : 'active');
            }}
            className="p-1 bg-black/20 dark:bg-white/20 backdrop-blur-sm text-white hover:bg-yellow-500 hover:scale-110 rounded-md transition-all duration-200"
            title={goal.status === 'active' ? 'Pause goal' : 'Resume goal'}
          >
            {goal.status === 'active' ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* Goal Type Badge */}
        <div className="absolute top-1 left-1">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-white/90 dark:bg-gray-900/90 text-gray-800 dark:text-gray-100 shadow-sm">
            {getGoalTypeLabel(goal.goal_type)?.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col min-h-0">
        <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-2 line-clamp-1">
          {goal.name}
        </h3>

        {/* Amount Display */}
        {showAmounts && (
          <div className="mb-3">
            <div className="flex items-baseline justify-between">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform duration-300">
                {formatCurrency(parseFloat(goal.current_amount), user)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                of {formatCurrency(parseFloat(goal.target_amount), user)}
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {progressPercent.toFixed(0)}% Complete
            </span>
            {goal.target_date && (
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-2.5 w-2.5 mr-0.5" />
                <span>
                  {new Date(goal.target_date).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            )}
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 rounded-full transition-all duration-500 ease-out group-hover:shadow-lg"
              style={{
                width: `${progressPercent}%`,
                backgroundColor:
                  goal.color ||
                  (goal.goal_type === 'savings'
                    ? '#10B981'
                    : goal.goal_type === 'investment'
                      ? '#8B5CF6'
                      : goal.goal_type === 'debt_payoff'
                        ? '#EF4444'
                        : '#3B82F6'),
                boxShadow: `0 0 10px ${
                  goal.color ||
                  (goal.goal_type === 'savings'
                    ? '#10B981'
                    : goal.goal_type === 'investment'
                      ? '#8B5CF6'
                      : goal.goal_type === 'debt_payoff'
                        ? '#EF4444'
                        : '#3B82F6')
                }20`,
              }}
            />
          </div>
        </div>

        {/* Inline Edit for Quick Amount Update */}
        {inlineEditGoal === goal.id && (
          <QuickEditInput
            amount={quickAmount}
            onAmountChange={onQuickAmountChange}
            onSave={() => onQuickUpdate(goal.id, quickAmount)}
            onCancel={onQuickCancel}
          />
        )}
      </div>
    </div>
  );
};
