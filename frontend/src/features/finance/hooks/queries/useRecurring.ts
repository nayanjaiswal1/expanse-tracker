import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';

// Types used by RecurringInvestments UI
export interface RecurringTransaction {
  id: number;
  name: string;
  transaction_type: 'expense' | 'income';
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  frequency_interval: number;
  start_date: string;
  end_date?: string;
  max_executions?: number;
  is_active: boolean;
  account: number;
  category: number;
  description: string;
  notes?: string;
  next_execution_date: string;
  total_executions: number;
  last_execution_date?: string;
  created_at: string;
}

export interface Investment {
  id: number;
  name: string;
  symbol: string;
  investment_type: 'stock' | 'bond' | 'mutual_fund' | 'etf' | 'crypto' | 'other';
  current_price: number;
  current_quantity: number;
  current_value: number;
  total_invested: number;
  total_gain_loss: number;
  total_gain_loss_percentage: number;
  sector?: string;
  country?: string;
  currency: string;
  is_active: boolean;
  last_price_update?: string;
  price_source: string;
  notes?: string;
}

export interface InvestmentPortfolio {
  id: number;
  name: string;
  description?: string;
  investments: Investment[];
  total_value: number;
  total_invested: number;
  total_gain_loss: number;
  total_gain_loss_percentage: number;
  sector_allocation: Record<string, number>;
  is_active: boolean;
  created_at: string;
}

export interface InvestmentTransaction {
  id: number;
  investment: number;
  transaction_type: 'buy' | 'sell';
  quantity: number;
  price_per_unit: number;
  total_amount: number;
  fees: number;
  date: string;
  notes?: string;
  created_at: string;
}

const keys = {
  recurring: ['recurring-transactions', 'list'] as const,
  investments: ['investments', 'list'] as const,
  portfolios: ['investment-portfolios', 'list'] as const,
  investmentTx: ['investment-transactions', 'list'] as const,
};

// Queries
export function useRecurringTransactionsQuery() {
  return useQuery({
    queryKey: keys.recurring,
    queryFn: async () => {
      const response = await apiClient.get('/recurring-transactions/');
      return response.data;
    },
    select: (data) =>
      ('results' in (data as any) ? (data as any).results : data) as RecurringTransaction[],
  });
}

export function useInvestments() {
  return useQuery({
    queryKey: keys.investments,
    queryFn: async () => {
      const response = await apiClient.get('/investments/');
      return response.data;
    },
    select: (data) => ('results' in (data as any) ? (data as any).results : data) as Investment[],
  });
}

export function useInvestmentPortfolios() {
  return useQuery({
    queryKey: keys.portfolios,
    queryFn: async () => {
      const response = await apiClient.get('/investment-portfolios/');
      return response.data;
    },
    select: (data) =>
      ('results' in (data as any) ? (data as any).results : data) as InvestmentPortfolio[],
  });
}

export function useInvestmentTransactions() {
  return useQuery({
    queryKey: keys.investmentTx,
    queryFn: async () => {
      const response = await apiClient.get('/investment-transactions/');
      return response.data;
    },
    select: (data) =>
      ('results' in (data as any) ? (data as any).results : data) as InvestmentTransaction[],
  });
}

// Mutations
export function useCreateRecurringTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/recurring-transactions/', payload);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.recurring });
    },
  });
}

export function useToggleRecurringMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(`/recurring-transactions/${id}/toggle_active/`, {});
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.recurring });
    },
  });
}

export function useExecuteRecurringMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.post(`/recurring-transactions/${id}/execute_now/`, {});
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.recurring });
    },
  });
}

export function useCreateInvestmentRecurringMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await apiClient.post('/investments/', payload);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.investments });
    },
  });
}

export function useBuySellInvestmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { id: number; type: 'buy' | 'sell'; payload: any }) => {
      const res = await apiClient.post(`/investments/${args.id}/${args.type}/`, args.payload);
      return (res as any).data as { message: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.investments });
      qc.invalidateQueries({ queryKey: keys.investmentTx });
    },
  });
}
