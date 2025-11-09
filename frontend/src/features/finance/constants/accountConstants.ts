import { Building, PiggyBank, CreditCard, TrendingUp, Wallet } from 'lucide-react';

export const accountTypeIcons = {
  checking: Building,
  savings: PiggyBank,
  credit: CreditCard,
  investment: TrendingUp,
  loan: Building,
  cash: Wallet,
  other: Building,
};

export const accountStatusConfig = {
  active: {
    icon: '🟢',
    label: 'Active',
    color:
      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  },
  inactive: {
    icon: '🟡',
    label: 'Inactive',
    color:
      'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
  },
  closed: {
    icon: '🔴',
    label: 'Closed',
    color:
      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  },
  frozen: {
    icon: '🧊',
    label: 'Frozen',
    color:
      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  pending: {
    icon: '⏳',
    label: 'Pending',
    color:
      'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800',
  },
};

export const formatOptionLabel = (value: string) =>
  value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

export const accountTypeOptions = Object.keys(accountTypeIcons).map((value) => ({
  value,
  label: formatOptionLabel(value),
}));

export const accountStatusOptions = Object.entries(accountStatusConfig).map(([value, config]) => ({
  value,
  label: config.label,
}));

export const accountPriorityConfig = {
  low: { label: 'Low Priority', icon: '🔵' },
  medium: { label: 'Medium Priority', icon: '🟡' },
  high: { label: 'High Priority', icon: '🟠' },
  critical: { label: 'Critical', icon: '🔴' },
} as const;

export const accountPriorityOptions = Object.entries(accountPriorityConfig).map(
  ([value, config]) => ({
    value,
    label: `${config.icon} ${config.label}`,
  })
);
