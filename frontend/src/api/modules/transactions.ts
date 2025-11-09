import type {
  Filter,
  Summary,
  Transaction,
  TransactionSplit,
  TransactionLink,
  UnifiedTransaction,
} from '../../types';
import { buildUrlParams } from '../utils';
import type { LendingSummary, TransactionSuggestion } from './types';
import type { HttpClient } from './http';

export function createTransactionsApi(http: HttpClient) {
  return {
    async getTransactionLinks(): Promise<TransactionLink[]> {
      const response = await http.client.get('/transaction-links/');
      return response.data.results || response.data;
    },

    async confirmTransactionLink(id: number): Promise<TransactionLink> {
      const response = await http.client.post(`/transaction-links/${id}/confirm/`);
      return response.data;
    },

    async getTransactions(
      filters?: Partial<Filter>
    ): Promise<{ results: Transaction[]; count: number }> {
      const params = filters ? buildUrlParams(filters) : new URLSearchParams();
      const response = await http.client.get(`/transactions/?${params.toString()}`);
      return response.data;
    },

    async getTransaction(id: number): Promise<Transaction> {
      const response = await http.client.get(`/transactions/${id}/`);
      return response.data;
    },

    async createTransaction(
      transaction: Omit<Transaction, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    ): Promise<Transaction> {
      const response = await http.client.post('/transactions/', transaction);
      return response.data;
    },

    async updateTransaction(id: number, transaction: Partial<Transaction>): Promise<Transaction> {
      const response = await http.client.patch(`/transactions/${id}/`, transaction);
      return response.data;
    },

    async deleteTransaction(id: number): Promise<void> {
      await http.client.delete(`/transactions/${id}/`);
    },

    async updateTransactionSplits(id: number, splits: TransactionSplit[]): Promise<Transaction> {
      const response = await http.client.post(`/transactions/${id}/split/`, { splits });
      return response.data;
    },

    async bulkUpdateTransactionAccount(
      transactionIds: number[],
      accountId: number
    ): Promise<{ updated_count: number; account_name: string }> {
      const response = await http.client.post('/transactions/bulk_update_account/', {
        transaction_ids: transactionIds,
        account_id: accountId,
      });
      return response.data;
    },

    async bulkUpdateTransactions(updates: Array<{ id: number; [key: string]: unknown }>): Promise<{
      updated_count: number;
      updated_transactions: Transaction[];
      errors: Array<{ id?: number; error?: string; errors?: Record<string, string[]> }>;
    }> {
      const response = await http.client.patch('/transactions/bulk-update/', { updates });
      return response.data;
    },

    async suggestTransactionLinks(id: number): Promise<{ suggestions: TransactionSuggestion[] }> {
      const response = await http.client.get(`/transactions/${id}/suggest_links/`);
      return response.data;
    },

    async autoCategorizTransaction(id: number): Promise<Transaction> {
      const response = await http.client.post(`/transactions/${id}/auto_categorize/`);
      return response.data;
    },

    async acceptSuggestedCategory(id: number): Promise<Transaction> {
      const response = await http.client.post(`/transactions/${id}/accept_suggestion/`);
      return response.data;
    },

    async getTransactionSummary(filters?: Partial<Filter>): Promise<Summary> {
      const params = filters ? buildUrlParams(filters) : new URLSearchParams();
      const response = await http.client.get(`/transactions/summary/?${params.toString()}`);
      return response.data;
    },

    async getRecurringTransactions(): Promise<Transaction[]> {
      const response = await http.client.get('/transactions/recurring/');
      return response.data.results || response.data;
    },

    async makeTransactionRecurring(
      id: number,
      frequency: string,
      next_occurrence?: string,
      end_date?: string
    ): Promise<Transaction> {
      const response = await http.client.post(`/transactions/${id}/make_recurring/`, {
        frequency,
        next_occurrence,
        end_date,
      });

      return response.data;
    },

    async stopRecurringTransaction(id: number): Promise<Transaction> {
      const response = await http.client.post(`/transactions/${id}/stop_recurring/`);
      return response.data;
    },

    async getLendingTransactions(contactId?: number): Promise<UnifiedTransaction[]> {
      const params = new URLSearchParams();
      if (contactId) params.append('contact_id', contactId.toString());

      const response = await http.client.get(`/transactions/lending/?${params.toString()}`);
      return response.data.results || response.data;
    },

    async createLendingTransaction(data: {
      contact_user: number;
      account: number;
      transaction_type: 'lend' | 'borrow';
      amount: string;
      description: string;
      date: string;
      due_date?: string;
      interest_rate?: string;
      notes?: string;
    }): Promise<UnifiedTransaction> {
      const response = await http.client.post('/transactions/create_lending/', data);
      return response.data;
    },

    async recordLendingRepayment(
      lendingId: number,
      amount: string,
      date?: string,
      notes?: string
    ): Promise<UnifiedTransaction> {
      const response = await http.client.post(`/transactions/${lendingId}/record_repayment/`, {
        amount,
        date,
        notes,
      });

      return response.data;
    },

    async getLendingSummary(): Promise<LendingSummary> {
      const response = await http.client.get('/transactions/lending_summary/');
      return response.data;
    },

    async getGroupExpenseTransactions(groupId?: number): Promise<UnifiedTransaction[]> {
      const params = new URLSearchParams();
      if (groupId) params.append('group_id', groupId.toString());

      const response = await http.client.get(`/transactions/group_expenses/?${params.toString()}`);
      return response.data.results || response.data;
    },

    async exportTransactions(
      format: 'csv' | 'json' | 'excel' | 'pdf',
      transactionIds?: number[],
      filters?: Partial<Filter>
    ): Promise<Blob> {
      const params = new URLSearchParams();
      params.append('format', format);

      if (transactionIds?.length) {
        params.append('transaction_ids', transactionIds.join(','));
      }

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
              value.forEach((v) => params.append(key, v.toString()));
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      const response = await http.client.get(`/transactions/export/?${params.toString()}`, {
        responseType: 'blob',
      });
      return response.data;
    },
  };
}
