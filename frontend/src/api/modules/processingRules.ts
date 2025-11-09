import type { Transaction } from '../../types';
import type { HttpClient } from './http';
import type { ProcessingRule } from './types';

export function createProcessingRulesApi(http: HttpClient) {
  return {
    async getProcessingRules(): Promise<ProcessingRule[]> {
      const response = await http.client.get('/processing-rules/');
      return response.data.results || response.data;
    },

    async createProcessingRule(
      rule: Omit<ProcessingRule, 'id' | 'created_at' | 'updated_at'>
    ): Promise<ProcessingRule> {
      const response = await http.client.post('/processing-rules/', rule);
      return response.data;
    },

    async updateProcessingRule(id: number, rule: Partial<ProcessingRule>): Promise<ProcessingRule> {
      const response = await http.client.patch(`/processing-rules/${id}/`, rule);
      return response.data;
    },

    async deleteProcessingRule(id: number): Promise<void> {
      await http.client.delete(`/processing-rules/${id}/`);
    },

    async getProcessingRuleChoices(): Promise<{
      field_choices?: Record<string, string[]>;
      operator_choices?: Record<string, string[]>;
      action_choices?: Record<string, string[]>;
    }> {
      const response = await http.client.get('/processing-rules/choices/');
      return response.data;
    },

    async testProcessingRule(id: number): Promise<{
      matched_transactions: Transaction[];
      match_count: number;
      total_tested?: number;
    }> {
      const response = await http.client.post(`/processing-rules/${id}/test_rule/`);
      return response.data;
    },

    async applyProcessingRuleToExisting(
      id: number
    ): Promise<{ updated_count: number; affected_transactions: number[] }> {
      const response = await http.client.post(`/processing-rules/${id}/apply_to_existing/`);
      return response.data;
    },

    async reorderProcessingRules(
      ruleIds: number[]
    ): Promise<{ success: boolean; updated_rules: ProcessingRule[] }> {
      const response = await http.client.post('/processing-rules/reorder/', { rule_ids: ruleIds });
      return response.data;
    },
  };
}
