import { useRef, useEffect } from 'react';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { DateFilterMode } from '../utils/dateUtils';
import { HStack } from '../../../components/ui/Layout';
import { dateFilterOptions, transactionStatusOptions } from '../constants/filterOptions';

interface FilterPanelProps {
  show: boolean;
  onClose: () => void;
  buttonRef: React.RefObject<HTMLButtonElement>;
  dateFilterMode: DateFilterMode;
  customDateRange: { start: string; end: string };
  accountFilter: string;
  categoryFilter: string;
  statusFilter: string;
  accountOptions: Array<{ value: string; label: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
  onDateFilterModeChange: (mode: DateFilterMode) => void;
  onCustomDateRangeChange: (range: { start: string; end: string }) => void;
  onAccountFilterChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onClearAll: () => void;
}

export const FilterPanel = ({
  show,
  onClose,
  buttonRef,
  dateFilterMode,
  customDateRange,
  accountFilter,
  categoryFilter,
  statusFilter,
  accountOptions,
  categoryOptions,
  onDateFilterModeChange,
  onCustomDateRangeChange,
  onAccountFilterChange,
  onCategoryFilterChange,
  onStatusFilterChange,
  onClearAll,
}: FilterPanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        show &&
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        panelRef.current &&
        !panelRef.current.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [show, onClose, buttonRef]);

  if (!show) return null;

  return (
    <div
      ref={panelRef}
      id="filter-panel"
      className="absolute left-0 top-full mt-2 z-50 w-[600px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4"
    >
      <div className="flex flex-col gap-3">
        <HStack gap={3} className="flex-wrap">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 min-w-[40px]">
            Date:
          </span>
          <Select
            value={dateFilterMode}
            onChange={(value) => {
              const nextMode = (value as string) || 'this-month';
              onDateFilterModeChange(nextMode as DateFilterMode);
            }}
            options={dateFilterOptions}
            allowClear={false}
            className="h-9 text-sm min-w-[140px]"
          />
          {dateFilterMode === 'custom' && (
            <>
              <Input
                type="date"
                value={customDateRange.start}
                onChange={(e) =>
                  onCustomDateRangeChange({ ...customDateRange, start: e.target.value })
                }
                className="h-9 text-sm w-[145px]"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">to</span>
              <Input
                type="date"
                value={customDateRange.end}
                onChange={(e) =>
                  onCustomDateRangeChange({ ...customDateRange, end: e.target.value })
                }
                className="h-9 text-sm w-[145px]"
              />
            </>
          )}
        </HStack>

        <HStack gap={3} className="flex-wrap">
          <Select
            value={accountFilter}
            onChange={(value) => onAccountFilterChange(value ? String(value) : '')}
            options={accountOptions}
            className="h-9 text-sm min-w-[150px]"
          />
          <Select
            value={categoryFilter}
            onChange={(value) => onCategoryFilterChange(value ? String(value) : '')}
            options={categoryOptions}
            className="h-9 text-sm min-w-[150px]"
          />
          <Select
            value={statusFilter}
            onChange={(value) => onStatusFilterChange(value ? String(value) : '')}
            options={transactionStatusOptions}
            className="h-9 text-sm min-w-[130px]"
          />
        </HStack>

        <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClearAll} variant="ghost" size="sm" className="h-9 px-3 text-sm">
            Clear All
          </Button>
        </div>
      </div>
    </div>
  );
};
