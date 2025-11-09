import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';

export interface PortfolioSummary {
  total_value: number;
  total_cost_basis: number;
  total_gain_loss: number;
  total_return_percent: number;
  total_dividends: number;
  investment_count: number;
}

export interface Investment {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  current_price: number;
  current_value: number;
  cost_basis: number;
  unrealized_gain: number;
  unrealized_gain_percent: number;
  dividends_received: number;
  sector: string;
  type: string;
  performance: {
    total_return: number;
    unrealized_gains: number;
    realized_gains: number;
  };
}

export interface GmailAccount {
  id: string;
  email_address: string;
  status: string;
}

export interface PendingTransaction {
  id: string;
  email_subject: string;
  email_sender: string;
  email_date: string;
  parsed_amount: number;
  parsed_description: string;
  confidence_score: number;
  investment_data: {
    symbol: string;
    transaction_type: string;
    amount: number;
    quantity: number;
    price_per_share: number;
    broker: string;
    description: string;
  };
  status: string;
}

const keys = {
  portfolio: ['investments', 'portfolio'] as const,
  gmail: ['gmail-accounts', 'list'] as const,
  pending: ['investments', 'pending'] as const,
};

export function usePortfolio() {
  return useQuery({
    queryKey: keys.portfolio,
    queryFn: async (): Promise<{ summary: PortfolioSummary; investments: Investment[] }> => {
      const res = await apiClient.get('/investments/portfolio_summary/');
      return (res as any).data as { summary: PortfolioSummary; investments: Investment[] };
    },
    staleTime: 60 * 1000,
  });
}

export function useGmailAccounts() {
  return useQuery({
    queryKey: keys.gmail,
    queryFn: async (): Promise<{ gmail_accounts: GmailAccount[] }> => {
      const res = await apiClient.get('/gmail-accounts/');
      return (res as any).data as { gmail_accounts: GmailAccount[] };
    },
  });
}

export function usePendingInvestmentTransactions() {
  return useQuery({
    queryKey: keys.pending,
    queryFn: async (): Promise<{ pending_transactions: PendingTransaction[] }> => {
      const res = await apiClient.get('/investments/pending_transactions/');
      return (res as any).data as { pending_transactions: PendingTransaction[] };
    },
  });
}

export function useCreateInvestmentMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      symbol: string;
      name: string;
      type: string;
      current_price: number;
      sector?: string;
      broker?: string;
    }) => {
      const res = await apiClient.post('/investments/create_investment/', payload);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.portfolio });
    },
  });
}

export function useParseInvestmentEmailsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { gmail_account_id: string; days_back?: number }) => {
      const res = await apiClient.post('/investments/parse_emails/', payload);
      return (res as any).data as {
        success?: boolean;
        extracted?: number;
        processed?: number;
        error?: string;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.pending });
    },
  });
}

export function useApproveInvestmentTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { transaction_id: string; overrides?: any }) => {
      const res = await apiClient.post('/investments/approve_transaction/', payload);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.pending });
      qc.invalidateQueries({ queryKey: keys.portfolio });
    },
  });
}

export function useRejectInvestmentTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { transaction_id: string }) => {
      const res = await apiClient.post('/investments/reject_transaction/', payload);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.pending });
    },
  });
}
