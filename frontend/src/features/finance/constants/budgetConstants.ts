type LocalizedOptionConfig = {
  value: string;
  label: string;
  labelKey?: string;
};

export const budgetStatusOptionConfigs: LocalizedOptionConfig[] = [
  { value: 'all', label: 'All statuses', labelKey: 'budgets.filters.status.all' },
  { value: 'active', label: 'Active', labelKey: 'common:status.active' },
  { value: 'inactive', label: 'Inactive', labelKey: 'common:status.inactive' },
  { value: 'completed', label: 'Completed', labelKey: 'common:status.completed' },
];

export const budgetPeriodTypeOptionConfigs: LocalizedOptionConfig[] = [
  { value: 'all', label: 'All periods', labelKey: 'budgets.filters.periodType.all' },
  { value: 'monthly', label: 'Monthly', labelKey: 'budgets.filters.periodType.monthly' },
  { value: 'quarterly', label: 'Quarterly', labelKey: 'budgets.filters.periodType.quarterly' },
  { value: 'yearly', label: 'Yearly', labelKey: 'budgets.filters.periodType.yearly' },
  { value: 'custom', label: 'Custom Period', labelKey: 'budgets.filters.periodType.custom' },
];

type Translator = (key: string, options?: Record<string, unknown>) => string;

export const mapBudgetOptions = (
  configs: LocalizedOptionConfig[],
  t?: Translator
): Array<{ value: string; label: string }> =>
  configs.map(({ value, label, labelKey }) => ({
    value,
    label: labelKey && t ? t(labelKey, { defaultValue: label }) : label,
  }));

export const budgetStatusColorMap = {
  on_track: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  approaching_limit: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
  over_budget: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
  completed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
  upcoming: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-300',
} as const;
