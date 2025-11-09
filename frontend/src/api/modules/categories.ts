import type { Category } from '../../types';
import type { HttpClient } from './http';

export function createCategoriesApi(http: HttpClient) {
  return {
    async getCategories(): Promise<Category[]> {
      const response = await http.client.get('/categories/');
      return response.data.results || response.data;
    },

    async createCategory(
      category: Omit<Category, 'id' | 'user_id' | 'created_at'>
    ): Promise<Category> {
      const response = await http.client.post('/categories/', category);
      return response.data;
    },

    async updateCategory(id: number, category: Partial<Category>): Promise<Category> {
      const response = await http.client.patch(`/categories/${id}/`, category);
      return response.data;
    },

    async deleteCategory(id: number): Promise<void> {
      await http.client.delete(`/categories/${id}/`);
    },
  };
}
