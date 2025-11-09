import type { HttpClient } from './http';
import type { GmailSyncStatus } from './types';

export interface GmailAccount {
  id: number;
  name: string;
  email: string;
  is_active: boolean;
  transaction_tag: string;
  sender_filters: string[];
  keyword_filters: string[];
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
  connected?: boolean;
}

export function createGmailApi(http: HttpClient) {
  return {
    // Legacy single-account endpoints (kept for backward compatibility)
    async getGmailAccount(): Promise<unknown> {
      const response = await http.client.get('/integrations/gmail-account/');
      return response.data;
    },

    async connectGmail(): Promise<{ authorization_url: string; state: string }> {
      const response = await http.client.get('/integrations/gmail-connect/');
      return response.data;
    },

    async disconnectGmail(): Promise<{ message: string }> {
      const response = await http.client.delete('/integrations/gmail-account/');
      return response.data;
    },

    async updateGmailSettings(data: {
      email_filter_keywords?: string[];
      email_filter_senders?: string[];
    }): Promise<unknown> {
      const response = await http.client.patch('/integrations/gmail-account/', data);
      return response.data;
    },

    async testGmailFetch(): Promise<{ message: string; task_id: string }> {
      const response = await http.client.post('/integrations/gmail-test-fetch/');
      return response.data;
    },

    // New multi-account endpoints under /integrations
    async listGmailAccounts(): Promise<GmailAccount[]> {
      const response = await http.client.get('/integrations/gmail-accounts/');
      const data = response.data;
      return data?.accounts ?? data?.results ?? data ?? [];
    },

    async updateGmailAccount(
      accountId: number,
      data: Partial<
        Pick<
          GmailAccount,
          'name' | 'transaction_tag' | 'sender_filters' | 'keyword_filters' | 'is_active'
        >
      >
    ): Promise<GmailAccount> {
      const response = await http.client.patch(`/integrations/gmail-accounts/${accountId}/`, data);
      return response.data;
    },

    async deleteGmailAccount(accountId: number): Promise<{ message?: string }> {
      const response = await http.client.delete(`/integrations/gmail-accounts/${accountId}/`);
      return response.data;
    },

    async syncAllGmail(): Promise<{ status?: string; message?: string }> {
      const response = await http.client.post('/integrations/gmail-sync/');
      return response.data;
    },

    async syncGmailAccount(accountId: number): Promise<{ status?: string; message?: string }> {
      const response = await http.client.post(`/integrations/gmail-accounts/${accountId}/sync/`);
      return response.data;
    },

    // Optional: expose status structure if/when backend provides it under /integrations
    async getGmailSyncStatus(): Promise<GmailSyncStatus[]> {
      const response = await http.client.get('/gmail-sync/status/');
      return response.data;
    },
  };
}
