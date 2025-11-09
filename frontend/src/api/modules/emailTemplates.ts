import type { HttpClient } from './http';
import type { EmailTemplate } from './types';

export function createEmailTemplatesApi(http: HttpClient) {
  return {
    async getEmailTemplates(): Promise<EmailTemplate[]> {
      const response = await http.client.get('/email-templates/');
      return response.data.results || response.data;
    },

    async createEmailTemplate(
      template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>
    ): Promise<EmailTemplate> {
      const response = await http.client.post('/email-templates/', template);
      return response.data;
    },

    async updateEmailTemplate(
      id: number,
      template: Partial<EmailTemplate>
    ): Promise<EmailTemplate> {
      const response = await http.client.patch(`/email-templates/${id}/`, template);
      return response.data;
    },

    async deleteEmailTemplate(id: number): Promise<void> {
      await http.client.delete(`/email-templates/${id}/`);
    },

    async getCommonEmailPatterns(): Promise<{
      patterns: Partial<EmailTemplate>[];
      categories: string[];
    }> {
      const response = await http.client.get('/email-templates/common_patterns/');
      return response.data;
    },
  };
}
