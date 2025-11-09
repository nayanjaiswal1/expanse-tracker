import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { telegramApi } from '../../api/telegram';
import type { TelegramBot, TelegramUser, BotStatistics, SetupGuide } from '../../schemas';
import type { TelegramBotFormData } from '@/shared/schemas/forms';

const keys = {
  bots: ['telegram', 'bots'] as const,
  users: ['telegram', 'users'] as const,
  setup: ['telegram', 'setup-guide'] as const,
  botStats: (id: number) => ['telegram', 'bot-stats', id] as const,
};

export function useTelegramBots() {
  return useQuery<{ results?: TelegramBot[] } | TelegramBot[]>({
    queryKey: keys.bots,
    queryFn: () => telegramApi.listBots(),
  });
}

export function useTelegramUsers() {
  return useQuery<{ results?: TelegramUser[] } | TelegramUser[]>({
    queryKey: keys.users,
    queryFn: () => telegramApi.listUsers(),
  });
}

export function useTelegramSetupGuide() {
  return useQuery<SetupGuide>({
    queryKey: keys.setup,
    queryFn: () => telegramApi.getSetupGuide(),
  });
}

export function useTelegramBotStats(botId?: number, enabled: boolean = false) {
  return useQuery<BotStatistics>({
    queryKey: botId ? keys.botStats(botId) : ['telegram', 'bot-stats', 'none'],
    queryFn: () => telegramApi.getBotStatistics(botId as number),
    enabled: Boolean(botId && enabled),
  });
}

export function useCreateTelegramBot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: telegramApi.createBot,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.bots });
    },
  });
}

export function useUpdateTelegramBot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ botId, payload }: { botId: number; payload: TelegramBotFormData }) =>
      telegramApi.updateBot(botId, payload),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.bots });
    },
  });
}

export function useTelegramBotAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ botId, action }: { botId: number; action: 'start' | 'stop' | 'test' }) =>
      telegramApi.botAction(botId, action),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.bots });
    },
  });
}

export function useDeleteTelegramBot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (botId: number) => telegramApi.deleteBot(botId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.bots });
    },
  });
}

export function useTelegramUserAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      userId,
      action,
      verificationCode,
    }: {
      userId: number;
      action: 'verify' | 'block' | 'unblock';
      verificationCode?: string;
    }) => telegramApi.userAction(userId, action, verificationCode),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.users });
    },
  });
}

export function useDeleteTelegramUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => telegramApi.deleteUser(userId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: keys.users });
    },
  });
}
