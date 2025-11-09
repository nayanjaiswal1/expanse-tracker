import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '../../../../api';
import type { Transaction, Filter } from '@/types';

// Query Keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (filters?: Partial<Filter>) => [...transactionKeys.lists(), filters] as const,
  recurring: () => [...transactionKeys.all, 'recurring'] as const,
  summary: (filters?: Partial<Filter>) => [...transactionKeys.all, 'summary', filters] as const,
};

// Queries
export function useTransactions(filters?: Partial<Filter>) {
  return useQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: () => apiClient.getTransactions(filters),
    staleTime: 1 * 60 * 1000, // 1 minute
    placeholderData: keepPreviousData, // Keep previous data while fetching new data
  });
}

export function useRecurringTransactions() {
  return useQuery({
    queryKey: transactionKeys.recurring(),
    queryFn: () => apiClient.getRecurringTransactions(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTransactionSummary(filters?: Partial<Filter>) {
  return useQuery({
    queryKey: transactionKeys.summary(filters),
    queryFn: () => apiClient.getTransactionSummary(filters),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutations
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>) =>
      apiClient.createTransaction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.summary() });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Transaction> }) =>
      apiClient.updateTransaction(id, data),
    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: transactionKeys.lists() });

      // Snapshot the previous value
      const previousTransactions = queryClient.getQueriesData({
        queryKey: transactionKeys.lists(),
      });

      // Optimistically update all matching queries
      queryClient.setQueriesData({ queryKey: transactionKeys.lists() }, (old: any) => {
        if (!old) return old;

        // Handle paginated response
        if (old.results && Array.isArray(old.results)) {
          return {
            ...old,
            results: old.results.map((transaction: Transaction) =>
              transaction.id === id ? { ...transaction, ...data } : transaction
            ),
          };
        }

        // Handle array response
        if (Array.isArray(old)) {
          return old.map((transaction: Transaction) =>
            transaction.id === String(id) ? { ...transaction, ...data } : transaction
          );
        }

        return old;
      });

      return { previousTransactions };
    },
    onError: (_err, _variables, context) => {
      // Rollback to previous value on error
      if (context?.previousTransactions) {
        context.previousTransactions.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync with the server
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.summary() });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.summary() });
    },
  });
}

export function useUpdateTransactionSplits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, splits }: { id: number; splits: any[] }) =>
      apiClient.updateTransactionSplits(id, splits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}

export function useBulkUpdateTransactionAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ transactionIds, accountId }: { transactionIds: number[]; accountId: number }) =>
      apiClient.bulkUpdateTransactionAccount(transactionIds, accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
    },
  });
}

export function useBulkUpdateTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Array<{ id: number; [key: string]: unknown }>) =>
      apiClient.bulkUpdateTransactions(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.summary() });
    },
  });
}

export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactionIds: number[]) => {
      await Promise.all(transactionIds.map((id) => apiClient.deleteTransaction(id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.summary() });
    },
  });
}

export function useMakeTransactionRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      frequency,
      next_occurrence,
      end_date,
    }: {
      id: number;
      frequency: string;
      next_occurrence?: string;
      end_date?: string;
    }) => apiClient.makeTransactionRecurring(id, frequency, next_occurrence, end_date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.recurring() });
    },
  });
}

export function useStopRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.stopRecurringTransaction(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.lists() });
      queryClient.invalidateQueries({ queryKey: transactionKeys.recurring() });
    },
  });
}

export function useExportTransactions() {
  return useMutation({
    mutationFn: ({
      format,
      transactionIds,
      filters,
    }: {
      format: 'csv' | 'json' | 'excel' | 'pdf';
      transactionIds?: number[];
      filters?: Partial<Filter>;
    }) => apiClient.exportTransactions(format, transactionIds, filters),
  });
}
