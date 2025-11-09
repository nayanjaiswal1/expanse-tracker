import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bot,
  Plus,
  Play,
  Square,
  TestTube2,
  BarChart3,
  Settings,
  Users,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { ObjectForm } from '../../components/forms';
import { createTelegramBotFormConfig } from '@/shared/forms';
import type { TelegramBotFormData } from '@/shared/schemas/forms';
import { useToast } from '../../components/ui/Toast';
import { StatusBadge } from '../../components/common/StatusBadge';
import { LoadingSpinner } from '../../components/layout/LoadingSpinner';
import { HStack, FlexBetween } from '../../components/ui/Layout';
import {
  useTelegramBots,
  useTelegramUsers,
  useTelegramBotStats,
  useCreateTelegramBot,
  useUpdateTelegramBot,
  useTelegramBotAction,
  useDeleteTelegramBot,
  useTelegramUserAction,
  useDeleteTelegramUser,
} from '../../hooks/settings';
import type { TelegramBot, TelegramUser } from './schemas/telegram';
import { extractErrorMessage } from '@/utils/errorHandling';

const TelegramIntegrationForm = () => {
  const { t } = useTranslation('settings');
  const { data: botsData, isLoading: botsLoading } = useTelegramBots();
  const { data: usersData, isLoading: usersLoading } = useTelegramUsers();
  const createBot = useCreateTelegramBot();
  const updateBot = useUpdateTelegramBot();
  const botAction = useTelegramBotAction();
  const deleteBot = useDeleteTelegramBot();
  const userAction = useTelegramUserAction();
  const deleteUser = useDeleteTelegramUser();

  const [showAddBotModal, setShowAddBotModal] = useState(false);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [selectedBot, setSelectedBot] = useState<TelegramBot | null>(null);
  const [editingBot, setEditingBot] = useState<TelegramBot | null>(null);

  const { data: botStats, refetch: refetchStats } = useTelegramBotStats(
    selectedBot?.id,
    !!selectedBot
  );

  const { showSuccess, showError } = useToast();
  const runWithErrorToast = useCallback(
    async <T,>(action: () => Promise<T>, title: string, fallback?: string) => {
      try {
        const data = await action();
        return { ok: true as const, data };
      } catch (error) {
        showError(title, extractErrorMessage(error, fallback || title));
        return { ok: false as const };
      }
    },
    [showError]
  );

  const bots: TelegramBot[] = Array.isArray(botsData)
    ? botsData
    : (botsData?.results as TelegramBot[]) || [];
  const users: TelegramUser[] = Array.isArray(usersData)
    ? usersData
    : (usersData?.results as TelegramUser[]) || [];
  const loading = botsLoading || usersLoading;

  const handleCreateBot = async (data: TelegramBotFormData) => {
    const result = await runWithErrorToast(
      () => createBot.mutateAsync(data),
      'Failed to create bot'
    );
    if (!result.ok) return;
    setShowAddBotModal(false);
    showSuccess('Telegram bot created successfully');
  };

  const handleUpdateBot = async (data: TelegramBotFormData) => {
    if (!editingBot) return;

    const result = await runWithErrorToast(
      () => updateBot.mutateAsync({ botId: editingBot.id, payload: data }),
      'Failed to update bot'
    );
    if (!result.ok) return;
    setEditingBot(null);
    showSuccess('Bot updated successfully');
  };

  const handleBotAction = async (botId: number, action: 'start' | 'stop' | 'test') => {
    const actionMessages: Record<'start' | 'stop' | 'test', string> = {
      start: 'Bot started successfully',
      stop: 'Bot stopped successfully',
      test: 'Test message sent successfully',
    };

    const result = await runWithErrorToast(
      () => botAction.mutateAsync({ botId, action }),
      `Failed to ${action} bot`
    );
    if (!result.ok) return;
    showSuccess(actionMessages[action] || 'Action completed');
    if (action === 'test') {
      refetchStats();
    }
  };

  const handleDeleteBot = async (botId: number) => {
    const result = await runWithErrorToast(
      () => deleteBot.mutateAsync(botId),
      'Failed to delete bot'
    );
    if (!result.ok) return;
    showSuccess('Bot deleted successfully');
  };

  const handleUserAction = async (
    userId: number,
    action: 'verify' | 'block' | 'unblock',
    verificationCode?: string
  ) => {
    const actionMessages: Record<'verify' | 'block' | 'unblock', string> = {
      verify: 'User verified successfully',
      block: 'User blocked successfully',
      unblock: 'User unblocked successfully',
    };

    const result = await runWithErrorToast(
      () => userAction.mutateAsync({ userId, action, verificationCode }),
      `Failed to ${action} user`
    );
    if (!result.ok) return;
    showSuccess(actionMessages[action] || 'Action completed');
  };

  const handleDeleteUser = async (userId: number) => {
    const result = await runWithErrorToast(
      () => deleteUser.mutateAsync(userId),
      'Failed to delete user'
    );
    if (!result.ok) return;
    showSuccess('User removed successfully');
  };

  const createBotFormConfig = createTelegramBotFormConfig(handleCreateBot, createBot.isPending);
  const editBotFormConfig = editingBot
    ? createTelegramBotFormConfig(handleUpdateBot, botAction.isPending)
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <HStack className="justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Telegram Integration</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Connect Telegram bots for transaction notifications and management
          </p>
        </div>
        <HStack gap={3}>
          <Button variant="ghost" onClick={() => setShowSetupGuide(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Setup Guide
          </Button>
          <Button onClick={() => setShowAddBotModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Bot
          </Button>
        </HStack>
      </HStack>

      {/* Bots Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
            <Bot className="h-5 w-5 mr-2" />
            Your Bots ({bots.length})
          </h3>
        </div>

        {bots.length === 0 ? (
          <div className="p-6 text-center">
            <Bot className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No bots configured
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first Telegram bot.
            </p>
            <div className="mt-6">
              <Button onClick={() => setShowAddBotModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Bot
              </Button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {bots.map((bot) => (
              <div key={bot.id} className="p-6">
                <HStack className="justify-between">
                  <HStack gap={4}>
                    <div className="flex-shrink-0">
                      <Bot className="h-10 w-10 text-blue-500" />
                    </div>
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                        {bot.name}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <StatusBadge
                          status={bot.status}
                          variant={
                            bot.status === 'active'
                              ? 'success'
                              : bot.status === 'inactive'
                                ? 'warning'
                                : 'error'
                          }
                        />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {bot.total_transactions_created} transactions created
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Created {new Date(bot.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </HStack>

                  <HStack gap={2}>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedBot(bot)}>
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingBot(bot)}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBotAction(bot.id, 'test')}
                    >
                      <TestTube2 className="h-4 w-4" />
                    </Button>
                    {bot.status === 'active' ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBotAction(bot.id, 'stop')}
                      >
                        <Square className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleBotAction(bot.id, 'start')}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBot(bot.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </HStack>
                </HStack>

                {selectedBot?.id === bot.id && botStats && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {botStats.total_users}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Total Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {botStats.active_users}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Active Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {botStats.total_messages}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Messages</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {botStats.transactions_created}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Transactions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {botStats.uptime_days}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Days Uptime</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Users Section */}
      {users.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Connected Users ({users.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {users.map((user) => (
              <FlexBetween key={user.id} className="p-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {user.first_name} {user.last_name}
                  </h4>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      @{user.username}
                    </span>
                    <StatusBadge
                      status={user.status}
                      variant={
                        user.status === 'active'
                          ? 'success'
                          : user.status === 'pending'
                            ? 'warning'
                            : 'error'
                      }
                    />
                    {user.status === 'pending' && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Code: {user.verification_code}
                      </span>
                    )}
                  </div>
                </div>

                <HStack gap={2}>
                  {user.status === 'pending' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction(user.id, 'verify', user.verification_code)}
                    >
                      Approve
                    </Button>
                  )}
                  {user.status === 'active' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction(user.id, 'block')}
                    >
                      Block
                    </Button>
                  ) : user.status === 'blocked' ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUserAction(user.id, 'unblock')}
                    >
                      Unblock
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </HStack>
              </FlexBetween>
            ))}
          </div>
        </div>
      )}

      {/* Add Bot Modal */}
      <Modal
        isOpen={showAddBotModal}
        onClose={() => setShowAddBotModal(false)}
        titleKey="settings.telegram.modals.addBot.title"
        subtitleKey="settings.telegram.modals.addBot.subtitle"
        showDefaultSubtitle={false}
      >
        <ObjectForm config={createBotFormConfig} />
      </Modal>

      {/* Edit Bot Modal */}
      <Modal
        isOpen={!!editingBot}
        onClose={() => setEditingBot(null)}
        titleKey="settings.telegram.modals.editBot.title"
        subtitleKey="settings.telegram.modals.editBot.subtitle"
        showDefaultSubtitle={false}
      >
        {editBotFormConfig && <ObjectForm config={editBotFormConfig} />}
      </Modal>

      {/* Setup Guide Modal */}
      <Modal
        isOpen={showSetupGuide}
        onClose={() => setShowSetupGuide(false)}
        titleKey="settings.telegram.modals.setupGuide.title"
        showDefaultSubtitle={false}
      >
        {(() => {
          const steps = t('settings.telegram.modals.setupGuide.stepsList', {
            returnObjects: true,
          }) as string[];
          const features = t('settings.telegram.modals.setupGuide.featuresList', {
            returnObjects: true,
          }) as string[];

          return (
            <div className="space-y-4">
              <div className="prose dark:prose-invert max-w-none">
                <h3>{t('settings.telegram.modals.setupGuide.introHeading')}</h3>
                <ol>
                  {steps.map((step, index) => (
                    <li key={index} dangerouslySetInnerHTML={{ __html: step }} />
                  ))}
                </ol>

                <h3>{t('settings.telegram.modals.setupGuide.featuresHeading')}</h3>
                <ul>
                  {features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default TelegramIntegrationForm;
