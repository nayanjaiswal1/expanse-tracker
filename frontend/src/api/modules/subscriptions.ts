import type { HttpClient } from './http';
import type { Subscription, SubscriptionSummary } from './types';

export function createSubscriptionsApi(http: HttpClient) {
  return {
    async getSubscriptions(): Promise<Subscription[]> {
      const response = await http.client.get('/subscriptions/');
      return response.data.results || response.data;
    },

    async createSubscription(
      subscription: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>
    ): Promise<Subscription> {
      const response = await http.client.post('/subscriptions/', subscription);
      return response.data;
    },

    async updateSubscription(
      id: number,
      subscription: Partial<Subscription>
    ): Promise<Subscription> {
      const response = await http.client.patch(`/subscriptions/${id}/`, subscription);
      return response.data;
    },

    async deleteSubscription(id: number): Promise<void> {
      await http.client.delete(`/subscriptions/${id}/`);
    },

    async detectSubscriptions(
      lookbackDays: number = 365
    ): Promise<{ detected_subscriptions: Partial<Subscription>[]; count: number }> {
      const response = await http.client.post('/subscriptions/detect_subscriptions/', {
        lookback_days: lookbackDays,
      });

      return response.data;
    },

    async createSubscriptionFromDetection(
      detectionData: Partial<Subscription>
    ): Promise<Subscription> {
      const response = await http.client.post('/subscriptions/create_from_detection/', {
        detection_data: detectionData,
      });

      return response.data;
    },

    async getSubscriptionSummary(): Promise<SubscriptionSummary> {
      const response = await http.client.get('/subscriptions/summary/');
      return response.data;
    },

    async getUpcomingRenewals(days: number = 7): Promise<Subscription[]> {
      const response = await http.client.get(`/subscriptions/upcoming_renewals/?days=${days}`);
      return response.data;
    },

    async getMissedPayments(graceDays: number = 5): Promise<Subscription[]> {
      const response = await http.client.get(
        `/subscriptions/missed_payments/?grace_days=${graceDays}`
      );
      return response.data;
    },

    async pauseSubscription(id: number): Promise<Subscription> {
      const response = await http.client.post(`/subscriptions/${id}/pause/`);
      return response.data;
    },

    async resumeSubscription(id: number): Promise<Subscription> {
      const response = await http.client.post(`/subscriptions/${id}/resume/`);
      return response.data;
    },

    async cancelSubscription(id: number): Promise<Subscription> {
      const response = await http.client.post(`/subscriptions/${id}/cancel/`);
      return response.data;
    },
  };
}
