import { useFilters, commonFilters } from '../../../hooks/useFilters';

export interface AccountFilters {
  search: string;
  account_type?: string;
  status?: string;
  institution?: string;
  currency?: string;
}

export function useAccountFilters() {
  return useFilters<AccountFilters>({
    search: commonFilters.search,
    account_type: commonFilters.select(),
    status: commonFilters.select(),
    institution: commonFilters.select(),
    currency: commonFilters.select(),
  });
}
