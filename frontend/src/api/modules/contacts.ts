import type { Contact } from '../../types';
import type { HttpClient } from './http';

export function createContactsApi(http: HttpClient) {
  return {
    async getContacts(): Promise<Contact[]> {
      const response = await http.client.get('/contacts/');
      return response.data.results || response.data;
    },

    async createContact(data: Omit<Contact, 'id' | 'created_at' | 'updated_at'>): Promise<Contact> {
      const response = await http.client.post('/contacts/', data);
      return response.data;
    },

    async updateContact(id: number, data: Partial<Contact>): Promise<Contact> {
      const response = await http.client.patch(`/contacts/${id}/`, data);
      return response.data;
    },

    async deleteContact(id: number): Promise<void> {
      await http.client.delete(`/contacts/${id}/`);
    },
  };
}
