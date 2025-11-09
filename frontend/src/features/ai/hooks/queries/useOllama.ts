import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../../../api';

export interface OllamaModel {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details: Record<string, any>;
  family: string;
  parameters: string;
  capabilities: string[];
  recommended_use: string;
}

export interface SystemInfo {
  available: boolean;
  endpoint: string;
  models_count: number;
  total_storage_used: number;
  models: OllamaModel[];
  server_info: { version: string; status: string };
}

export interface RecommendedModel {
  name: string;
  description: string;
  use_case: string;
  size: string;
  recommended_for: string;
}

const keys = {
  status: ['ollama', 'status'] as const,
  models: (refresh: boolean) => ['ollama', 'models', refresh] as const,
  recommended: ['ollama', 'recommended'] as const,
};

export function useOllamaStatus() {
  return useQuery<{ system_info: SystemInfo }>({
    queryKey: keys.status,
    queryFn: async () => {
      const res = await apiClient.get('/ollama/status/');
      return res.data;
    },
    staleTime: 30 * 1000,
  });
}

export function useOllamaModels(refresh: boolean = true) {
  return useQuery<{ models: OllamaModel[] }>({
    queryKey: keys.models(refresh),
    queryFn: async () => {
      const res = await apiClient.get(`/ollama/models/?refresh=${refresh ? 'true' : 'false'}`);
      return res.data;
    },
  });
}

export function useOllamaRecommended() {
  return useQuery<{ recommended_models: RecommendedModel[] }>({
    queryKey: keys.recommended,
    queryFn: async () => {
      const res = await apiClient.get('/ollama/recommended/');
      return res.data;
    },
  });
}

export function usePullModelMutation() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: async (modelName: string) => {
      const res = await apiClient.post(`/ollama/${encodeURIComponent(modelName)}/pull/`, {});
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.models(true) });
    },
  });
}

export function useRemoveModelMutation() {
  const qc = useQueryClient();
  return useMutation<unknown, Error, string>({
    mutationFn: async (modelName: string) => {
      const res = await apiClient.delete(`/ollama/${encodeURIComponent(modelName)}/remove/`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.models(true) });
    },
  });
}

export function useTestModelMutation() {
  return useMutation<
    { success?: boolean; response?: string; processing_time?: number; error?: string },
    Error,
    { modelName: string; prompt: string }
  >({
    mutationFn: async (args: { modelName: string; prompt: string }) => {
      const res = await apiClient.post(`/ollama/${encodeURIComponent(args.modelName)}/test/`, {
        prompt: args.prompt,
      });
      return res.data;
    },
  });
}
