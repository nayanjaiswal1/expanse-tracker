import type { TransactionImport, UploadSession, UploadStats } from '../../types';
import type { HttpClient } from './http';

export function createUploadsApi(http: HttpClient) {
  return {
    async uploadFile(file: File, password?: string, accountId?: number): Promise<UploadSession> {
      const formData = new FormData();
      formData.append('file', file);

      if (password) {
        formData.append('password', password);
      }
      if (accountId) {
        formData.append('account_id', accountId.toString());
      }

      const response = await http.client.post('/upload-sessions/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    },

    async getUploadSessions(accountId?: number): Promise<UploadSession[]> {
      const params = accountId ? { account_id: accountId } : {};
      const response = await http.client.get('/upload-sessions/', { params });
      return response.data.results || response.data;
    },

    async getUploadStatus(sessionId: number): Promise<UploadSession> {
      const response = await http.client.get(`/upload-sessions/${sessionId}/status/`);
      return response.data;
    },

    async updateUploadSession(
      sessionId: number,
      data: { account_id?: number }
    ): Promise<UploadSession> {
      const response = await http.client.patch(
        `/upload-sessions/${sessionId}/update-account/`,
        data
      );
      return response.data;
    },

    async deleteUploadSession(sessionId: number): Promise<void> {
      await http.client.delete(`/upload-sessions/${sessionId}/`);
    },

    async retryUploadSession(sessionId: number, password?: string): Promise<UploadSession> {
      const response = await http.client.post(`/upload-sessions/${sessionId}/retry/`, {
        password: password || '',
      });
      return response.data;
    },

    async getUploadSessionTransactions(sessionId: number): Promise<TransactionImport[]> {
      const response = await http.client.get(`/upload-sessions/${sessionId}/transactions/`);
      return response.data;
    },

    async getUploadStats(): Promise<UploadStats> {
      const response = await http.client.get('/upload-sessions/stats/');
      return response.data;
    },

    async processReceipt(
      receiptImage: File,
      accountId?: number
    ): Promise<{
      success: boolean;
      ocr_result: {
        merchant_name?: string;
        amount?: string;
        date?: string;
        items: string[];
        suggested_category?: string;
        confidence: number;
        ai_analysis?: string;
        raw_text: string;
      };
      suggestions: {
        create_transaction: boolean;
        account_id?: number;
        account_name?: string;
      };
    }> {
      const formData = new FormData();
      formData.append('receipt_image', receiptImage);
      if (accountId) {
        formData.append('account_id', accountId.toString());
      }

      const response = await http.client.post('/upload/process_receipt/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    },

    async createTransactionFromReceipt(data: {
      merchant_name: string;
      amount: number | string;
      date: string;
      account_id: number;
      category_name?: string;
      items?: string[];
      notes?: string;
    }): Promise<{
      success: boolean;
      transaction_id: number;
      message: string;
    }> {
      const response = await http.client.post('/upload/create_transaction_from_receipt/', data);
      return response.data;
    },
  };
}
