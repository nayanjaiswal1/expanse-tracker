import type { HttpClient } from './http';
import type { ExtractedTransaction } from './types';

export function createExtractedTransactionsApi(http: HttpClient) {
  return {
    async getExtractedTransactions(
      params?: Record<string, unknown>
    ): Promise<ExtractedTransaction[]> {
      const response = await http.client.get('/extracted-transactions/', { params });
      return response.data.results || response.data;
    },

    async getExtractedTransactionsSummary(): Promise<{
      pending_count: number;
      approved_count: number;
      rejected_count: number;
      total_amount: string;
    }> {
      const response = await http.client.get('/extracted-transactions/summary/');
      return response.data;
    },

    async performTransactionActions(
      action: string,
      data: Record<string, unknown>
    ): Promise<{ success: boolean; message: string; affected_count?: number }> {
      const response = await http.client.post('/extracted-transactions/actions/', {
        action,
        ...data,
      });

      return response.data;
    },

    async approveExtractedTransaction(
      id: number,
      data?: Record<string, unknown>
    ): Promise<{ success: boolean; transaction_id?: number; message: string }> {
      const response = await http.client.post(`/extracted-transactions/${id}/approve/`, data || {});
      return response.data;
    },

    async rejectExtractedTransaction(
      id: number,
      data?: Record<string, unknown>
    ): Promise<{ success: boolean; message: string }> {
      const response = await http.client.post(`/extracted-transactions/${id}/reject/`, data || {});
      return response.data;
    },
  };
}
