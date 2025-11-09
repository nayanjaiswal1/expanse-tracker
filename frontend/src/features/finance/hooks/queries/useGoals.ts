import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';
import type { Goal } from '@/types';

// Query Keys
export const goalKeys = {
  all: ['goals'] as const,
  lists: () => [...goalKeys.all, 'list'] as const,
  list: (filters?: Record<string, any>) => [...goalKeys.lists(), filters] as const,
  summary: () => [...goalKeys.all, 'summary'] as const,
};

// Queries
export function useGoals(filters?: Record<string, any>) {
  return useQuery({
    queryKey: goalKeys.list(filters),
    queryFn: async () => {
      const { buildUrlParams } = await import('../../../../api/utils');
      const params = filters ? buildUrlParams(filters) : new URLSearchParams();
      const response = await (apiClient as any).client.get(`/goals/?${params.toString()}`);
      return response.data?.results || response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Goal Summary
export function useGoalsSummary() {
  return useQuery({
    queryKey: goalKeys.summary(),
    queryFn: async () => {
      const response = await (apiClient as any).client.get('/goals/summary/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Mutations
export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: Omit<
        Goal,
        | 'id'
        | 'progress_percentage'
        | 'remaining_amount'
        | 'is_completed'
        | 'created_at'
        | 'updated_at'
      >
    ) => apiClient.createGoal(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Goal> }) =>
      apiClient.updateGoal(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => apiClient.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, amount }: { id: number; amount: number }) =>
      apiClient.updateGoalProgress(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}

export function useToggleGoalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'active' | 'paused' | 'cancelled' }) =>
      apiClient.toggleGoalStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.lists() });
    },
  });
}
