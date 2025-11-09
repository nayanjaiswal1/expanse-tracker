import React from 'react';
import { useTranslation } from 'react-i18next';

interface FilterChip {
  key: string;
  label: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemove: (key: string) => void;
  onClearAll: () => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ chips, onRemove, onClearAll }) => {
  const { t } = useTranslation('finance');

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-gray-800/50 px-4 py-3 shadow-sm">
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-1">
        {t('common:filters.active')}:
      </span>
      {chips.map((chip) => (
        <span
          key={`${chip.key}-${chip.label}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/20"
        >
          {chip.label}
          <button
            type="button"
            onClick={() => onRemove(chip.key)}
            aria-label={t('common:filters.removeChip', { label: chip.label })}
            className="ml-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors"
          >
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold leading-none">
              ×
            </span>
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline-offset-2 hover:underline transition-colors ml-1"
      >
        {t('common:filters.clearAll')}
      </button>
    </div>
  );
};
