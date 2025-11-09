import type { HttpClient } from './http';

export function createExpenseGroupsApi(http: HttpClient) {
  return {
    async getExpenseGroups(): Promise<any[]> {
      const response = await http.client.get('/expense-groups/');
      return response.data.results || response.data;
    },

    async createExpenseGroup(data: {
      name: string;
      description?: string;
      group_type?: string;
    }): Promise<any> {
      const response = await http.client.post('/expense-groups/', data);
      return response.data;
    },

    async updateExpenseGroup(
      id: number,
      data: Partial<{ name: string; description: string; group_type: string }>
    ): Promise<any> {
      const response = await http.client.patch(`/expense-groups/${id}/`, data);
      return response.data;
    },

    async deleteExpenseGroup(id: number): Promise<void> {
      await http.client.delete(`/expense-groups/${id}/`);
    },

    async getExpenseGroupMembers(groupId: number): Promise<any[]> {
      const response = await http.client.get(`/expense-groups/${groupId}/members/`);
      return response.data;
    },

    async addExpenseGroupMember(
      groupId: number,
      userIdOrEmail: number | string,
      role?: string
    ): Promise<any> {
      const payload: Record<string, unknown> = { role: role || 'member' };

      if (typeof userIdOrEmail === 'number') {
        payload.user_id = userIdOrEmail;
      } else {
        payload.email = userIdOrEmail;
      }

      const response = await http.client.post(`/expense-groups/${groupId}/add_member/`, payload);
      return response.data;
    },

    async removeExpenseGroupMember(groupId: number, userId: number): Promise<void> {
      await http.client.delete(`/expense-groups/${groupId}/remove_member/`, {
        data: { user_id: userId },
      });
    },

    async getExpenseGroupBalances(groupId: number): Promise<any[]> {
      const response = await http.client.get(`/expense-groups/${groupId}/balances/`);
      return response.data;
    },

    async getUserOverallBalances(): Promise<any> {
      const response = await http.client.get('/balances/');
      return response.data;
    },

    async getGroupExpensesForGroup(groupId: number): Promise<any[]> {
      const response = await http.client.get(`/expense-groups/${groupId}/expenses/`);
      return response.data.results || response.data;
    },

    async createGroupExpenseInGroup(
      groupId: number,
      data: {
        title: string;
        description?: string;
        total_amount: string;
        date: string;
        split_method?: string;
        shares_data?: any[];
      }
    ): Promise<any> {
      const response = await http.client.post(`/expense-groups/${groupId}/expenses/`, data);
      return response.data;
    },

    async updateGroupExpenseInGroup(groupId: number, expenseId: number, data: any): Promise<any> {
      const response = await http.client.patch(
        `/expense-groups/${groupId}/expenses/${expenseId}/`,
        data
      );
      return response.data;
    },

    async deleteGroupExpenseInGroup(groupId: number, expenseId: number): Promise<void> {
      await http.client.delete(`/expense-groups/${groupId}/expenses/${expenseId}/`);
    },

    async settleGroupExpense(groupId: number, expenseId: number): Promise<any> {
      const response = await http.client.post(
        `/expense-groups/${groupId}/expenses/${expenseId}/settle/`
      );
      return response.data;
    },

    async getGroupExpenseSettlementStatus(groupId: number, expenseId: number): Promise<any> {
      const response = await http.client.get(
        `/expense-groups/${groupId}/expenses/${expenseId}/settlement_status/`
      );
      return response.data;
    },

    async getGroupExpensesSummary(groupId: number): Promise<any> {
      const response = await http.client.get(`/expense-groups/${groupId}/expenses/summary/`);
      return response.data;
    },
  };
}
