import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { DateFilterMode } from '../utils/dateUtils';
import { dateFilterOptions } from '../constants/filterOptions';

interface DateFilterPanelProps {
  dateFilterMode: DateFilterMode;
  customDateRange: { start: string; end: string };
  onDateFilterModeChange: (mode: DateFilterMode) => void;
  onCustomDateRangeChange: (range: { start: string; end: string }) => void;
}

export const DateFilterPanel = ({
  dateFilterMode,
  customDateRange,
  onDateFilterModeChange,
  onCustomDateRangeChange,
}: DateFilterPanelProps) => {
  return (
    <div className="flex flex-col gap-3">
      <Select
        value={dateFilterMode}
        onChange={(value) => {
          const nextMode = (value as string) || 'this-month';
          onDateFilterModeChange(nextMode as DateFilterMode);
        }}
        options={dateFilterOptions}
        allowClear={false}
        className="h-9 text-sm"
      />
      {dateFilterMode === 'custom' && (
        <div className="flex flex-col gap-2">
          <Input
            type="date"
            value={customDateRange.start}
            onChange={(e) => onCustomDateRangeChange({ ...customDateRange, start: e.target.value })}
            className="h-9 text-sm"
            placeholder="Start date"
          />
          <Input
            type="date"
            value={customDateRange.end}
            onChange={(e) => onCustomDateRangeChange({ ...customDateRange, end: e.target.value })}
            className="h-9 text-sm"
            placeholder="End date"
          />
        </div>
      )}
    </div>
  );
};
