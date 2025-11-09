import type { HttpClient } from './http';

export function createSplitwiseApi(http: HttpClient) {
  return {
    async getSplitwiseIntegration(): Promise<any> {
      const response = await http.client.get('/integrations/splitwise/');
      return response.data;
    },

    async connectSplitwiseIntegration(data: {
      access_token: string;
      auto_sync_enabled?: boolean;
      sync_interval_minutes?: number;
      import_existing_groups?: boolean;
      import_existing_expenses?: boolean;
    }): Promise<any> {
      const response = await http.client.post('/integrations/splitwise/', data);
      return response.data;
    },

    async updateSplitwiseIntegration(data: {
      is_active?: boolean;
      auto_sync_enabled?: boolean;
      sync_interval_minutes?: number;
    }): Promise<any> {
      const response = await http.client.patch('/integrations/splitwise/1/', data);
      return response.data;
    },

    async disconnectSplitwiseIntegration(): Promise<void> {
      await http.client.delete('/integrations/splitwise/1/');
    },

    async triggerSplitwiseSync(data?: {
      sync_type?: 'full_import' | 'incremental';
      force?: boolean;
    }): Promise<any> {
      const response = await http.client.post('/integrations/splitwise/sync/', data || {});
      return response.data;
    },

    async getSplitwiseSyncLogs(): Promise<any[]> {
      const response = await http.client.get('/integrations/splitwise/sync_logs/');
      return response.data;
    },

    async getSplitwiseGroups(): Promise<any[]> {
      const response = await http.client.get('/integrations/splitwise/groups/');
      return response.data;
    },

    async updateSplitwiseGroupMapping(
      mappingId: number,
      data: {
        sync_enabled?: boolean;
        sync_direction?: 'bidirectional' | 'to_splitwise' | 'from_splitwise';
      }
    ): Promise<any> {
      const response = await http.client.patch(
        `/integrations/splitwise/groups/${mappingId}/`,
        data
      );
      return response.data;
    },

    async getSplitwiseExpenses(groupMappingId?: number): Promise<any[]> {
      const url = groupMappingId
        ? `/integrations/splitwise/expenses/?group_mapping_id=${groupMappingId}`
        : '/integrations/splitwise/expenses/';

      const response = await http.client.get(url);
      return response.data;
    },

    async pushExpenseToSplitwise(expenseId: number, createGroupIfNeeded = false): Promise<any> {
      const response = await http.client.post('/integrations/splitwise/push-expense/', {
        expense_id: expenseId,
        create_group_if_needed: createGroupIfNeeded,
      });

      return response.data;
    },
  };
}
