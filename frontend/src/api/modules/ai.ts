import type { HttpClient } from './http';
import type { AISettingsBootstrap } from '../../types';

export interface ChatRequest {
  message: string;
  timeframe?: string;
}

export interface ChatResponse {
  reply: string;
  timeframe: string;
  context?: Record<string, unknown>;
}

export function createAiApi(http: HttpClient) {
  return {
    async getAISettingsBootstrap(days: number): Promise<AISettingsBootstrap> {
      const res = await http.client.get(`/ai-config/bootstrap/`, {
        params: { days },
      });
      return (res as any).data;
    },

    async chatWithAI(payload: ChatRequest): Promise<ChatResponse> {
      const res = await http.client.post('/chat/', payload);
      return (res as any).data;
    },
  };
}
