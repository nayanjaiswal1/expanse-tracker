import { apiClient } from '../../../api';

export const newsletterApi = {
  async subscribe(email: string): Promise<{ message?: string; error?: string }> {
    const res = await apiClient.post('/newsletter/subscribe/', { email });
    return (res as any).data;
  },
};
