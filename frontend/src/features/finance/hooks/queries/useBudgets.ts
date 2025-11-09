import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { budgetsApi } from '../../api/budgets';
import { apiClient } from '../../../../api/client';
import type {
  BudgetTemplate,
  BudgetTemplateCategory,
  CreateBudgetData,
  CreateBudgetCategoryData,
} from '../../api/budgets';

// Budget queries
export const useBudgets = (filters?: Record<string, any>) => {
  return useQuery({
    queryKey: ['budgets', filters],
    queryFn: async () => {
      const { buildUrlParams } = await import('../../../../api/utils');
      const params = filters ? buildUrlParams(filters) : new URLSearchParams();
      const queryString = params.toString();
      const url = queryString ? `/budgets/?${queryString}` : '/budgets/';
      const response = await apiClient.client.get(url);
      return response.data;
    },
    // Keep prior data visible while fetching new filtered results to prevent full layout flicker
    placeholderData: keepPreviousData,
    // Lightly increase staleTime so quick successive filter clicks don't instantly trigger loading states
    staleTime: 3 * 60 * 1000, // 3 minutes
    // Avoid refetch on window focus to reduce accidental flicker when user switches tabs
    refetchOnWindowFocus: false,
  });
};

export const useBudget = (id: number) => {
  return useQuery({
    queryKey: ['budgets', id],
    queryFn: () => budgetsApi.getBudget(id),
    enabled: !!id,
  });
};

export const useCurrentBudget = () => {
  return useQuery({
    queryKey: ['budgets', 'current'],
    queryFn: budgetsApi.getCurrentBudget,
    retry: (failureCount, error: any) => {
      // Don't retry if it's a 404 (no current budget) or 401 (unauthorized)
      if (error?.response?.status === 404 || error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

export const useBudgetAnalytics = (id: number) => {
  return useQuery({
    queryKey: ['budgets', id, 'analytics'],
    queryFn: () => budgetsApi.getBudgetAnalytics(id),
    enabled: !!id,
  });
};

// Budget Category queries
export const useBudgetCategories = (budgetId?: number) => {
  return useQuery({
    queryKey: ['budget-categories', budgetId],
    queryFn: () => budgetsApi.getBudgetCategories(budgetId),
  });
};

// Budget Alert queries
export const useBudgetAlerts = () => {
  return useQuery({
    queryKey: ['budget-alerts'],
    queryFn: budgetsApi.getBudgetAlerts,
  });
};

export const useUnacknowledgedAlerts = () => {
  return useQuery({
    queryKey: ['budget-alerts', 'unacknowledged'],
    queryFn: budgetsApi.getUnacknowledgedAlerts,
  });
};

// Budget Template queries
export const useBudgetTemplates = () => {
  return useQuery({
    queryKey: ['budget-templates'],
    queryFn: budgetsApi.getBudgetTemplates,
  });
};

export const useMyBudgetTemplates = () => {
  return useQuery({
    queryKey: ['budget-templates', 'my'],
    queryFn: budgetsApi.getMyTemplates,
  });
};

export const usePublicBudgetTemplates = () => {
  return useQuery({
    queryKey: ['budget-templates', 'public'],
    queryFn: budgetsApi.getPublicTemplates,
  });
};

export const useTemplateCategories = (templateId: number) => {
  return useQuery({
    queryKey: ['budget-template-categories', templateId],
    queryFn: () => budgetsApi.getTemplateCategories(templateId),
    enabled: !!templateId,
  });
};

// Budget mutations
export const useCreateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.createBudget,
    onSuccess: () => {
      // Force refetch of budget data
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'current'] });
      queryClient.refetchQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useUpdateBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateBudgetData> }) =>
      budgetsApi.updateBudget(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', id] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'current'] });
    },
  });
};

export const useDeleteBudget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'current'] });
    },
  });
};

export const useCreateFromTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.createFromTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgets', 'current'] });
    },
  });
};

// Budget Category mutations
export const useCreateBudgetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.createBudgetCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useUpdateBudgetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateBudgetCategoryData> }) =>
      budgetsApi.updateBudgetCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

export const useDeleteBudgetCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.deleteBudgetCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-categories'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    },
  });
};

// Budget Alert mutations
export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.acknowledgeAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-alerts'] });
    },
  });
};

// Budget Template mutations
export const useCreateBudgetTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.createBudgetTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
    },
  });
};

export const useUpdateBudgetTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BudgetTemplate> }) =>
      budgetsApi.updateBudgetTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
    },
  });
};

export const useDeleteBudgetTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.deleteBudgetTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-templates'] });
    },
  });
};

// Template Category mutations
export const useCreateTemplateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.createTemplateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-template-categories'] });
    },
  });
};

export const useUpdateTemplateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BudgetTemplateCategory> }) =>
      budgetsApi.updateTemplateCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-template-categories'] });
    },
  });
};

export const useDeleteTemplateCategory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: budgetsApi.deleteTemplateCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget-template-categories'] });
    },
  });
};

// Budget Summary
export const useBudgetsSummary = () => {
  return useQuery({
    queryKey: ['budgets', 'summary'],
    queryFn: async () => {
      const response = await apiClient.client.get('/budgets/summary/');
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
