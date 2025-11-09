import type { LucideIcon } from 'lucide-react';
import { PiggyBank, Coins, CreditCard, TrendingUp, Target } from 'lucide-react';

export const GOAL_TYPES = [
  'savings',
  'spending',
  'debt_payoff',
  'investment',
  'expense_reduction',
  'income_increase',
  'emergency_fund',
  'retirement',
  'education',
  'travel',
  'home',
  'car',
  'other',
] as const;

export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_STATUSES = ['active', 'paused', 'completed', 'cancelled'] as const;

export type GoalStatus = (typeof GOAL_STATUSES)[number];

export const DEFAULT_GOAL_TYPE: GoalType = 'savings';
export const DEFAULT_TARGET_AMOUNT = '1000.00';
export const DEFAULT_CURRENT_AMOUNT = '0.00';

const formatGoalTypeLabel = (value: string) =>
  value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

const GOAL_TYPE_LABEL_OVERRIDES: Partial<Record<GoalType, string>> = {
  savings: 'Savings Goal',
  spending: 'Spending Budget',
  debt_payoff: 'Debt Payoff',
  investment: 'Investment Goal',
};

export type GoalTypeOption = {
  value: GoalType;
  label: string;
  labelKey?: string;
};

export const goalTypeOptions: GoalTypeOption[] = GOAL_TYPES.map((value) => ({
  value,
  label: GOAL_TYPE_LABEL_OVERRIDES[value] ?? formatGoalTypeLabel(value),
  labelKey: `finance.goals.goalTypes.${value}`,
}));

const goalTypeLabelMap = goalTypeOptions.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

export const getGoalTypeLabel = (type: string) =>
  goalTypeLabelMap[type] ?? formatGoalTypeLabel(type);

export type GoalPriority = 'low' | 'medium' | 'high';

export const goalPriorityOptions: Array<{ value: GoalPriority; label: string; labelKey: string }> =
  [
    { value: 'low', label: 'Low', labelKey: 'common.priority.low' },
    { value: 'medium', label: 'Medium', labelKey: 'common.priority.medium' },
    { value: 'high', label: 'High', labelKey: 'common.priority.high' },
  ];

type Translator = (key: string, options?: Record<string, unknown>) => string;

export const goalStatusOptionConfigs: Array<{ value: string; label: string; labelKey: string }> = [
  { value: 'all', label: 'All statuses', labelKey: 'goals.status.all' },
  { value: 'active', label: 'Active', labelKey: 'goals.status.active' },
  { value: 'paused', label: 'Paused', labelKey: 'goals.status.paused' },
  { value: 'completed', label: 'Completed', labelKey: 'goals.status.completed' },
  { value: 'cancelled', label: 'Cancelled', labelKey: 'goals.status.cancelled' },
];

export const mapGoalStatusOptions = (t?: Translator) =>
  goalStatusOptionConfigs.map(({ value, label, labelKey }) => ({
    value,
    label: t ? t(labelKey, { defaultValue: label }) : label,
  }));

export const goalContributionFrequencyOptions: Array<{
  value: string;
  label: string;
  labelKey: string;
}> = [
  { value: 'weekly', label: 'Weekly', labelKey: 'common.frequency.weekly' },
  { value: 'monthly', label: 'Monthly', labelKey: 'common.frequency.monthly' },
  { value: 'quarterly', label: 'Quarterly', labelKey: 'common.frequency.quarterly' },
  { value: 'yearly', label: 'Yearly', labelKey: 'common.frequency.yearly' },
];

export const goalTypeIconMap: Partial<Record<GoalType, LucideIcon>> = {
  savings: PiggyBank,
  spending: Coins,
  debt_payoff: CreditCard,
  investment: TrendingUp,
};

export const getGoalTypeIcon = (type: string) => goalTypeIconMap[type as GoalType] ?? Target;

export const goalTypeColorMap: Record<GoalType, string> = {
  savings: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  spending: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  debt_payoff: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  investment: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  expense_reduction: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  income_increase: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  emergency_fund: 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400',
  retirement: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  education: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  travel: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
  home: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  car: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
  other: 'bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400',
};

export const goalStatusColorMap = {
  active: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  paused: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  cancelled: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
} as const;
