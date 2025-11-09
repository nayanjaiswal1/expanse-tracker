import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle2,
  Cpu,
  RefreshCw,
  Server,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';
import { checkboxClassName } from '../../components/ui/Checkbox';
import { FlexBetween, HStack } from '../../components/ui/Layout';
import {
  useAISettingsBootstrap,
  useUpdateAISettingsMutation,
  useTestAIConnectionMutation,
} from './hooks/queries/useAiSettings';
import type { AISettings } from '../../types';
import OllamaManagement from './OllamaManagement';

const formatNumber = (value: number | undefined, fractionDigits = 0) =>
  Number.isFinite(value ?? NaN)
    ? (value ?? 0).toLocaleString(undefined, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      })
    : '0';

const formatPercent = (value: number | undefined) => `${formatNumber(value ?? 0, 1)}%`;

const providerLabels: Record<AISettings['preferred_provider'], string> = {
  openai: 'OpenAI',
  ollama: 'Ollama (Self-hosted)',
  system: 'System default',
};

const SettingsRow: React.FC<{
  label: string;
  description?: string;
  children: React.ReactNode;
}> = ({ label, description, children }) => (
  <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[220px,1fr] lg:items-start">
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
    </div>
    <div className="flex flex-col gap-2">{children}</div>
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, hint, checked, onChange }) => (
  <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm transition cursor-pointer hover:border-primary-200 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-primary-500/50">
    <input
      type="checkbox"
      className={`mt-1 ${checkboxClassName}`}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
    />
    <span className="flex flex-col gap-1">
      <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
      {hint && <span className="text-xs text-gray-500 dark:text-gray-400">{hint}</span>}
    </span>
  </label>
);

