import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api';
import type { TransactionGroup } from '@/types';
import type { TransactionGroupFilters } from '@/api/modules/transactionGroups';
import { toast } from 'sonner';

/**
 * Hook for fetching transaction groups list
 */
export function useTransactionGroups(filters?: Partial<TransactionGroupFilters>) {
  return useQuery({
    queryKey: ['transactionGroups', filters],
    queryFn: () => apiClient.getTransactionGroups(filters),
  });
}

/**
 * Hook for fetching a single transaction group
 */
export function useTransactionGroup(id: number, includeSummary = false) {
  return useQuery({
    queryKey: ['transactionGroup', id, includeSummary],
    queryFn: () => apiClient.getTransactionGroup(id, includeSummary),
    enabled: !!id,
  });
}

/**
 * Hook for searching transaction groups
 */
export function useSearchTransactionGroups(query: string, groupType?: string) {
  return useQuery({
    queryKey: ['transactionGroups', 'search', query, groupType],
    queryFn: () => apiClient.searchTransactionGroups(query, groupType),
    enabled: query.length > 0,
  });
}

/**
 * Hook for creating a transaction group
 */
export function useCreateTransactionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      group: Omit<
        TransactionGroup,
        | 'id'
        | 'created_at'
        | 'updated_at'
        | 'total_transactions'
        | 'total_spent'
        | 'total_received'
        | 'last_transaction_date'
      >
    ) => apiClient.createTransactionGroup(group),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionGroups'] });
      toast.success('Transaction group created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to create transaction group');
    },
  });
}

/**
 * Hook for updating a transaction group
 */
export function useUpdateTransactionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<TransactionGroup> }) =>
      apiClient.updateTransactionGroup(id, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transactionGroups'] });
      queryClient.invalidateQueries({ queryKey: ['transactionGroup', data.id] });
      toast.success('Transaction group updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to update transaction group');
    },
  });
}

/**
 * Hook for deleting a transaction group
 */
export function useDeleteTransactionGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteTransactionGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactionGroups'] });
      toast.success('Transaction group deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error?.message || 'Failed to delete transaction group');
    },
  });
}

/**
 * Hook for getting transaction group summary
 */
export function useTransactionGroupSummary(id: number, startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['transactionGroupSummary', id, startDate, endDate],
    queryFn: () => apiClient.getTransactionGroupSummary(id, startDate, endDate),
    enabled: !!id,
  });
}

/**
 * Hook for getting merchants (groups with type='merchant')
 */
export function useMerchants() {
  return useTransactionGroups({ group_type: 'merchant', is_active: true });
}

/**
 * Hook for getting all active groups by type
 */
export function useGroupsByType(groupType: TransactionGroup['group_type']) {
  return useTransactionGroups({ group_type: groupType, is_active: true });
}
