import { useEffect, useMemo, useState } from 'react';

export type DatePreset =
  | 'today'
  | 'yesterday'
  | 'last7days'
  | 'last30days'
  | 'thisMonth'
  | 'lastMonth'
  | 'yearToDate'
  | 'custom';

export interface ExportFilterOptions {
  dateRange: {
    preset: DatePreset;
    from?: string;
    to?: string;
  };
  transactionTypes: Array<'income' | 'expense' | 'transfer' | 'refund'>;
  amountRange?: {
    min?: number;
    max?: number;
  };
  statuses?: Array<'cleared' | 'pending' | 'flagged'>;
  includeNotes?: boolean;
}

interface ExportFiltersProps {
  onFiltersChange: (filters: ExportFilterOptions) => void;
}

const presetOptions: Array<{ value: DatePreset; label: string }> = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'yearToDate', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' },
];

const transactionTypeOptions: ExportFilterOptions['transactionTypes'] = [
  'income',
  'expense',
  'transfer',
  'refund',
];

const statusOptions: NonNullable<ExportFilterOptions['statuses']> = [
  'cleared',
  'pending',
  'flagged',
];

const defaultFilters: ExportFilterOptions = {
  dateRange: { preset: 'last30days' },
  transactionTypes: ['income', 'expense'],
  amountRange: {},
  statuses: ['cleared', 'pending'],
  includeNotes: true,
};

export default function ExportFilters({ onFiltersChange }: ExportFiltersProps) {
  const [filters, setFilters] = useState<ExportFilterOptions>(defaultFilters);

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  const formattedPresetLabel = useMemo(() => {
    const selected = presetOptions.find((option) => option.value === filters.dateRange.preset);
    return selected?.label ?? 'Custom';
  }, [filters.dateRange.preset]);

  const toggleTransactionType = (type: ExportFilterOptions['transactionTypes'][number]) => {
    setFilters((prev) => {
      const exists = prev.transactionTypes.includes(type);
      const nextTypes = exists
        ? prev.transactionTypes.filter((item) => item !== type)
        : [...prev.transactionTypes, type];

      return { ...prev, transactionTypes: nextTypes };
    });
  };

  const toggleStatus = (status: NonNullable<ExportFilterOptions['statuses']>[number]) => {
    setFilters((prev) => {
      const current = prev.statuses ?? [];
      const exists = current.includes(status);
      const nextStatuses = exists
        ? current.filter((item) => item !== status)
        : [...current, status];
      return { ...prev, statuses: nextStatuses };
    });
  };

  const updateAmountRange = (field: 'min' | 'max', value: string) => {
    const parsed = value === '' ? undefined : Number(value);
    setFilters((prev) => ({
      ...prev,
      amountRange: {
        ...prev.amountRange,
        [field]: Number.isFinite(parsed) ? parsed : undefined,
      },
    }));
  };

  return (
    <div className="space-y-8">
      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Date Range</h3>
        <div className="space-y-4">
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Preset
            <select
              value={filters.dateRange.preset}
              onChange={(event) =>
                setFilters((prev) => ({
                  ...prev,
                  dateRange: {
                    ...prev.dateRange,
                    preset: event.target.value as DatePreset,
                  },
                }))
              }
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {presetOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          {filters.dateRange.preset === 'custom' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-gray-600 dark:text-gray-300">
                From
                <input
                  type="date"
                  value={filters.dateRange.from ?? ''}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        from: event.target.value,
                      },
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="block text-sm text-gray-600 dark:text-gray-300">
                To
                <input
                  type="date"
                  value={filters.dateRange.to ?? ''}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      dateRange: {
                        ...prev.dateRange,
                        to: event.target.value,
                      },
                    }))
                  }
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
            </div>
          )}

          <p className="text-xs text-gray-500 dark:text-gray-400">
            Currently showing: <span className="font-medium">{formattedPresetLabel}</span>
          </p>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Transaction Types
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {transactionTypeOptions.map((type) => (
            <label
              key={type}
              className="flex items-center space-x-3 rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.transactionTypes.includes(type)}
                onChange={() => toggleTransactionType(type)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{type}</span>
            </label>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Amount Range</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Minimum Amount
            <input
              type="number"
              inputMode="decimal"
              value={filters.amountRange?.min ?? ''}
              onChange={(event) => updateAmountRange('min', event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. 100"
            />
          </label>
          <label className="block text-sm text-gray-600 dark:text-gray-300">
            Maximum Amount
            <input
              type="number"
              inputMode="decimal"
              value={filters.amountRange?.max ?? ''}
              onChange={(event) => updateAmountRange('max', event.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="e.g. 1000"
            />
          </label>
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Status & Options
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {statusOptions.map((status) => (
            <label
              key={status}
              className="flex items-center space-x-3 rounded-md border border-gray-200 dark:border-gray-700 px-4 py-2 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
            >
              <input
                type="checkbox"
                checked={filters.statuses?.includes(status) ?? false}
                onChange={() => toggleStatus(status)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{status}</span>
            </label>
          ))}
        </div>
        <label className="mt-4 flex items-center space-x-3">
          <input
            type="checkbox"
            checked={filters.includeNotes ?? false}
            onChange={(event) =>
              setFilters((prev) => ({
                ...prev,
                includeNotes: event.target.checked,
              }))
            }
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Include transaction notes
          </span>
        </label>
      </section>
    </div>
  );
}
