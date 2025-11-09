import type { Account, BalanceRecord } from '../../types';
import type { HttpClient } from './http';

type BalanceRecordInput = Omit<
  BalanceRecord,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'account_name'
  | 'account_type'
  | 'month_name'
  | 'date_display'
  | 'has_discrepancy'
  | 'balance_status'
  | 'year'
  | 'month'
  | 'entry_type_display'
  | 'reconciliation_status_display'
>;

type BulkMonthlyBalanceUpdate = Array<{
  account_id: number;
  balance: number;
  notes?: string;
}>;

export function createAccountsApi(http: HttpClient) {
  return {
    async getAccounts(): Promise<Account[]> {
      const response = await http.client.get('/accounts/');
      return response.data.results || response.data;
    },

    async createAccount(
      account: Omit<Account, 'id' | 'user_id' | 'created_at' | 'updated_at'>
    ): Promise<Account> {
      const response = await http.client.post('/accounts/', account);
      return response.data;
    },

    async updateAccount(id: number, account: Partial<Account>): Promise<Account> {
      const response = await http.client.patch(`/accounts/${id}/`, account);
      return response.data;
    },

    async deleteAccount(id: number): Promise<void> {
      await http.client.delete(`/accounts/${id}/`);
    },

    async getAccountBalanceRecords(accountId: number): Promise<BalanceRecord[]> {
      const response = await http.client.get(`/accounts/${accountId}/balance_records/`);
      return response.data.results || response.data;
    },

    async createBalanceRecord(entry: BalanceRecordInput): Promise<BalanceRecord> {
      const response = await http.client.post(
        `/accounts/${entry.account}/add_balance_record/`,
        entry
      );
      return response.data;
    },

    async getAccountMonthlyBalances(accountId: number): Promise<BalanceRecord[]> {
      const response = await http.client.get(`/accounts/${accountId}/monthly_balances/`);
      return response.data.results || response.data;
    },

    async getAllMonthlyBalances(): Promise<BalanceRecord[]> {
      const response = await http.client.get('/accounts/monthly_balances_all/');
      return response.data.results || response.data;
    },

    async getDiscrepancies(): Promise<BalanceRecord[]> {
      const response = await http.client.get('/accounts/discrepancies/');
      return response.data.results || response.data;
    },

    async createMonthlyBalance(entry: BalanceRecordInput): Promise<BalanceRecord> {
      const monthlyEntry = {
        ...entry,
        entry_type: 'monthly' as const,
        is_month_end: true,
      };

      const response = await http.client.post(
        `/accounts/${entry.account}/add_monthly_balance/`,
        monthlyEntry
      );
      return response.data;
    },

    async getBalanceRecordsByType(type: string = 'all'): Promise<BalanceRecord[]> {
      const response = await http.client.get(`/accounts/balance_types/?type=${type}`);
      return response.data.results || response.data;
    },

    async bulkUpdateMonthlyBalances(
      updates: BulkMonthlyBalanceUpdate,
      date?: string
    ): Promise<{
      created_records: BalanceRecord[];
      total_updated: number;
      errors: string[];
    }> {
      const payload = {
        updates,
        date: date || new Date().toISOString().split('T')[0],
      };

      const response = await http.client.post('/accounts/bulk_monthly_balance_update/', payload);
      return response.data;
    },

    async mergeAccounts(
      sourceAccountId: number,
      targetAccountId: number,
      mergeStrategy: 'keep_target' | 'sum_balances' = 'keep_target'
    ): Promise<{
      message: string;
      source_account_id: number;
      target_account_id: number;
      transactions_moved: number;
      balance_records_moved: number;
      target_account: Account;
    }> {
      const response = await http.client.post('/accounts/merge/', {
        source_account_id: sourceAccountId,
        target_account_id: targetAccountId,
        merge_strategy: mergeStrategy,
      });

      return response.data;
    },
  };
}
