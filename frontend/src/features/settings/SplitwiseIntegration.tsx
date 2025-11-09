/* eslint-disable no-redeclare */
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import {
  RefreshCw,
  Check,
  X,
  AlertCircle,
  ArrowLeftRight,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { FlexBetween, HStack } from '../../components/ui/Layout';

interface SplitwiseIntegration {
  id: number;
  is_connected: boolean;
  splitwise_user_id?: number;
  splitwise_email?: string;
  splitwise_display_name?: string;
  is_active: boolean;
  auto_sync_enabled: boolean;
  sync_interval_minutes: number;
  last_sync_at?: string;
  last_successful_sync_at?: string;
  sync_status: 'idle' | 'syncing' | 'error' | 'success';
  last_sync_error?: string;
}

interface SplitwiseGroupMapping {
  id: number;
  local_group_name: string;
  splitwise_group_name: string;
  sync_enabled: boolean;
  sync_direction: 'bidirectional' | 'to_splitwise' | 'from_splitwise';
  last_synced_at?: string;
}

const SplitwiseIntegration: React.FC = () => {
  const [integration, setIntegration] = useState<SplitwiseIntegration | null>(null);
  const [groups, setGroups] = useState<SplitwiseGroupMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  useEffect(() => {
    loadIntegrationData();
  }, []);

  const loadIntegrationData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getSplitwiseIntegration();

      if (data.is_connected) {
        setIntegration(data);
        loadGroups();
      } else {
        setIntegration(null);
      }
    } catch (err: any) {
      console.error('Failed to load integration:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await apiClient.getSplitwiseGroups();
      setGroups(data);
    } catch (err: any) {
      console.error('Failed to load groups:', err);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken.trim()) {
      setError('Please enter your Splitwise API token');
      return;
    }

    try {
      setConnecting(true);
      setError(null);

      const result = await apiClient.connectSplitwiseIntegration({
        access_token: accessToken,
        auto_sync_enabled: true,
        sync_interval_minutes: 30,
        import_existing_groups: true,
        import_existing_expenses: true,
      });

      setIntegration(result.integration);
      setSuccess('Splitwise connected successfully!');
      setShowTokenInput(false);
      setAccessToken('');

      await loadIntegrationData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to connect Splitwise');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await apiClient.disconnectSplitwiseIntegration();
      setIntegration(null);
      setGroups([]);
      setSuccess('Splitwise disconnected');
      setShowDisconnectConfirm(false);
    } catch (err: any) {
      setError('Failed to disconnect Splitwise');
      setShowDisconnectConfirm(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);

      const result = await apiClient.triggerSplitwiseSync({ sync_type: 'incremental' });

      setSuccess(
        `Synced: ${result.sync_log.expenses_created} new, ${result.sync_log.expenses_updated} updated`
      );
      await loadIntegrationData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Sync failed');
    }
  };

  const handleToggleGroupSync = async (groupMapping: SplitwiseGroupMapping) => {
    try {
      await apiClient.updateSplitwiseGroupMapping(groupMapping.id, {
        sync_enabled: !groupMapping.sync_enabled,
      });

      setGroups(
        groups.map((g) => (g.id === groupMapping.id ? { ...g, sync_enabled: !g.sync_enabled } : g))
      );
    } catch (err: any) {
      setError('Failed to update group');
    }
  };

  const getSyncDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'bidirectional':
        return <ArrowLeftRight className="h-4 w-4" />;
      case 'to_splitwise':
        return <ArrowRight className="h-4 w-4" />;
      case 'from_splitwise':
        return <ArrowLeft className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start"
        >
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
          <Button
            onClick={() => setError(null)}
            variant="text-danger"
            className="text-base"
            type="button"
          >
            <X className="h-5 w-5" />
          </Button>
        </motion.div>
      )}

      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start"
        >
          <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
          </div>
          <Button
            onClick={() => setSuccess(null)}
            variant="text-success"
            className="text-base"
            type="button"
          >
            <X className="h-5 w-5" />
          </Button>
        </motion.div>
      )}

      {/* Connection Status */}
      {integration ? (
        <div className="space-y-4">
          <FlexBetween>
            <HStack gap={3}>
              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold">
                SW
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {integration.splitwise_display_name || integration.splitwise_email}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {integration.last_successful_sync_at
                    ? `Last synced ${new Date(integration.last_successful_sync_at).toLocaleString()}`
                    : 'Never synced'}
                </p>
              </div>
            </HStack>

            <HStack gap={2}>
              <Button
                onClick={handleSync}
                disabled={syncing || integration.sync_status === 'syncing'}
                variant="primary-teal"
                size="none"
                className="rounded-lg px-3 py-1.5 text-sm shadow-none"
              >
                <HStack gap={2}>
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'Syncing...' : 'Sync'}</span>
                </HStack>
              </Button>
              <Button
                onClick={() => setShowDisconnectConfirm(true)}
                variant="neutral-soft"
                size="none"
                className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Disconnect
              </Button>
            </HStack>
          </FlexBetween>

          {/* Sync Settings */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Auto-sync</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {integration.auto_sync_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500 dark:text-gray-400">Interval</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {integration.sync_interval_minutes} min
              </p>
            </div>
          </div>

          {/* Synced Groups */}
          {groups.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Synced Groups ({groups.length})
              </h4>
              <div className="space-y-2">
                {groups.slice(0, 5).map((group) => (
                  <FlexBetween
                    key={group.id}
                    className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {group.local_group_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {group.splitwise_group_name}
                      </p>
                    </div>
                    <HStack gap={2} className="ml-4">
                      <HStack gap={1} className="text-xs text-gray-600 dark:text-gray-400">
                        {getSyncDirectionIcon(group.sync_direction)}
                      </HStack>
                      <button
                        onClick={() => handleToggleGroupSync(group)}
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          group.sync_enabled
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {group.sync_enabled ? 'On' : 'Off'}
                      </button>
                    </HStack>
                  </FlexBetween>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {showTokenInput ? (
            <form onSubmit={handleConnect} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Token
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Get your token from{' '}
                  <a
                    href="https://secure.splitwise.com/apps"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-600 dark:text-teal-400 hover:underline"
                  >
                    Splitwise Apps
                  </a>
                </p>
                <input
                  type="password"
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="Enter your Splitwise API token"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-teal-500 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <HStack gap={2}>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 text-sm"
                >
                  {connecting ? 'Connecting...' : 'Connect & Import'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTokenInput(false);
                    setAccessToken('');
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
                >
                  Cancel
                </button>
              </HStack>
            </form>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Sync group expenses from Splitwise. Changes sync automatically in both directions.
              </p>
              <button
                onClick={() => setShowTokenInput(true)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm"
              >
                Connect Splitwise
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        onConfirm={handleDisconnect}
        title="Disconnect Splitwise"
        message="Disconnect Splitwise? Local data will be preserved but sync will stop."
        confirmText="Disconnect"
        variant="warning"
      />
    </div>
  );
};

export default SplitwiseIntegration;
