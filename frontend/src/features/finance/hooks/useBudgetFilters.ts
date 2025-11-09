import { commonFilters, useFilters } from '../../../hooks/useFilters';

export interface BudgetFilters {
  search: string;
  status: string;
  period_type: string;
  [key: string]: string;
}

export function useBudgetFilters() {
  return useFilters<BudgetFilters>({
    search: commonFilters.search,
    status: {
      defaultValue: 'all',
      serialize: (value: string) => (value && value !== 'all' ? value : ''),
      deserialize: (value: string) => value || 'all',
    },
    period_type: {
      defaultValue: 'all',
      serialize: (value: string) => (value && value !== 'all' ? value : ''),
      deserialize: (value: string) => value || 'all',
    },
  });
}
