import type { Goal } from '../../types';
import type { HttpClient } from './http';

export function createGoalsApi(http: HttpClient) {
  return {
    async getGoals(): Promise<Goal[]> {
      const response = await http.client.get('/goals/');
      return response.data.results || response.data;
    },

    async createGoal(
      goal:
        | FormData
        | Omit<
            Goal,
            | 'id'
            | 'progress_percentage'
            | 'remaining_amount'
            | 'is_completed'
            | 'created_at'
            | 'updated_at'
          >
    ): Promise<Goal> {
      const headers = goal instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
      const response = await http.client.post('/goals/', goal, { headers });
      return response.data;
    },

    async updateGoal(id: number, goal: FormData | Partial<Goal>): Promise<Goal> {
      const headers = goal instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
      const response = await http.client.patch(`/goals/${id}/`, goal, { headers });
      return response.data;
    },

    async deleteGoal(id: number): Promise<void> {
      await http.client.delete(`/goals/${id}/`);
    },

    async updateGoalProgress(id: number, amount: number): Promise<Goal> {
      const response = await http.client.post(`/goals/${id}/update_progress/`, { amount });
      return response.data;
    },

    async toggleGoalStatus(id: number, status: 'active' | 'paused' | 'cancelled'): Promise<Goal> {
      const response = await http.client.post(`/goals/${id}/toggle_status/`, { status });
      return response.data;
    },
  };
}
