import React from 'react';
import { GoalCard } from './GoalCard';
import type { Goal } from '../../../types';

interface GoalGridProps {
  goals: Goal[];
  showAmounts: boolean;
  user: any;
  inlineEditGoal: number | null;
  quickAmount: string;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onToggleStatus: (goal: Goal, newStatus: 'active' | 'paused' | 'cancelled') => void;
  onQuickEdit: (goalId: number) => void;
  onQuickUpdate: (goalId: number, amount: string) => void;
  onQuickCancel: () => void;
  onQuickAmountChange: (amount: string) => void;
  variant?: 'active' | 'completed' | 'other';
  title: string;
}

export const GoalGrid: React.FC<GoalGridProps> = ({
  goals,
  showAmounts,
  user,
  inlineEditGoal,
  quickAmount,
  onEdit,
  onDelete,
  onToggleStatus,
  onQuickEdit,
  onQuickUpdate,
  onQuickCancel,
  onQuickAmountChange,
  variant = 'active',
  title,
}) => {
  if (goals.length === 0) {
    return null;
  }

  const gridClassName =
    variant === 'active'
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 p-1'
      : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-2';

  const titleClassName =
    variant === 'active'
      ? 'text-base font-semibold text-secondary-900 dark:text-secondary-100 mb-2'
      : variant === 'completed'
        ? 'text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-3'
        : 'text-xl font-semibold text-secondary-900 dark:text-secondary-100 mb-4';

  return (
    <div>
      <h2 className={titleClassName}>
        {title} ({goals.length})
      </h2>
      <div className={gridClassName}>
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            showAmounts={showAmounts}
            user={user}
            inlineEditGoal={inlineEditGoal}
            quickAmount={quickAmount}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            onQuickEdit={onQuickEdit}
            onQuickUpdate={onQuickUpdate}
            onQuickCancel={onQuickCancel}
            onQuickAmountChange={onQuickAmountChange}
            variant={variant}
          />
        ))}
      </div>
    </div>
  );
};