const SystemStatusBadge: React.FC<{ status: string; label: string }> = ({ status, label }) => {
  const isAvailable = status === 'available';
  const isError = status === 'error';
  const Icon = isAvailable ? CheckCircle2 : isError ? AlertCircle : Shield;
  const color = isAvailable
    ? 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300'
    : isError
      ? 'text-rose-600 bg-rose-100 dark:bg-rose-900/30 dark:text-rose-300'
      : 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300';

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${color}`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
};

const sectionTitleClasses = 'text-lg font-semibold text-gray-900 dark:text-gray-100';

const deriveHasChanges = (current: AISettings | null, original: AISettings | undefined) => {
  if (!current || !original) return false;
  return JSON.stringify(current) !== JSON.stringify(original);
};

const toPlainAmount = (value: string | number | undefined) => {
  if (value === undefined || value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const AISettingsPage: React.FC = () => {
  const { data, isLoading, isFetching, refetch } = useAISettingsBootstrap(30);
  const updateMutation = useUpdateAISettingsMutation();
  const testMutation = useTestAIConnectionMutation();
  const { showSuccess, showError } = useToast();

  const [settingsState, setSettingsState] = useState<AISettings | null>(null);

  useEffect(() => {
    if (data?.settings) {
      setSettingsState(data.settings);
    }
  }, [data?.settings]);

  const usage = data?.usage;
  const system = data?.system;
  const profile = data?.profile;

  const hasChanges = useMemo(
    () => deriveHasChanges(settingsState, data?.settings),
    [settingsState, data?.settings]
  );

  const handleSettingsChange = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setSettingsState((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = async () => {
    if (!settingsState || updateMutation.isPending) return;

    try {
      await updateMutation.mutateAsync({ settings: settingsState });
      showSuccess('AI settings saved successfully');
      await refetch();
    } catch (error: unknown) {
      console.error('Failed to save AI settings', error);
      showError('Failed to save settings', error instanceof Error ? error.message : undefined);
    }
  };

  const handleTestConnection = async () => {
    if (!settingsState || testMutation.isPending) return;
    try {
      const result = await testMutation.mutateAsync({
        provider: settingsState.preferred_provider,
      });
      if (result.success) {
        showSuccess(
          `Connection OK via ${result.provider} (${result.model})`,
          `Response in ${result.processing_time}s`
        );
      } else {
        showError('Connection test failed', result.error);
      }
    } catch (error: unknown) {
      console.error('Connection test failed', error);
      showError('Unable to test connection right now.');
    }
  };

  const busy = isFetching || updateMutation.isPending;

  if (isLoading || !settingsState) {
    return (
      <div className="flex h-72 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  const successRate = usage?.success_rate ?? 0;
  const totalCredits = usage?.total_credits_used ?? 0;
  const avgTime = usage?.avg_processing_time ?? 0;

  const recentUsage = usage?.daily_usage.slice(-7) ?? [];

  const creditCostEntries = Object.entries(system?.credit_costs ?? {});

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">AI Configuration</h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Configure AI providers, manage feature flags, and monitor usage so your finance
            automations stay reliable.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            variant="ghost"
            onClick={handleTestConnection}
            disabled={testMutation.isPending || busy}
          >
            <HStack gap={2}>
              {testMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Test connection
            </HStack>
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || updateMutation.isPending}>
            <HStack gap={2}>
              {updateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Save changes
            </HStack>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5">
          <FlexBetween>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                AI Credits Remaining
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(profile?.credits_remaining ?? 0)}
              </p>
            </div>
            <div className="rounded-full bg-amber-100 p-3 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300">
              <Zap className="h-5 w-5" />
            </div>
          </FlexBetween>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Credits are required for categorization, parsing, and insights. Add more from Billing
            when needed.
          </p>
        </Card>
        <Card className="p-5">
          <FlexBetween>
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Usage (30 days)
              </p>
              <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(usage?.total_requests ?? 0)}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300">
              <Activity className="h-5 w-5" />
            </div>
          </FlexBetween>
          <HStack gap={3} className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Success rate {formatPercent(successRate)}</span>
            <span aria-hidden>•</span>
            <span>Avg time {avgTime.toFixed(2)}s</span>
          </HStack>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">System Providers</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SystemStatusBadge
              status={system?.system_openai_status ?? 'unavailable'}
              label="OpenAI"
            />
            <SystemStatusBadge
              status={system?.system_ollama_status ?? 'unavailable'}
              label="Ollama"
            />
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Preferred provider: {providerLabels[settingsState.preferred_provider]}
          </p>
        </Card>
      </div>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className={sectionTitleClasses}>Provider configuration</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Choose which AI provider powers your automations and update credentials when needed.
          </p>
        </div>
        <div className="space-y-6">
          <SettingsRow label="Preferred provider">
            <select
              value={settingsState.preferred_provider}
              onChange={(event) =>
                handleSettingsChange(
                  'preferred_provider',
                  event.target.value as AISettings['preferred_provider']
                )
              }
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:focus:border-primary-400"
            >
              <option value="openai">OpenAI (API hosted)</option>
              <option value="ollama">Ollama (self-hosted)</option>
              <option value="system">System default</option>
            </select>
          </SettingsRow>

          <SettingsRow
            label="OpenAI API key"
            description="Used for GPT-based categorization and insights. Leave blank to use the system default key."
          >
            <Input
              type="password"
              value={settingsState.openai_api_key}
              onChange={(event) => handleSettingsChange('openai_api_key', event.target.value)}
              placeholder="sk-..."
            />
          </SettingsRow>

          <div className="grid gap-4 md:grid-cols-2">
            <SettingsRow label="OpenAI model">
              <Input
                value={settingsState.openai_model}
                onChange={(event) => handleSettingsChange('openai_model', event.target.value)}
                placeholder="gpt-4o-mini"
              />
            </SettingsRow>
            <SettingsRow label="Ollama model">
              <Input
                value={settingsState.ollama_model}
                onChange={(event) => handleSettingsChange('ollama_model', event.target.value)}
                placeholder="llama2"
              />
            </SettingsRow>
          </div>

          <SettingsRow
            label="Ollama endpoint"
            description="If you self-host Ollama, specify the base URL so receipts and invoices can be parsed locally."
          >
            <Input
              value={settingsState.ollama_endpoint}
              onChange={(event) => handleSettingsChange('ollama_endpoint', event.target.value)}
              placeholder="http://localhost:11434"
            />
          </SettingsRow>
        </div>
      </Card>

      <Card className="p-6 space-y-6">
        <div>
          <h2 className={sectionTitleClasses}>Automation features</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Toggle which AI-driven workflows are active across the app.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <ToggleRow
            label="Smart transaction categorization"
            hint="Suggest categories for new transactions using language cues."
            checked={settingsState.enable_categorization}
            onChange={(value) => handleSettingsChange('enable_categorization', value)}
          />
          <ToggleRow
            label="Natural language transaction parsing"
            hint="Convert quick-add phrases and chats into structured transactions."
            checked={settingsState.enable_transaction_parsing}
            onChange={(value) => handleSettingsChange('enable_transaction_parsing', value)}
          />
          <ToggleRow
            label="Receipt OCR"
            hint="Parse receipts and invoices to pull amounts, merchants, and taxes automatically."
            checked={settingsState.enable_receipt_ocr}
            onChange={(value) => handleSettingsChange('enable_receipt_ocr', value)}
          />
          <ToggleRow
            label="Monthly insights"
            hint="Generate monthly summaries and insights using your preferred provider."
            checked={settingsState.enable_monthly_reports}
            onChange={(value) => handleSettingsChange('enable_monthly_reports', value)}
          />
          <ToggleRow
            label="Auto-approve high confidence"
            hint="Automatically accept AI suggestions when confidence exceeds the threshold."
            checked={settingsState.auto_approve_high_confidence}
            onChange={(value) => handleSettingsChange('auto_approve_high_confidence', value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SettingsRow
            label="Confidence threshold"
            description="Minimum confidence percentage required before suggestions are auto-approved."
          >
            <Input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={settingsState.confidence_threshold}
              onChange={(event) =>
                handleSettingsChange('confidence_threshold', Number(event.target.value))
              }
            />
          </SettingsRow>
          <SettingsRow
            label="Monthly usage cap"
            description="Prevent runaway automation by capping the number of AI operations per month."
          >
            <Input
              type="number"
              min="0"
              value={settingsState.max_monthly_usage}
              onChange={(event) =>
                handleSettingsChange('max_monthly_usage', Number(event.target.value))
              }
            />
          </SettingsRow>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <Card className="p-6 space-y-6">
          <FlexBetween>
            <div>
              <h2 className={sectionTitleClasses}>Usage breakdown</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Monitor recent activity so you know where credits are spent.
              </p>
            </div>
            <div className="rounded-full bg-primary-100 p-3 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
              <Brain className="h-5 w-5" />
            </div>
          </FlexBetween>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Credits used
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(totalCredits)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Tokens consumed
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {formatNumber(usage?.total_tokens_used ?? 0)}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Success rate
              </p>
              <p className="mt-2 text-xl font-semibold text-gray-900 dark:text-white">
                {formatPercent(successRate)}
              </p>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Daily activity (last 7 days)
            </h3>
            <div className="mt-2 grid gap-2 text-sm text-gray-600 dark:text-gray-400">
              {recentUsage.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
                  No AI activity captured in the last week.
                </div>
              )}
              {recentUsage.map((entry) => (
                <FlexBetween
                  key={entry.date}
                  className="rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(entry.date).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {entry.requests} requests · {toPlainAmount(entry.credits)} credits
                  </span>
                </FlexBetween>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <HStack gap={3}>
            <div className="rounded-full bg-violet-100 p-3 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className={sectionTitleClasses}>System status</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Verify which operations cost credits and where workloads run.
              </p>
            </div>
          </HStack>

          <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
            <div className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="font-medium text-gray-900 dark:text-gray-100">Endpoints</p>
              <ul className="mt-2 space-y-1 text-xs">
                <li>OpenAI: {system?.system_openai_endpoint ?? '—'}</li>
                <li>Ollama: {system?.system_ollama_endpoint ?? '—'}</li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-100 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
              <p className="font-medium text-gray-900 dark:text-gray-100">Credit costs</p>
              <ul className="mt-2 space-y-1 text-xs">
                {creditCostEntries.length === 0 && <li>No credit mappings registered.</li>}
                {creditCostEntries.map(([operation, cost]) => (
                  <FlexBetween key={operation} as="li">
                    <span className="uppercase tracking-wide text-gray-500">{operation}</span>
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{cost}</span>
                  </FlexBetween>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 space-y-4">
        <HStack gap={3}>
          <div className="rounded-full bg-cyan-100 p-3 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-300">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <h2 className={sectionTitleClasses}>Ollama model management</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Keep your local models updated and manage GPU acceleration for on-premise parsing
              workflows.
            </p>
          </div>
        </HStack>
        <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-gray-700 dark:bg-gray-900/60">
          <OllamaManagement />
        </div>
      </Card>
    </div>
  );
};

export default AISettingsPage;
export { AISettingsPage as AISettings };
