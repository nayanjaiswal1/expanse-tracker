import { apiClient } from '../../../api/client';

export interface Budget {
  id: number;
  name: string;
  description: string;
  period_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  total_amount: string;
  is_active: boolean;
  auto_rollover: boolean;
  is_current: boolean;
  days_remaining: number;
  days_total: number;
  progress_percentage: string;
  total_spent: string;
  total_remaining: string;
  spent_percentage: string;
  categories_count: number;
  over_budget_categories: number;
  created_at: string;
  updated_at: string;
}

export interface BudgetCategory {
  id: number;
  budget: number;
  category: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  allocated_amount: string;
  alert_threshold: string;
  notes: string;
  is_essential: boolean;
  spent_amount: string;
  remaining_amount: string;
  spent_percentage: string;
  is_over_budget: boolean;
  is_approaching_limit: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetAlert {
  id: number;
  budget_category: number;
  budget_name: string;
  category_name: string;
  category_icon: string;
  alert_type: 'warning' | 'exceeded' | 'depleted';
  alert_type_display: string;
  message: string;
  spent_amount: string;
  spent_percentage: string;
  triggered_at: string;
  is_acknowledged: boolean;
  acknowledged_at: string | null;
}

export interface BudgetTemplate {
  id: number;
  name: string;
  description: string;
  period_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  total_amount: string | null;
  is_public: boolean;
  usage_count: number;
  category_allocations_count: number;
  total_percentage: string;
  can_use: boolean;
  created_at: string;
  updated_at: string;
}

export interface BudgetTemplateCategory {
  id: number;
  template: number;
  category: number;
  category_name: string;
  category_icon: string;
  category_color: string;
  allocation_type: 'amount' | 'percentage';
  allocation_value: string;
  allocation_display: string;
  alert_threshold: string;
  is_essential: boolean;
  notes: string;
}

export interface BudgetAnalytics {
  daily_spending: Array<{
    date: string;
    amount: string;
  }>;
  category_breakdown: Array<{
    category: string;
    allocated: string;
    spent: string;
    remaining: string;
    percentage_used: string;
    is_over_budget: boolean;
    color: string;
  }>;
  total_budget: string;
  total_spent: string;
  days_remaining: number;
  average_daily_spending: string;
}

export interface CreateBudgetData {
  name: string;
  description?: string;
  period_type: 'monthly' | 'quarterly' | 'yearly' | 'custom';
  start_date: string;
  end_date: string;
  total_amount: string;
  is_active?: boolean;
  auto_rollover?: boolean;
}

export interface CreateBudgetCategoryData {
  budget: number;
  category: number;
  allocated_amount: string;
  alert_threshold?: string;
  notes?: string;
  is_essential?: boolean;
}

export interface CreateFromTemplateData {
  template_id: number;
  name: string;
  start_date: string;
  end_date: string;
  total_amount?: string;
}

export const budgetsApi = {
  // Budget CRUD operations
  getBudgets: async () => {
    const response = await apiClient.get<{ results: Budget[] }>('/budgets/');
    return response.data.results;
  },
  getBudget: (id: number) => apiClient.get<Budget>(`/budgets/${id}/`),
  createBudget: (data: CreateBudgetData) => apiClient.post<Budget>('/budgets/', data),
  updateBudget: (id: number, data: Partial<CreateBudgetData>) =>
    apiClient.patch<Budget>(`/budgets/${id}/`, data),
  deleteBudget: (id: number) => apiClient.delete(`/budgets/${id}/`),

  // Current budget
  getCurrentBudget: () => apiClient.get<Budget>('/budgets/current/'),

  // Budget analytics
  getBudgetAnalytics: (id: number) => apiClient.get<BudgetAnalytics>(`/budgets/${id}/analytics/`),

  // Create from template
  createFromTemplate: (data: CreateFromTemplateData) =>
    apiClient.post<Budget>('/budgets/create_from_template/', data),

  // Budget Categories
  getBudgetCategories: async (budgetId?: number) => {
    if (!budgetId || budgetId === 0) {
      return []; // Return empty array if no valid budget ID
    }
    const response = await apiClient.get<BudgetCategory[]>(
      `/budget-categories/?budget=${budgetId}`
    );
    return response.data;
  },
  createBudgetCategory: (data: CreateBudgetCategoryData) =>
    apiClient.post<BudgetCategory>('/budget-categories/', data),
  updateBudgetCategory: (id: number, data: Partial<CreateBudgetCategoryData>) =>
    apiClient.patch<BudgetCategory>(`/budget-categories/${id}/`, data),
  deleteBudgetCategory: (id: number) => apiClient.delete(`/budget-categories/${id}/`),

  // Budget Alerts
  getBudgetAlerts: () => apiClient.get<BudgetAlert[]>('/budget-alerts/'),
  getUnacknowledgedAlerts: () => apiClient.get<BudgetAlert[]>('/budget-alerts/unacknowledged/'),
  acknowledgeAlert: (id: number) => apiClient.post(`/budget-alerts/${id}/acknowledge/`),

  // Budget Templates
  getBudgetTemplates: () => apiClient.get<BudgetTemplate[]>('/budget-templates/'),
  getMyTemplates: () => apiClient.get<BudgetTemplate[]>('/budget-templates/my_templates/'),
  getPublicTemplates: () => apiClient.get<BudgetTemplate[]>('/budget-templates/public_templates/'),
  createBudgetTemplate: (data: Partial<BudgetTemplate>) =>
    apiClient.post<BudgetTemplate>('/budget-templates/', data),
  updateBudgetTemplate: (id: number, data: Partial<BudgetTemplate>) =>
    apiClient.patch<BudgetTemplate>(`/budget-templates/${id}/`, data),
  deleteBudgetTemplate: (id: number) => apiClient.delete(`/budget-templates/${id}/`),

  // Budget Template Categories
  getTemplateCategories: (templateId: number) =>
    apiClient.get<BudgetTemplateCategory[]>(`/budget-template-categories/?template=${templateId}`),
  createTemplateCategory: (data: Partial<BudgetTemplateCategory>) =>
    apiClient.post<BudgetTemplateCategory>('/budget-template-categories/', data),
  updateTemplateCategory: (id: number, data: Partial<BudgetTemplateCategory>) =>
    apiClient.patch<BudgetTemplateCategory>(`/budget-template-categories/${id}/`, data),
  deleteTemplateCategory: (id: number) => apiClient.delete(`/budget-template-categories/${id}/`),
};
