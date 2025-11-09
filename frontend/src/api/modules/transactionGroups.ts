import type { TransactionGroup } from '../../types';
import { buildUrlParams } from '../utils';
import type { HttpClient } from './http';

export interface TransactionGroupFilters {
  group_type?:
    | 'merchant'
    | 'bank'
    | 'broker'
    | 'person'
    | 'expense_group'
    | 'employer'
    | 'government'
    | 'charity'
    | 'other';
  is_active?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  ordering?: string;
  include_summary?: boolean;
}

export function createTransactionGroupsApi(http: HttpClient) {
  return {
    async getTransactionGroups(
      filters?: Partial<TransactionGroupFilters>
    ): Promise<{ results: TransactionGroup[]; count: number }> {
      const params = filters ? buildUrlParams(filters) : new URLSearchParams();
      const response = await http.client.get(`/transaction-groups/?${params.toString()}`);
      return response.data;
    },

    async getTransactionGroup(id: number, includeSummary = false): Promise<TransactionGroup> {
      const params = new URLSearchParams();
      if (includeSummary) params.append('include_summary', 'true');
      const response = await http.client.get(`/transaction-groups/${id}/?${params.toString()}`);
      return response.data;
    },

    async createTransactionGroup(
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
    ): Promise<TransactionGroup> {
      const response = await http.client.post('/transaction-groups/', group);
      return response.data;
    },

    async updateTransactionGroup(
      id: number,
      group: Partial<TransactionGroup>
    ): Promise<TransactionGroup> {
      const response = await http.client.patch(`/transaction-groups/${id}/`, group);
      return response.data;
    },

    async deleteTransactionGroup(id: number): Promise<void> {
      await http.client.delete(`/transaction-groups/${id}/`);
    },

    async getTransactionGroupSummary(
      id: number,
      startDate?: string,
      endDate?: string
    ): Promise<{
      total_transactions: number;
      total_expenses: string;
      total_income: string;
      avg_transaction: string;
      net_flow: string;
    }> {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);

      const response = await http.client.get(
        `/transaction-groups/${id}/summary/?${params.toString()}`
      );
      return response.data;
    },

    async searchTransactionGroups(query: string, groupType?: string): Promise<TransactionGroup[]> {
      const params = new URLSearchParams();
      params.append('search', query);
      if (groupType) params.append('group_type', groupType);

      const response = await http.client.get(`/transaction-groups/?${params.toString()}`);
      return response.data.results || response.data;
    },
  };
}
