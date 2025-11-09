import type { MerchantPattern } from '../../types';
import type { HttpClient } from './http';

export function createMerchantPatternsApi(http: HttpClient) {
  return {
    async getMerchantPatterns(): Promise<MerchantPattern[]> {
      const response = await http.client.get('/merchant-patterns/');
      return response.data.results || response.data;
    },

    async createMerchantPattern(
      pattern: Omit<
        MerchantPattern,
        'id' | 'created_at' | 'last_used' | 'usage_count' | 'category_name'
      >
    ): Promise<MerchantPattern> {
      const response = await http.client.post('/merchant-patterns/', pattern);
      return response.data;
    },

    async updateMerchantPattern(
      id: number,
      pattern: Partial<MerchantPattern>
    ): Promise<MerchantPattern> {
      const response = await http.client.patch(`/merchant-patterns/${id}/`, pattern);
      return response.data;
    },

    async deleteMerchantPattern(id: number): Promise<void> {
      await http.client.delete(`/merchant-patterns/${id}/`);
    },
  };
}
