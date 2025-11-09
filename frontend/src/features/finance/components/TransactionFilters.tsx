import { useRef, useState, useEffect, useCallback } from 'react';
import { TransactionFilterPanel } from './TransactionFilterPanel';
import { DateRangePicker } from './DateRangePicker';
import { Button } from '../../../components/ui/Button';
import { FlexBetween, HStack } from '../../../components/ui/Layout';

type DateFilterMode =
  | 'this-month'
  | 'last-month'
  | 'last-90-days'
  | 'this-year'
  | 'custom'
  | 'all-time';

interface TransactionFiltersProps {
  dateFilterMode: DateFilterMode;
  onDateFilterModeChange: (mode: DateFilterMode) => void;
  customDateRange: { start: string; end: string };
  onCustomDateRangeChange: (range: { start: string; end: string }) => void;
  accountFilter: string[];
  onAccountFilterChange: (value: string[]) => void;
  categoryFilter: string[];
  onCategoryFilterChange: (value: string[]) => void;
  statusFilter: string[];
  onStatusFilterChange: (value: string[]) => void;
  verificationFilter: string[];
  onVerificationFilterChange: (value: string[]) => void;
  accountOptions: Array<{ value: string; label: string }>;
  categoryOptions: Array<{ value: string; label: string }>;
  dateFilterDisplay: string;
  onClearAll: () => void;
  selectedCount: number;
  onBulkActionsClick: () => void;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  onUploadInvoice?: () => void;
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  dateFilterMode,
  onDateFilterModeChange,
  customDateRange,
  onCustomDateRangeChange,
  accountFilter,
  onAccountFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  verificationFilter,
  onVerificationFilterChange,
  accountOptions,
  categoryOptions,
  dateFilterDisplay,
  onClearAll,
  selectedCount,
  onBulkActionsClick,
  searchQuery = '',
  onSearchQueryChange,
  onUploadInvoice,
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const dateButtonRef = useRef<HTMLButtonElement>(null);

  // Local search state for debouncing
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  // Sync local search with prop
  useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Debounced search handler
  const handleSearchChange = useCallback(
    (value: string) => {
      setLocalSearchQuery(value);

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        if (onSearchQueryChange) {
          onSearchQueryChange(value);
        }
      }, 300); // 300ms debounce
    },
    [onSearchQueryChange]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const appliedFilterCount =
    accountFilter.filter(Boolean).length +
    categoryFilter.filter(Boolean).length +
    statusFilter.filter(Boolean).length +
    verificationFilter.filter(Boolean).length;

  return (
    <HStack className="gap-1.5 flex-wrap">
      {/* Search Input */}
      {onSearchQueryChange && (
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <svg
              className="h-3.5 w-3.5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            value={localSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search transactions..."
            className="block w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          {localSearchQuery && (
            <Button
              onClick={() => handleSearchChange('')}
              variant="input-clear"
              size="none"
              className="absolute inset-y-0 right-0 pr-2.5 flex items-center rounded-r-md"
              type="button"
            >
              <svg
                className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </Button>
          )}
        </div>
      )}

      {/* Filter Button */}
      <div className="relative">
        <Button
          ref={filterButtonRef}
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          variant={appliedFilterCount > 0 ? 'filter-active' : 'filter-default'}
          size="none"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Filter
          {appliedFilterCount > 0 && (
            <span className="ml-1 inline-flex h-4 min-w-[1.4rem] items-center justify-center rounded-full bg-primary-600 px-1 text-[10px] font-semibold text-white dark:bg-primary-500">
              {appliedFilterCount}
            </span>
          )}
        </Button>

        <TransactionFilterPanel
          isOpen={showFilterPanel}
          onClose={() => setShowFilterPanel(false)}
          accountFilter={accountFilter}
          onAccountFilterChange={onAccountFilterChange}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={onCategoryFilterChange}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          verificationFilter={verificationFilter}
          onVerificationFilterChange={onVerificationFilterChange}
          accountOptions={accountOptions}
          categoryOptions={categoryOptions}
          onClearAll={onClearAll}
        />
      </div>

      {/* Date Display Button */}
      <div className="relative">
        <Button
          ref={dateButtonRef}
          onClick={() => setShowDatePicker(!showDatePicker)}
          variant="filter-default"
          size="none"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {dateFilterDisplay}
        </Button>

        <DateRangePicker
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          dateFilterMode={dateFilterMode}
          onDateFilterModeChange={(mode) => {
            onDateFilterModeChange(mode);
            if (mode !== 'custom') setShowDatePicker(false);
          }}
          customDateRange={customDateRange}
          onCustomDateRangeChange={onCustomDateRangeChange}
          triggerRef={dateButtonRef}
        />
      </div>

      {/* Upload Invoice Button */}
      {onUploadInvoice && (
        <Button
          onClick={onUploadInvoice}
          variant="toolbar-primary"
          size="none"
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          Upload Invoice
        </Button>
      )}

      {/* Bulk Actions Button */}
      {selectedCount > 0 && (
        <Button onClick={onBulkActionsClick} variant="filter-chip">
          {selectedCount} selected
        </Button>
      )}
    </HStack>
  );
};
