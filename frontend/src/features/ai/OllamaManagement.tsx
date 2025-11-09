import React, { useState, useEffect } from 'react';
import {
  Server,
  Download,
  Trash2,
  Play,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  HardDrive,
  Cpu,
  Settings,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FlexBetween, HStack } from '../../components/ui/Layout';
import {
  useOllamaStatus,
  useOllamaModels,
  useOllamaRecommended,
  usePullModelMutation,
  useRemoveModelMutation,
  useTestModelMutation,
  type SystemInfo,
  type OllamaModel,
  type RecommendedModel,
} from './hooks/queries';

const OllamaManagement: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [recommendedModels, setRecommendedModels] = useState<RecommendedModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [pulling, setPulling] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('models');
  const [modelToRemove, setModelToRemove] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();

  // React Query hooks
  const { data: statusData, isLoading: statusLoading, refetch: refetchStatus } = useOllamaStatus();
  const {
    data: modelsData,
    isLoading: modelsLoading,
    refetch: refetchModels,
  } = useOllamaModels(true);
  const {
    data: recData,
    isLoading: recLoading,
    refetch: refetchRecommended,
  } = useOllamaRecommended();
  const pullMutation = usePullModelMutation();
  const removeMutation = useRemoveModelMutation();
  const testMutation = useTestModelMutation();

  useEffect(() => {
    if (statusData?.system_info) setSystemInfo(statusData.system_info as SystemInfo);
  }, [statusData]);

  useEffect(() => {
    if (modelsData?.models) setModels(modelsData.models as OllamaModel[]);
  }, [modelsData]);

  useEffect(() => {
    if (recData?.recommended_models)
      setRecommendedModels(recData.recommended_models as RecommendedModel[]);
  }, [recData]);

  useEffect(() => {
    setLoading(statusLoading || modelsLoading || recLoading);
  }, [statusLoading, modelsLoading, recLoading]);

  const pullModel = async (modelName: string) => {
    setPulling(modelName);
    try {
      await pullMutation.mutateAsync(modelName);
      showSuccess(`Model ${modelName} downloaded successfully`);
      await refetchModels();
    } catch (error: any) {
      showError(`Failed to download ${modelName}`, error?.message);
    } finally {
      setPulling(null);
    }
  };

  const removeModel = async () => {
    if (!modelToRemove) return;

    setRemoving(modelToRemove);
    try {
      await removeMutation.mutateAsync(modelToRemove);
      showSuccess(`Model ${modelToRemove} removed successfully`);
      await refetchModels();
      setModelToRemove(null);
    } catch (error: any) {
      showError(`Failed to remove ${modelToRemove}`, error?.message);
      setModelToRemove(null);
    } finally {
      setRemoving(null);
    }
  };

  const testModel = async (modelName: string) => {
    setTesting(modelName);
    try {
      const data = await testMutation.mutateAsync({
        modelName,
        prompt: 'Hello! Please respond with "OK" to confirm you are working.',
      });
      if (data.success) {
        showSuccess(
          `Model test successful`,
          `Response: "${data.response}" (${(data.processing_time || 0).toFixed(2)}s)`
        );
      } else {
        showError('Model test failed', data.error);
      }
    } catch (error: any) {
      showError(`Error testing ${modelName}`, error?.message);
    } finally {
      setTesting(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (available: boolean) => {
    return available ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <AlertCircle className="h-5 w-5 text-red-500" />
    );
  };

  const tabs = [
    { id: 'models', label: 'Installed Models', icon: HardDrive },
    { id: 'recommended', label: 'Recommended', icon: Download },
    { id: 'system', label: 'System Status', icon: Server },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-secondary-900 dark:text-secondary-100 mb-2">
          Ollama Management
        </h2>
        <p className="text-secondary-600 dark:text-secondary-400">
          Manage your self-hosted AI models and monitor system status.
        </p>
      </div>

      {/* System Status Banner */}
      {systemInfo && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            systemInfo.available
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}
        >
          <HStack gap={3}>
            {getStatusIcon(systemInfo.available)}
            <div>
              <h3
                className={`font-medium ${
                  systemInfo.available
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}
              >
                {systemInfo.available ? 'Ollama Server Online' : 'Ollama Server Offline'}
              </h3>
              <p
                className={`text-sm ${
                  systemInfo.available
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {systemInfo.available
                  ? `${systemInfo.models_count} models • ${formatFileSize(systemInfo.total_storage_used)} used • ${systemInfo.endpoint}`
                  : `Cannot connect to Ollama at ${systemInfo.endpoint}`}
              </p>
            </div>
            <div className="flex-1"></div>
            <Button
              onClick={() => {
                refetchStatus();
                refetchModels();
                refetchRecommended();
              }}
              variant="ghost"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </HStack>
        </div>
      )}

      {!systemInfo?.available && (
        <Card>
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
              Ollama Server Not Available
            </h3>
            <p className="text-secondary-600 dark:text-secondary-400 mb-4">
              Please ensure Ollama is installed and running on your system.
            </p>
            <div className="text-left bg-secondary-50 dark:bg-secondary-800 p-4 rounded-lg">
              <h4 className="font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                Installation Instructions:
              </h4>
              <ol className="text-sm text-secondary-600 dark:text-secondary-400 space-y-1">
                <li>
                  1. Download Ollama from{' '}
                  <a
                    href="https://ollama.ai"
                    className="text-blue-500 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    ollama.ai
                  </a>
                </li>
                <li>2. Install and start the Ollama service</li>
                <li>3. Ensure it's running on the configured endpoint</li>
                <li>4. Refresh this page to reconnect</li>
              </ol>
            </div>
          </div>
        </Card>
      )}

      {systemInfo?.available && (
        <>
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-8 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-secondary-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-secondary-600 dark:text-secondary-400 hover:text-secondary-900 dark:hover:text-secondary-200'
                  }`}
                >
                  <HStack gap={2}>
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </HStack>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              {models.length === 0 ? (
                <Card>
                  <div className="p-6 text-center">
                    <HardDrive className="h-12 w-12 text-secondary-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-2">
                      No Models Installed
                    </h3>
                    <p className="text-secondary-600 dark:text-secondary-400 mb-4">
                      Install some models to get started with local AI processing.
                    </p>
                    <Button onClick={() => setActiveTab('recommended')}>
                      View Recommended Models
                    </Button>
                  </div>
                </Card>
              ) : (
                models.map((model) => (
                  <Card key={model.name}>
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                            {model.name}
                          </h3>
                          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                            {model.recommended_use}
                          </p>

                          <HStack
                            gap={4}
                            className="mt-3 text-sm text-secondary-500 dark:text-secondary-400"
                          >
                            <span className="flex items-center">
                              <Cpu className="h-4 w-4 mr-1" />
                              {model.family} • {model.parameters}
                            </span>
                            <span className="flex items-center">
                              <HardDrive className="h-4 w-4 mr-1" />
                              {formatFileSize(model.size)}
                            </span>
                          </HStack>

                          <div className="flex flex-wrap gap-1 mt-3">
                            {model.capabilities.map((capability) => (
                              <span
                                key={capability}
                                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-md"
                              >
                                {capability}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex space-x-2 ml-4">
                          <Button
                            onClick={() => testModel(model.name)}
                            disabled={testing === model.name}
                            variant="ghost"
                            size="sm"
                          >
                            {testing === model.name ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>

                          <Button
                            onClick={() => setModelToRemove(model.name)}
                            disabled={removing === model.name}
                            variant="danger"
                            size="sm"
                          >
                            {removing === model.name ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'recommended' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedModels.map((model) => {
                const isInstalled = models.some((m) => m.name === model.name);

                return (
                  <Card key={model.name}>
                    <div className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100">
                            {model.name}
                          </h3>
                          <p className="text-secondary-600 dark:text-secondary-400 mt-1">
                            {model.description}
                          </p>

                          <div className="mt-3 space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-secondary-500 dark:text-secondary-400">
                                Use Case:
                              </span>
                              <span className="text-secondary-700 dark:text-secondary-300">
                                {model.use_case}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary-500 dark:text-secondary-400">
                                Size:
                              </span>
                              <span className="text-secondary-700 dark:text-secondary-300">
                                {model.size}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-secondary-500 dark:text-secondary-400">
                                Best For:
                              </span>
                              <span className="text-secondary-700 dark:text-secondary-300 capitalize">
                                {model.recommended_for.replace('_', ' ')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        {isInstalled ? (
                          <Button variant="success" size="sm" disabled>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Installed
                          </Button>
                        ) : (
                          <Button
                            onClick={() => pullModel(model.name)}
                            disabled={pulling === model.name}
                            size="sm"
                          >
                            {pulling === model.name ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Downloading...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Install
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {activeTab === 'system' && systemInfo && (
            <div className="space-y-6">
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                    System Information
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <div className="flex items-center">
                        <Server className="h-8 w-8 text-blue-500 mb-2" />
                        <div className="ml-3">
                          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            Online
                          </p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Server Status</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <div className="flex items-center">
                        <HardDrive className="h-8 w-8 text-green-500 mb-2" />
                        <div className="ml-3">
                          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                            {systemInfo.models_count}
                          </p>
                          <p className="text-sm text-green-600 dark:text-green-400">Models</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                      <div className="flex items-center">
                        <Settings className="h-8 w-8 text-purple-500 mb-2" />
                        <div className="ml-3">
                          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                            {formatFileSize(systemInfo.total_storage_used)}
                          </p>
                          <p className="text-sm text-purple-600 dark:text-purple-400">
                            Storage Used
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                      <div className="flex items-center">
                        <Cpu className="h-8 w-8 text-orange-500 mb-2" />
                        <div className="ml-3">
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {systemInfo.server_info.version}
                          </p>
                          <p className="text-sm text-orange-600 dark:text-orange-400">Version</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-medium text-secondary-900 dark:text-secondary-100 mb-4">
                    Endpoint Configuration
                  </h3>

                  <div className="bg-secondary-50 dark:bg-secondary-800 p-4 rounded-lg">
                    <FlexBetween>
                      <div>
                        <p className="font-medium text-secondary-900 dark:text-secondary-100">
                          Current Endpoint
                        </p>
                        <p className="text-secondary-600 dark:text-secondary-400 font-mono">
                          {systemInfo.endpoint}
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          refetchStatus();
                          refetchModels();
                        }}
                        variant="ghost"
                        size="sm"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                      </Button>
                    </FlexBetween>
                  </div>

                  <p className="text-sm text-secondary-500 dark:text-secondary-400 mt-2">
                    Configure the endpoint in AI Settings to use a different Ollama instance.
                  </p>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        isOpen={!!modelToRemove}
        onClose={() => setModelToRemove(null)}
        onConfirm={removeModel}
        title="Remove Model"
        message={`Are you sure you want to remove ${modelToRemove}?`}
        confirmText="Remove"
        variant="danger"
      />
    </div>
  );
};

export default OllamaManagement;
