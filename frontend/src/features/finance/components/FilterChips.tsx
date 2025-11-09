import React from 'react';
import type { AccountFilters } from '../hooks/useAccountFilters';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { HStack } from '../../../components/ui/Layout';

interface FilterChip {
  key: keyof AccountFilters;
  label: string;
}

interface FilterChipsProps {
  chips: FilterChip[];
  onRemoveChip: (key: keyof AccountFilters) => void;
  onClearAll: () => void;
}

export const FilterChips: React.FC<FilterChipsProps> = ({ chips, onRemoveChip, onClearAll }) => {
  const { t } = useTranslation('finance');
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-2 text-blue-700 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200">
      {chips.map((chip) => (
        <HStack
          key={`${chip.key}-${chip.label}`}
          gap={2}
          className="rounded-full bg-white px-3 py-1 font-medium shadow-sm dark:bg-blue-900/60"
        >
          {t(chip.label)}
          <Button
            type="button"
            variant="link-blue"
            onClick={() => onRemoveChip(chip.key)}
            aria-label={`${t('common:actions.remove')} ${t(chip.label)}`}
          >
            ×
          </Button>
        </HStack>
      ))}
      <Button type="button" variant="link-uppercase-secondary" onClick={onClearAll}>
        {t('common:filters.clearAll')}
      </Button>
    </div>
  );
};
