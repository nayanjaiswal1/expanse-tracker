import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';
import type { Account, BalanceRecord } from '../../../../types';

// Query Keys
export const accountKeys = {
  all: ['accounts'] as const,
  lists: () => [...accountKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...accountKeys.lists(), filters] as const,
};

// Queries
export function useAccounts(filters?: Record<string, any>) {
  return useQuery({
    queryKey: accountKeys.list(filters),
    queryFn: async () => {
      const { buildUrlParams } = await import('../../../../api/utils');
      const params = filters ? buildUrlParams(filters) : new URLSearchParams();
      const response = await (apiClient as any).client.get(`/accounts/?${params.toString()}`);
      return response.data?.results || response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Mutations
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      apiClient.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Account> }) =>
      apiClient.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

// Balance Records (Unified)
export const balanceRecordKeys = {
  all: ['balance-records'] as const,
  lists: () => [...balanceRecordKeys.all, 'list'] as const,
  list: (accountId: number) => [...balanceRecordKeys.lists(), accountId] as const,
};

export function useBalanceRecords(accountId: number) {
  return useQuery({
    queryKey: balanceRecordKeys.list(accountId),
    queryFn: () => apiClient.getAccountBalanceRecords(accountId),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateBalanceRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      entry: Omit<
        BalanceRecord,
        | 'id'
        | 'created_at'
        | 'updated_at'
        | 'account_name'
        | 'account_type'
        | 'month_name'
        | 'date_display'
        | 'has_discrepancy'
        | 'balance_status'
        | 'year'
        | 'month'
        | 'entry_type_display'
        | 'reconciliation_status_display'
      >
    ) => apiClient.createBalanceRecord(entry),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: balanceRecordKeys.list(variables.account) });
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
    },
  });
}

export function useBulkUpdateMonthlyBalances() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      updates,
      date,
    }: {
      updates: Array<{
        account_id: number;
        balance: number;
        notes?: string;
      }>;
      date?: string;
    }) => apiClient.bulkUpdateMonthlyBalances(updates, date),
    onSuccess: () => {
      // Invalidate all account and balance record queries
      queryClient.invalidateQueries({ queryKey: accountKeys.lists() });
      queryClient.invalidateQueries({ queryKey: balanceRecordKeys.all });
    },
  });
}

// Account Summary
export const useAccountsSummary = () => {
  return useQuery({
    queryKey: ['accounts', 'summary'],
    queryFn: async () => {
      const response = await apiClient.get('/accounts/summary/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
