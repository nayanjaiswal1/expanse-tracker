import { useEffect } from 'react';

import { Input } from '../../../components/ui/Input';
import { dateFilterOptions } from '../constants/filterOptions';

type DateFilterMode =
  | 'this-month'
  | 'last-month'
  | 'last-90-days'
  | 'this-year'
  | 'custom'
  | 'all-time';

interface DateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  dateFilterMode: DateFilterMode;
  onDateFilterModeChange: (mode: DateFilterMode) => void;
  customDateRange: { start: string; end: string };
  onCustomDateRangeChange: (range: { start: string; end: string }) => void;
  triggerRef: React.RefObject<HTMLButtonElement>;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  isOpen,
  onClose,
  dateFilterMode,
  onDateFilterModeChange,
  customDateRange,
  onCustomDateRangeChange,
  triggerRef,
}) => {
  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current && triggerRef.current.contains(target)) return;

      const panel = document.getElementById('date-panel');
      if (panel && !panel.contains(target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div
      id="date-panel"
      className="absolute left-0 top-full mt-1 z-50 min-w-[200px] max-w-[95vw] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1"
    >
      <div className="flex flex-col">
        {dateFilterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => onDateFilterModeChange(option.value as DateFilterMode)}
            className={`px-3 py-1.5 text-xs text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
              dateFilterMode === option.value
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {option.label}
          </button>
        ))}
        {dateFilterMode === 'custom' && (
          <div className="flex flex-col gap-2 px-3 py-2 border-t border-gray-200 dark:border-gray-700 mt-1">
            <Input
              type="date"
              value={customDateRange.start}
              onChange={(e) =>
                onCustomDateRangeChange({ ...customDateRange, start: e.target.value })
              }
              className="h-8 text-xs"
              placeholder="Start date"
            />
            <Input
              type="date"
              value={customDateRange.end}
              onChange={(e) => onCustomDateRangeChange({ ...customDateRange, end: e.target.value })}
              className="h-8 text-xs"
              placeholder="End date"
            />
          </div>
        )}
      </div>
    </div>
  );
};
