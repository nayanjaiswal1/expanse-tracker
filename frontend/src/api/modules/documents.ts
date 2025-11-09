import type { HttpClient } from './http';

interface ParsedDocumentResponse {
  raw_text: string;
  pages?: number;
  metadata?: Record<string, unknown>;
  error?: string;
}

export function createDocumentsApi(http: HttpClient) {
  return {
    async parseDocument(file: File, password?: string): Promise<ParsedDocumentResponse> {
      const formData = new FormData();
      formData.append('file', file);

      if (password) {
        formData.append('password', password);
      }

      const response = await http.client.post('/parse-document/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    },

    async processInvoice(file: File): Promise<{
      raw_text: string;
      merchant_name?: string;
      amount?: number;
      date?: string;
      items?: string[];
      confidence?: number;
      suggested_category?: string;
      error?: string;
    }> {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', 'invoice');
      formData.append('auto_process', 'true');

      const response = await http.client.post('/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      return response.data;
    },
  };
}
