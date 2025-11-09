import type { Goal } from '../../../types';
import type { GoalStatus } from '../constants/goalConstants';

export const filterGoalsByStatus = (goals: Goal[], status: GoalStatus): Goal[] => {
  return goals.filter((goal) => goal.status === status);
};

export const filterActiveGoals = (goals: Goal[]): Goal[] => {
  return filterGoalsByStatus(goals, 'active');
};

export const filterCompletedGoals = (goals: Goal[]): Goal[] => {
  return filterGoalsByStatus(goals, 'completed');
};

export const filterOtherGoals = (goals: Goal[]): Goal[] => {
  return goals.filter((goal) => !['active', 'completed'].includes(goal.status));
};

export const calculateTotalTarget = (goals: Goal[]): number => {
  return goals.reduce((sum, goal) => sum + parseFloat(goal.target_amount || '0'), 0);
};

export const calculateProgress = (
  currentAmount: string | number,
  targetAmount: string | number
): number => {
  const current = typeof currentAmount === 'string' ? parseFloat(currentAmount) : currentAmount;
  const target = typeof targetAmount === 'string' ? parseFloat(targetAmount) : targetAmount;

  if (target === 0) return 0;
  return Math.min((current / target) * 100, 100);
};
