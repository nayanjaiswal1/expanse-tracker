import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';
import type {
  AISettings,
  AISettingsBootstrap,
  AIUsageStats,
  AISystemStatus,
} from '../../../../types';

const ROOT_KEY = 'ai-settings';

const keys = {
  bootstrap: (days: number) => [ROOT_KEY, 'bootstrap', days] as const,
};

export function useAISettingsBootstrap(days: number = 30) {
  return useQuery({
    queryKey: keys.bootstrap(days),
    queryFn: (): Promise<AISettingsBootstrap> => apiClient.getAISettingsBootstrap(days),
  });
}

export function useAISettings(days: number = 30) {
  return useQuery({
    queryKey: keys.bootstrap(days),
    queryFn: (): Promise<AISettingsBootstrap> => apiClient.getAISettingsBootstrap(days),
    select: (data: AISettingsBootstrap): AISettings => data.settings,
  });
}

export function useAIUsageStats(days: number = 30) {
  return useQuery({
    queryKey: keys.bootstrap(days),
    queryFn: (): Promise<AISettingsBootstrap> => apiClient.getAISettingsBootstrap(days),
    select: (data: AISettingsBootstrap): AIUsageStats => ({
      ...data.usage,
      period_days: data.usage.period_days ?? days,
    }),
  });
}

export function useAISystemStatus(days: number = 30) {
  return useQuery({
    queryKey: keys.bootstrap(days),
    queryFn: (): Promise<AISettingsBootstrap> => apiClient.getAISettingsBootstrap(days),
    select: (data: AISettingsBootstrap): AISystemStatus => data.system,
  });
}

export function useUpdateAISettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { settings: AISettings }) => {
      const res = await apiClient.post('/ai-config/update-settings/', payload);
      return (res as any).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [ROOT_KEY] });
    },
  });
}

export function useTestAIConnectionMutation() {
  return useMutation({
    mutationFn: async (payload: { provider: 'openai' | 'ollama' | 'system' }) => {
      const res = await apiClient.post('/ai-config/test-connection/', payload);
      return (res as any).data as {
        success?: boolean;
        provider?: string;
        model?: string;
        processing_time?: number;
        error?: string;
      };
    },
  });
}

export type {
  AISettings,
  AIUsageStats as UsageStats,
  AISystemStatus as SystemStatus,
} from '../../../../types';
