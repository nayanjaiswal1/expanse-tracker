import { apiClient } from '../../../api';
import type { TelegramBot, TelegramUser, BotStatistics, SetupGuide } from '../schemas';

export const telegramApi = {
  async listBots(): Promise<{ results?: TelegramBot[] } | TelegramBot[]> {
    const res = await apiClient.get('/telegram-bots/');
    return (res as any).data;
  },
  async listUsers(): Promise<{ results?: TelegramUser[] } | TelegramUser[]> {
    const res = await apiClient.get('/telegram-users/');
    return (res as any).data;
  },
  async getSetupGuide(): Promise<SetupGuide> {
    const res = await apiClient.get('/telegram/setup-guide/');
    return (res as any).data;
  },
  async getBotStatistics(botId: number): Promise<BotStatistics> {
    const res = await apiClient.get(`/telegram-bots/${botId}/statistics/`);
    return (res as any).data;
  },
  async createBot(payload: {
    name: string;
    bot_token: string;
    webhook_url?: string;
  }): Promise<TelegramBot> {
    const res = await apiClient.post('/telegram-bots/', payload);
    return (res as any).data;
  },
  async updateBot(
    botId: number,
    payload: { name: string; bot_token: string; webhook_url?: string }
  ): Promise<TelegramBot> {
    const res = await apiClient.patch(`/telegram-bots/${botId}/`, payload);
    return (res as any).data;
  },
  async botAction(
    botId: number,
    action: 'start' | 'stop' | 'test'
  ): Promise<{ status?: string; message?: string }> {
    const path =
      action === 'start' ? 'start_bot' : action === 'stop' ? 'stop_bot' : 'test_connection';
    const res = await apiClient.post(`/telegram-bots/${botId}/${path}/`);
    return (res as any).data;
  },
  async deleteBot(botId: number): Promise<void> {
    await apiClient.client.delete(`/telegram-bots/${botId}/`);
  },
  async userAction(
    userId: number,
    action: 'verify' | 'block' | 'unblock',
    verificationCode?: string
  ): Promise<{ message?: string }> {
    const path =
      action === 'verify' ? 'verify_user' : action === 'block' ? 'block_user' : 'unblock_user';
    const data = action === 'verify' ? { verification_code: verificationCode } : {};
    const res = await apiClient.post(`/telegram-users/${userId}/${path}/`, data);
    return (res as any).data;
  },
  async deleteUser(userId: number): Promise<void> {
    await apiClient.client.delete(`/telegram-users/${userId}/`);
  },
};
