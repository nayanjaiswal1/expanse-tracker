import React from 'react';
import type { Goal } from '../../../types';
import { GoalCardActive } from './GoalCardActive';
import { GoalCardCompleted } from './GoalCardCompleted';
import { GoalCardOther } from './GoalCardOther';

interface GoalCardProps {
  goal: Goal;
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
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
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
}) => {
  if (variant === 'completed') {
    return <GoalCardCompleted goal={goal} showAmounts={showAmounts} user={user} />;
  }

  if (variant === 'other') {
    return (
      <GoalCardOther
        goal={goal}
        onEdit={onEdit}
        onDelete={onDelete}
        onToggleStatus={onToggleStatus}
      />
    );
  }

  return (
    <GoalCardActive
      goal={goal}
      showAmounts={showAmounts}
      user={user}
      inlineEditGoal={inlineEditGoal}
      quickAmount={quickAmount}
      onEdit={onEdit}
      onToggleStatus={onToggleStatus}
      onQuickEdit={onQuickEdit}
      onQuickUpdate={onQuickUpdate}
      onQuickCancel={onQuickCancel}
      onQuickAmountChange={onQuickAmountChange}
    />
  );
};
