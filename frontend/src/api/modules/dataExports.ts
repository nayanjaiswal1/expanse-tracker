import type { HttpClient } from './http';

export function createDataExportApi(http: HttpClient) {
  return {
    async importTransactions(
      formData: FormData,
      importType: string
    ): Promise<{
      success: boolean;
      imported_count: number;
      errors?: string[];
      session_id?: number;
    }> {
      const response = await http.client.post(
        `/transactions/import/?format=${importType}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      return response.data;
    },

    async getExportOptions(): Promise<any> {
      const response = await http.client.get('/export/');
      return response.data;
    },

    async exportData(params: {
      data_type: string;
      format: string;
      fields?: string[];
      filters?: Record<string, any>;
    }): Promise<Blob> {
      const response = await http.client.post('/export/', params, { responseType: 'blob' });
      return response.data;
    },
  };
}
