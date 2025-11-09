import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../../api/client';
import type { Account } from '../../../types';

interface BankIcon {
  identifier: string;
  name: string;
  icon_url: string;
  id?: number;
  category?: string;
}

interface ApiFilters {
  search?: string;
  account_type?: string;
  currency?: string;
  institution?: string;
  is_active?: boolean;
  [key: string]: string | number | boolean | undefined;
}

interface UseAccountsDataProps {
  apiFilters: ApiFilters;
}

interface UseAccountsDataReturn {
  // Core data
  accounts: Account[];
  currencies: { code: string; name: string }[];
  bankIcons: BankIcon[];

  // Loading states
  isLoadingAccounts: boolean;
  isLoadingCurrencies: boolean;
  isLoadingBankIcons: boolean;
  isLoadingInitialAccounts: boolean;

  // Error states
  accountsError: Error | null;
  currenciesError: Error | null;
  bankIconsError: Error | null;
  initialAccountsError: Error | null;

  // Initial accounts for filter setup
  initialAccounts: Account[];
}

export const useAccountsData = ({ apiFilters }: UseAccountsDataProps): UseAccountsDataReturn => {
  // Fetch currencies
  const {
    data: currencies = [],
    isLoading: isLoadingCurrencies,
    error: currenciesError,
  } = useQuery<{ code: string; name: string }[], Error>({
    queryKey: ['currencies'],
    queryFn: async () => {
      type CurrenciesResponse =
        | { currencies: { code: string; name: string }[] }
        | { code: string; name: string }[]
        | { results?: { code: string; name: string }[] };
      const response = await apiClient.client.get<CurrenciesResponse>('/integrations/currencies/');
      // Handle the response format from the backend which returns {currencies: [...]}
      if ('currencies' in response.data && Array.isArray(response.data.currencies)) {
        return response.data.currencies;
      }
      if (Array.isArray(response.data)) {
        return response.data;
      }
      if (response.data && 'results' in response.data && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      return [];
    },
  });

  // Fetch bank icons
  const {
    data: bankIcons = [],
    isLoading: isLoadingBankIcons,
    error: bankIconsError,
  } = useQuery<BankIcon[], Error>({
    queryKey: ['bank-icons'],
    queryFn: async () => {
      const response = await apiClient.client.get<BankIcon[]>('/bank-icons/');
      return response.data;
    },
  });

  // Get initial accounts for filter manager (without filters)
  const {
    data: initialAccounts = [],
    isLoading: isLoadingInitialAccounts,
    error: initialAccountsError,
  } = useQuery<Account[], Error>({
    queryKey: ['accounts-initial'],
    queryFn: async () => {
      type AccountsResponse = Account[] | { results?: Account[] };
      const response = await apiClient.client.get<AccountsResponse>('/accounts/');
      return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
    },
  });

  // Fetch filtered accounts
  const {
    data: accounts = [],
    isLoading: isLoadingAccounts,
    error: accountsError,
  } = useQuery<Account[], Error>({
    queryKey: ['accounts', apiFilters],
    queryFn: async () => {
      type AccountsResponse = Account[] | { results?: Account[] };
      const response = await apiClient.client.get<AccountsResponse>('/accounts/', {
        params: apiFilters,
      });
      return Array.isArray(response.data) ? response.data : (response.data.results ?? []);
    },
  });

  return {
    // Core data
    accounts,
    currencies,
    bankIcons,
    initialAccounts,

    // Loading states
    isLoadingAccounts,
    isLoadingCurrencies,
    isLoadingBankIcons,
    isLoadingInitialAccounts,

    // Error states
    accountsError,
    currenciesError,
    bankIconsError,
    initialAccountsError,
  };
};
