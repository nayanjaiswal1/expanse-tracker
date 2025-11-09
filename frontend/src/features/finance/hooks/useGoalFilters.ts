import { useFilters, commonFilters } from '../../../hooks/useFilters';

export interface GoalFilters {
  search: string;
  goal_type: string;
  status: string;
  [key: string]: string;
}

export function useGoalFilters() {
  return useFilters<GoalFilters>({
    search: commonFilters.search,
    goal_type: commonFilters.select(),
    status: {
      defaultValue: 'all',
      serialize: (value: string) => (value && value !== 'all' ? value : ''),
      deserialize: (value: string) => value || 'all',
    },
  });
}
