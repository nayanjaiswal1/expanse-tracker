import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../api';

// Types
export interface PlanAddon {
  id: number;
  name: string;
  description: string;
  addon_type: 'credits' | 'features' | 'limits' | 'support';
  price: number;
  billing_cycle: 'monthly' | 'yearly' | 'one_time';
  credits_amount: number;
  transaction_increase: number;
  account_increase: number;
  feature_flags: Record<string, boolean>;
  is_stackable: boolean;
  max_quantity: number;
  icon: string;
}

export interface PlanTemplate {
  id: number;
  name: string;
  description: string;
  target_user_types: string[];
  base_plan: { id: number; name: string; price: number };
  total_price: number;
  discount_percentage: number;
  is_featured: boolean;
  template_addons: { addon: PlanAddon; quantity: number }[];
}

export interface UserCustomization {
  id: number;
  base_plan: {
    id: number;
    name: string;
    price: number;
    ai_credits_per_month: number;
    max_transactions_per_month: number;
    max_accounts: number;
    features: Record<string, boolean>;
  };
  addon_instances: {
    id: number;
    addon: PlanAddon;
    quantity: number;
    monthly_cost: number;
    is_active: boolean;
  }[];
  total_ai_credits: number;
  total_transactions_limit: number;
  total_accounts_limit: number;
  total_monthly_cost: number;
  total_features: Record<string, boolean>;
}

export interface CustomizationPreview {
  base_plan: any;
  addons: { addon: PlanAddon; quantity: number; monthly_cost: number }[];
  totals: {
    ai_credits: number;
    transactions_limit: number;
    accounts_limit: number;
    monthly_cost: number;
    features: Record<string, boolean>;
  };
}

const keys = {
  addons: ['plan-customization', 'addons'] as const,
  templates: ['plan-customization', 'templates'] as const,
  customization: ['plan-customization', 'current'] as const,
  preview: (baseId: number, addonsJson: string) =>
    ['plan-customization', 'preview', baseId, addonsJson] as const,
};

// Queries
export function usePlanAddons() {
  return useQuery({
    queryKey: keys.addons,
    queryFn: async (): Promise<PlanAddon[]> => {
      const res = await apiClient.get('/plan-addons/');
      const data = (res as any).data;
      return data.results || data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function usePlanTemplates() {
  return useQuery({
    queryKey: keys.templates,
    queryFn: async (): Promise<PlanTemplate[]> => {
      const res = await apiClient.get('/plan-templates/');
      const data = (res as any).data;
      return data.results || data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUserCustomization() {
  return useQuery({
    queryKey: keys.customization,
    queryFn: async (): Promise<UserCustomization | null> => {
      const res = await apiClient.get('/plan-customization/');
      const data = (res as any).data;
      const list = data.results || data;
      return Array.isArray(list) ? list[0] || null : list;
    },
  });
}

export function usePreviewCustomization(
  basePlanId: number | null,
  addonsPayload: { addon_id: number; quantity: number }[]
) {
  const addonsJson = JSON.stringify(addonsPayload);
  return useQuery({
    queryKey: basePlanId
      ? keys.preview(basePlanId, addonsJson)
      : ['plan-customization', 'preview', 'none'],
    queryFn: async (): Promise<CustomizationPreview> => {
      if (!basePlanId) throw new Error('Missing base plan id');
      const params = new URLSearchParams({ base_plan_id: String(basePlanId), addons: addonsJson });
      const res = await apiClient.get(
        `/plan-customization/preview_customization/?${params.toString()}`
      );
      return (res as any).data as CustomizationPreview;
    },
    enabled: !!basePlanId,
  });
}

// Mutations
export function useApplyCustomizationMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      base_plan_id: number;
      addons: { addon_id: number; quantity: number }[];
    }) => {
      const res = await apiClient.post('/plan-customization/customize_plan/', payload);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.customization });
      qc.invalidateQueries({ queryKey: keys.preview as any });
    },
  });
}

export function useApplyTemplateMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (template_id: number) => {
      const res = await apiClient.post('/plan-customization/apply_template/', { template_id });
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.customization });
    },
  });
}

export function useRemoveAddonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (addon_instance_id: number) => {
      const res = await apiClient.delete('/plan-customization/remove_addon/', {
        data: { addon_instance_id },
      } as any);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.customization });
    },
  });
}
