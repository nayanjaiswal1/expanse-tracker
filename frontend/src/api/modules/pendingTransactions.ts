import type { Account, Transaction } from '../../types';
import type { HttpClient } from './http';

interface PendingTransactionStats {
  total_count: number;
  total_expense: number;
  total_income: number;
  without_account: number;
  by_date: Array<{ date: string; count: number }>;
  by_type: Array<{ transaction_type: string; count: number }>;
}

export function createPendingTransactionsApi(http: HttpClient) {
  return {
    async getPendingTransactions(): Promise<Transaction[]> {
      const response = await http.client.get('/pending-transactions/');
      return response.data.results || response.data;
    },

    async getPendingTransactionCount(): Promise<{ count: number }> {
      const response = await http.client.get('/pending-transactions/count/');
      return response.data;
    },

    async confirmPendingTransaction(
      id: number,
      updates?: Partial<Transaction>
    ): Promise<{ message: string; transaction: Transaction }> {
      const response = await http.client.post(
        `/pending-transactions/${id}/confirm/`,
        updates || {}
      );
      return response.data;
    },

    async confirmPendingTransactionsBulk(
      transactionIds: number[]
    ): Promise<{ message: string; confirmed_count: number }> {
      const response = await http.client.post('/pending-transactions/confirm-bulk/', {
        transaction_ids: transactionIds,
      });
      return response.data;
    },

    async rejectPendingTransaction(id: number): Promise<{ message: string }> {
      const response = await http.client.delete(`/pending-transactions/${id}/reject/`);
      return response.data;
    },

    async assignAccountToPending(
      id: number,
      accountId: number
    ): Promise<{ message: string; transaction: Transaction }> {
      const response = await http.client.patch(`/pending-transactions/${id}/assign-account/`, {
        account_id: accountId,
      });
      return response.data;
    },

    async createAccountFromPending(
      id: number,
      accountName: string
    ): Promise<{ message: string; account: Account; transaction: Transaction }> {
      const response = await http.client.patch(`/pending-transactions/${id}/assign-account/`, {
        create_account: { name: accountName },
      });

      return response.data;
    },

    async getPendingTransactionStats(): Promise<PendingTransactionStats> {
      const response = await http.client.get('/pending-transactions/stats/');
      return response.data;
    },

    async parseEmailToTransaction(
      gmailMessage: unknown,
      gmailMessageId?: string
    ): Promise<{
      success: boolean;
      message: string;
      transaction?: unknown;
      account?: unknown;
      account_suggestions?: unknown[];
      account_info?: unknown;
      needs_review?: boolean;
    }> {
      const response = await http.client.post('/pending-transactions/parse-email/', {
        gmail_message: gmailMessage,
        gmail_message_id: gmailMessageId,
      });

      return response.data;
    },
  };
}
