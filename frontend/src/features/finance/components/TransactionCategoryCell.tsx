import React, { useMemo } from 'react';
import type { Transaction } from '../../../types';
import { SelectCell } from '../../../components/ui/NotionTable';
import { getCategoryIcon } from '../utils/categoryIcons';

interface TransactionCategoryCellProps {
  transaction: Transaction & { category?: string | number | null };
  options: Array<{ value: string; label: string; color?: string }>;
  onChange: (id: number, value: string | null) => void;
}

export const TransactionCategoryCell: React.FC<TransactionCategoryCellProps> = ({
  transaction,
  options,
  onChange,
}) => {
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === transaction.category_id);
  }, [options, transaction.category_id]);

  const icon = useMemo(() => {
    return selectedOption?.label ? getCategoryIcon(selectedOption.label) : null;
  }, [selectedOption]);

  return (
    <div className="flex h-8 items-center gap-2">
      {selectedOption && (
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-base text-gray-500 dark:text-gray-300">
          {icon}
        </span>
      )}
      <div className="flex-1">
        <SelectCell
          value={transaction.category_id}
          options={options}
          onChange={(newValue) => onChange(transaction.id, newValue || null)}
          placeholder="No category"
        />
      </div>
    </div>
  );
};
